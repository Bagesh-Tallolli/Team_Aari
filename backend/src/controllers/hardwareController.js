import crypto from 'crypto';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { HTTP_STATUS, successResponse } from '../utils/httpStatus.js';
import { query } from '../config/db.js';
import foodLogModel from '../models/foodLogModel.js';
import { getRiceGrams, getStudentNutritionBenchmarks } from '../services/servingRuleService.js';
import { calculateServedNutrients } from '../config/nutritionStandards.js';
import logger from '../utils/logger.js';

// Idempotency and transaction tracking stores
const processedTransactions = new Map(); // txn_id -> responseData
const activeTransactions = new Map();    // txn_id -> sessionData

// Track physical hardware heartbeat
let lastHardwareHeartbeat = 0;

// In-memory status for the frontend live panel
let hardwareState = {
  isSimulation: true,
  physicalConnected: false,
  espConnected: false,
  statusLabel: 'Simulation Mode',
  rfidReady: true,
  loadCellReady: true,
  servoReady: true,
  waitingForStudent: true,
  currentState: 'waiting_for_student', // 'waiting_for_student' | 'student_identified' | 'dispensing' | 'serving_confirmed' | 'error'
  lastScanData: null,
  lastServing: null,
  lastError: null,
  lastUpdated: new Date().toISOString(),
};

/**
 * Periodic cleanup of stale transaction entries (1 hour retention)
 */
setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  for (const [txnId, data] of processedTransactions.entries()) {
    if (data._timestamp && data._timestamp < oneHourAgo) {
      processedTransactions.delete(txnId);
    }
  }
  for (const [txnId, data] of activeTransactions.entries()) {
    if (data._timestamp && data._timestamp < oneHourAgo) {
      activeTransactions.delete(txnId);
    }
  }
}, 600000);

/**
 * Hardware Controller
 * Handles communication with ESP8266 IoT dispenser module and HX711 load cell
 */

/**
 * POST /api/hardware/scan
 * Handles RFID scan event. Authenticates student and returns target portion.
 * NOTE: Scanning alone NEVER logs a serving in the database.
 */
export const handleScan = asyncHandler(async (req, res) => {
  const { uid } = req.body;
  if (!uid) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'RFID UID required' });
  }

  const cleanUid = uid.trim();
  const compactUid = cleanUid.replace(/\s+/g, '');

  const result = await query(
    `SELECT * FROM students 
     WHERE rfid_card_id = $1 
        OR REPLACE(rfid_card_id, ' ', '') = $2 
        OR UPPER(REPLACE(rfid_card_id, ' ', '')) = UPPER($2)`,
    [cleanUid, compactUid]
  );

  if (result.rows.length === 0) {
    hardwareState.currentState = 'error';
    hardwareState.lastError = `Student not found for RFID ${cleanUid}`;
    hardwareState.waitingForStudent = true;
    logger.warn(`Hardware scan: student not found for UID ${cleanUid}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Student not found' });
  }

  const student = result.rows[0];

  // Calculate grain serving based on PM POSHAN grade standard
  const recommendedGrams = getRiceGrams(student.age);
  const nutrition = calculateServedNutrients('rice', recommendedGrams);
  const benchmarks = getStudentNutritionBenchmarks(student);

  // Generate unique transaction token for traceability & idempotency
  const txnId = `txn_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

  const scanData = {
    success: true,
    txn_id: txnId,
    studentId: student.id,
    name: student.name,
    age: student.age,
    gender: student.gender,
    targetGrams: recommendedGrams,
    calories: nutrition.calories,
    protein: nutrition.protein,
    foodItem: 'Cooked Rice',
    // Separated official reference benchmarks
    school_meal_target: benchmarks.school_meal_target,
    full_day_requirement: benchmarks.full_day_requirement,
    timestamp: new Date().toISOString(),
  };

  // Record active transaction in memory
  activeTransactions.set(txnId, {
    studentId: student.id,
    studentName: student.name,
    targetGrams: recommendedGrams,
    foodItem: 'Cooked Rice',
    _timestamp: Date.now(),
  });

  // Update hardware live panel state (Do not create food log record during scan)
  hardwareState.waitingForStudent = false;
  hardwareState.currentState = 'student_identified';
  hardwareState.lastScanData = {
    ...scanData,
    grams: recommendedGrams,
  };
  hardwareState.lastUpdated = new Date().toISOString();

  logger.info(`Hardware scan successful for ${student.name} (Age: ${student.age}): target ${recommendedGrams}g rice, txn_id: ${txnId}`);

  res.status(HTTP_STATUS.OK).json(scanData);
});

/**
 * POST /api/hardware/served
 * Receives the final confirmed weight from the HX711 load cell after the dispenser gate has closed.
 * Calculates nutrients server-side using Phase 1 standards and persists the serving log to PostgreSQL.
 */
export const handleServed = asyncHandler(async (req, res) => {
  const { studentId, name, foodItem = 'Cooked Rice', gramsServed, status = 'Served', txn_id } = req.body;

  if (!studentId || gramsServed === undefined || gramsServed === null) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Invalid data: studentId and gramsServed are required',
    });
  }

  const actualGrams = parseFloat(gramsServed);
  if (isNaN(actualGrams) || actualGrams <= 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Invalid gramsServed: measured weight must be greater than 0g',
    });
  }

  if (actualGrams > 500) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Invalid gramsServed: measured weight exceeds maximum allowable portion (500g)',
    });
  }

  // Idempotency check: if transaction was already processed, return existing confirmation
  if (txn_id && processedTransactions.has(txn_id)) {
    const existing = processedTransactions.get(txn_id);
    logger.warn(`Hardware served: Idempotent duplicate request received for txn_id ${txn_id}`);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Confirmed food serving log already processed (idempotent)',
      data: existing,
    });
  }

  // Calculate nutrient values strictly on backend from actual measured weight
  // NEVER trust client-provided calories or protein calculations
  const nutrients = calculateServedNutrients(foodItem, actualGrams);

  // Insert into food_logs table with verified nutrient values
  const savedLog = await foodLogModel.createFoodLog(studentId, {
    food_item: foodItem,
    served_grams: actualGrams,
    estimated_calories: nutrients.calories,
    protein: nutrients.protein,
    carbs: nutrients.carbs,
    fats: nutrients.fats,
  });

  const responseData = {
    log_id: savedLog?.id,
    student_id: studentId,
    student_name: name || 'Student',
    food_item: foodItem,
    actual_grams_served: actualGrams,
    calories_served: nutrients.calories,
    protein_served: nutrients.protein,
    carbs_served: nutrients.carbs,
    fats_served: nutrients.fats,
    status: status,
    txn_id: txn_id || null,
    is_confirmed_served: true,
    is_confirmed_consumed: false, // Served at school; plate waste not yet assessed
    timestamp: new Date().toISOString(),
    _timestamp: Date.now(),
  };

  if (txn_id) {
    processedTransactions.set(txn_id, responseData);
    activeTransactions.delete(txn_id);
  }

  // Update hardware live panel state
  hardwareState.waitingForStudent = true;
  hardwareState.currentState = 'serving_confirmed';
  hardwareState.lastServing = responseData;
  hardwareState.lastUpdated = new Date().toISOString();

  logger.info(`Hardware served log saved: student ${studentId}, actual ${actualGrams}g (${nutrients.calories} kcal, ${nutrients.protein}g protein) [txn: ${txn_id || 'none'}]`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Confirmed food serving log saved successfully',
    data: responseData,
  });
});

/**
 * POST /api/hardware/status
 * Updates hardware live panel state (e.g., dispensing, gate open, error)
 */
export const updateStatus = asyncHandler(async (req, res) => {
  const { state, details, error } = req.body;

  if (state) {
    hardwareState.currentState = state;
    if (state === 'error') {
      hardwareState.lastError = error || details || 'Hardware error reported';
    } else if (state === 'dispensing') {
      hardwareState.waitingForStudent = false;
    } else if (state === 'idle' || state === 'waiting_for_student') {
      hardwareState.waitingForStudent = true;
    }
  }

  if (details) {
    hardwareState.lastDetails = details;
  }

  hardwareState.lastUpdated = new Date().toISOString();

  res.status(HTTP_STATUS.OK).json(successResponse(hardwareState, 'Hardware status updated'));
});

/**
 * GET /api/hardware/status
 * Returns current status of IoT hardware dispenser
 */
export const getStatus = asyncHandler(async (req, res) => {
  const isPhysicalOnline = (Date.now() - lastHardwareHeartbeat) < 15000 && lastHardwareHeartbeat > 0;
  const statusData = {
    ...hardwareState,
    physicalConnected: isPhysicalOnline,
    espConnected: isPhysicalOnline,
    statusLabel: isPhysicalOnline ? 'Connected' : 'Simulation Mode',
    isSimulation: !isPhysicalOnline,
  };
  res.status(HTTP_STATUS.OK).json(successResponse(statusData, 'Hardware status'));
});

/**
 * GET /api/hardware/recent
 * Returns the most recent confirmed food servings from the database
 */
export const getRecentDistributions = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT fl.*, s.name as student_name 
     FROM food_logs fl
     JOIN students s ON fl.student_id = s.id
     ORDER BY fl.logged_at DESC
     LIMIT 15`
  );

  const formatted = result.rows.map((log) => {
    const d = new Date(log.logged_at);
    return {
      id: log.id,
      student_id: log.student_id,
      student_name: log.student_name,
      food_item: log.food_item,
      grams_served: parseFloat(log.served_grams || 0),
      calories_served: parseFloat(log.estimated_calories || 0),
      protein_served: parseFloat(log.protein || 0),
      distribution_date: d.toLocaleDateString('en-GB'),
      distribution_time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Served',
      is_confirmed_served: true,
      is_confirmed_consumed: false,
    };
  });

  res.status(HTTP_STATUS.OK).json(successResponse(formatted, 'Recent distributions'));
});

export default {
  handleScan,
  handleServed,
  updateStatus,
  getStatus,
  getRecentDistributions,
};
