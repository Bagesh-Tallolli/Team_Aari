/*
 * ============================================================================
 * PM POSHAN Mid-Day Meal Automated Food Dispenser Firmware
 * Target Microcontroller: ESP8266 (NodeMCU / WeMos D1 Mini)
 * 
 * Hardware Modules:
 *  - RC522 RFID Reader (Hardware SPI: SS=D8, RST=D3, SCK=D5, MOSI=D7, MISO=D6)
 *  - HX711 Load Cell Amplifier (DT=D0, SCK=D4)
 *  - SG90 Servo Motor (Signal=D1, 5V external power with common GND)
 * 
 * Real HX711 Closed-Loop Weighing & Serving Confirmation Architecture:
 *  1. RFID card detection and student authentication via /api/hardware/scan.
 *  2. Target grams retrieved from backend based on PM POSHAN standards.
 *  3. Scale tared with stability check.
 *  4. Gate opened via servo motor.
 *  5. Continuous real-time weight sampling using HX711 with cutoff lead margin.
 *  6. Safety abort on timeout, hopper jam/empty, or weight anomaly.
 *  7. Gate closed immediately and safely.
 *  8. Post-closure settling measurement for true delivered weight.
 *  9. Confirmed serving transmitted to /api/hardware/served with transaction ID.
 * ============================================================================
 */

// #include "config.h"  <-- Commented out so the new credentials below take effect

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <HX711.h>
#include <Servo.h>

// ============================================
// NEW NETWORK CONFIGURATION
// ============================================
#define WIFI_SSID     "Admin-Office"
#define WIFI_PASSWORD "Drait@1982"
#define BASE_URL      "http://192.168.144.78:5001"

// ============================================
// PIN DEFINITIONS (MATCHING HARDWARE)
// ============================================
#define SS_PIN    D8      // GPIO15
#define RST_PIN   D3      // GPIO0
#define HX711_DT  D0      // GPIO16
#define HX711_SCK D4      // GPIO2
#define SERVO_PIN D1      // GPIO5

#define SERVO_CLOSED 0
#define SERVO_OPEN   180

// ============================================
// SYSTEM CONSTANTS & TUNING PARAMETERS
// ============================================
#define CALIBRATION_FACTOR         113.5
#define WIFI_MAX_ATTEMPTS          30
#define HTTP_TIMEOUT_MS            3000
#define CARD_READ_COOLDOWN_MS      2000

#define TARE_STABILITY_SAMPLES     10
#define FLOW_READING_SAMPLES       3
#define FINAL_READING_SAMPLES      10

#define FLOW_CUTOFF_MARGIN_GRAMS   5.0
#define MIN_ACCEPTABLE_GRAMS       10.0
#define MAX_ALLOWED_GRAMS          500.0

#define MAX_DISPENSE_TIMEOUT_MS    15000
#define STALL_CHECK_INTERVAL_MS    2000
#define STALL_MIN_INCREASE_GRAMS   2.0
#define STABILIZATION_DELAY_MS     1000

// ============================================
// OBJECT INSTANCES
// ============================================
MFRC522 rfid(SS_PIN, RST_PIN);
HX711 scale;
Servo servoMotor;
WiFiClient wifiClient;

// ============================================
// SYSTEM STATE
// ============================================
bool scaleInitialized = false;
bool promptDisplayed  = false;

// ============================================
// FUNCTION DECLARATIONS
// ============================================
void   connectToWiFi();
void   setServoPosition(int angle);
bool   tareScaleWithCheck();
String requestScan(String uid);
bool   sendServedData(int id, String name, String food, float grams, String status, String txnId);
void   notifyHardwareState(String state, String details = "");
void   serveFood(int studentId, String name, String foodItem, float targetGrams, String txnId);
void   processCard();

// ============================================
// WIFI CONNECTION MANAGEMENT
// ============================================
void connectToWiFi() {
  Serial.println(F("--------------------------------"));
  Serial.print(F("Connecting to WiFi: "));
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < WIFI_MAX_ATTEMPTS) {
    delay(500);
    Serial.print(F("."));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print(F("WiFi Connected! IP: "));
    Serial.println(WiFi.localIP());
  } else {
    Serial.println(F("\nWiFi connection failed! Continuing in offline/retry mode..."));
  }
  Serial.println(F("--------------------------------"));
}

// ============================================
// SERVO CONTROL (ANTI-JITTER PWM MANAGEMENT)
// ============================================
void setServoPosition(int angle) {
  if (angle < 0)   angle = 0;
  if (angle > 180) angle = 180;

  Serial.print(F("  [Servo] Rotating to: "));
  Serial.print(angle);
  Serial.println(F(" deg"));

  if (!servoMotor.attached()) {
    servoMotor.attach(SERVO_PIN);
    delay(50);
  }

  servoMotor.write(angle);
  delay(600);           // Time for physical servo horn sweep
  servoMotor.detach();  // Eliminate jitter and idle current draw
  delay(50);
}

// ============================================
// SCALE TARE WITH STABILITY VERIFICATION
// ============================================
bool tareScaleWithCheck() {
  if (!scale.is_ready()) {
    Serial.println(F("  [HX711] Scale not ready for tare"));
    return false;
  }

  scale.tare(TARE_STABILITY_SAMPLES);
  delay(200);

  float zeroCheck = scale.get_units(3);
  Serial.print(F("  [HX711] Tare complete. Baseline reading: "));
  Serial.print(zeroCheck, 2);
  Serial.println(F("g"));

  if (abs(zeroCheck) > 5.0f) {
    Serial.println(F("  [HX711] Baseline drift detected, retrying tare..."));
    scale.tare(TARE_STABILITY_SAMPLES);
    delay(200);
  }
  return true;
}

// ============================================
// HARDWARE STATUS NOTIFICATION
// ============================================
void notifyHardwareState(String state, String details) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(wifiClient, String(BASE_URL) + "/api/hardware/status");
  http.setTimeout(2000);
  http.addHeader(F("Content-Type"), F("application/json"));

  StaticJsonDocument<192> doc;
  doc["state"]   = state;
  doc["details"] = details;
  doc["uptime"]  = millis();

  String payload;
  serializeJson(doc, payload);
  http.POST(payload);
  http.end();
}

// ============================================
// RFID SCAN REQUEST TO BACKEND
// ============================================
String requestScan(String uid) {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
    if (WiFi.status() != WL_CONNECTED) {
      return "{\"error\":\"WiFi offline\"}";
    }
  }

  HTTPClient http;
  String response = "";

  http.begin(wifiClient, String(BASE_URL) + "/api/hardware/scan");
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader(F("Content-Type"), F("application/json"));

  StaticJsonDocument<128> reqDoc;
  reqDoc["uid"] = uid;

  String payload;
  serializeJson(reqDoc, payload);

  Serial.print(F("[Scan] Sending UID to backend: "));
  Serial.println(uid);

  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    if (httpCode == HTTP_CODE_OK) {
      response = http.getString();
      Serial.println(F("[Scan] Student identified successfully"));
    } else {
      String errBody = http.getString();
      Serial.print(F("[Scan] HTTP error: "));
      Serial.println(httpCode);
      response = errBody.length() > 0 ? errBody : "{\"error\":\"HTTP " + String(httpCode) + "\"}";
    }
  } else {
    Serial.print(F("[Scan] Connection failed: "));
    Serial.println(http.errorToString(httpCode));
    response = "{\"error\":\"Connection Failed\"}";
  }

  http.end();
  return response;
}

// ============================================
// CONFIRMED SERVING RECORD TRANSMISSION
// ============================================
bool sendServedData(int id, String name, String food, float grams, String status, String txnId) {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
    if (WiFi.status() != WL_CONNECTED) return false;
  }

  bool success = false;
  int retryCount = 0;
  const int maxRetries = 3;

  while (!success && retryCount < maxRetries) {
    HTTPClient http;
    http.begin(wifiClient, String(BASE_URL) + "/api/hardware/served");
    http.setTimeout(HTTP_TIMEOUT_MS);
    http.addHeader(F("Content-Type"), F("application/json"));

    StaticJsonDocument<384> doc;
    doc["studentId"]   = id;
    doc["name"]        = name;
    doc["foodItem"]    = food;
    doc["gramsServed"] = grams;
    doc["status"]      = status;
    if (txnId.length() > 0) {
      doc["txn_id"] = txnId;
    }

    String payload;
    serializeJson(doc, payload);

    Serial.print(F("[Served] Transmitting confirmed record: "));
    Serial.println(payload);

    int httpCode = http.POST(payload);

    if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
      String resp = http.getString();
      StaticJsonDocument<256> rd;
      DeserializationError err = deserializeJson(rd, resp);
      if (!err && rd["success"].as<bool>()) {
        success = true;
        Serial.println(F("[Served] Confirmed by backend database!"));
      }
    } else {
      Serial.print(F("[Served] Failed to post record, HTTP code: "));
      Serial.println(httpCode);
      retryCount++;
      if (retryCount < maxRetries) {
        Serial.println(F("[Served] Retrying in 1 second..."));
        delay(1000);
      }
    }
    http.end();
  }

  return success;
}

// ============================================
// REAL CLOSED-LOOP FOOD DISPENSING
// ============================================
void serveFood(int sId, String sName, String food, float targetGrams, String txnId) {
  Serial.println(F("========================================"));
  Serial.print(F("DISPENSING SESSION: "));
  Serial.println(sName);
  Serial.print(F("Food Item: "));
  Serial.println(food);
  Serial.print(F("Target Portion: "));
  Serial.print(targetGrams, 1);
  Serial.println(F(" g"));
  Serial.println(F("========================================"));

  // Step 1: Pre-dispensing HX711 readiness and tare check
  if (!scale.is_ready()) {
    Serial.println(F("❌ ERROR: HX711 Load Cell disconnected! Dispensing aborted for safety."));
    setServoPosition(SERVO_CLOSED);
    notifyHardwareState("error", "HX711 Disconnected");
    return;
  }

  Serial.println(F("[Dispenser] Taring load cell..."));
  tareScaleWithCheck();

  // Step 2: Open dispenser gate
  Serial.println(F("[Dispenser] Opening dispenser gate..."));
  notifyHardwareState("dispensing", "Gate Open");
  setServoPosition(SERVO_OPEN);

  // Effective cutoff target accounting for falling grains
  float effectiveCutoff = targetGrams - FLOW_CUTOFF_MARGIN_GRAMS;
  if (effectiveCutoff < 5.0f) effectiveCutoff = targetGrams * 0.9f;

  unsigned long startTime       = millis();
  unsigned long lastStallCheck  = millis();
  float         lastStallWeight = 0.0f;
  float         currentWeight   = 0.0f;
  String        completionStatus = "Served";
  bool          gateClosedEarly  = false;

  // Step 3: Real continuous measurement loop
  while (true) {
    // Continuous sampling using HX711 load cell
    if (scale.is_ready()) {
      currentWeight = scale.get_units(FLOW_READING_SAMPLES);
      if (currentWeight < 0.0f) currentWeight = 0.0f; // Discard negative sensor noise
    }

    Serial.print(F("  [HX711 Live] Weight: "));
    Serial.print(currentWeight, 1);
    Serial.print(F("g / Target: "));
    Serial.print(targetGrams, 1);
    Serial.println(F("g"));

    // Condition A: Target reached
    if (currentWeight >= effectiveCutoff) {
      Serial.println(F("✅ [Dispenser] Target threshold reached!"));
      completionStatus = "Served";
      break;
    }

    // Condition B: Maximum dispensing timeout exceeded
    if (millis() - startTime > MAX_DISPENSE_TIMEOUT_MS) {
      Serial.println(F("⚠️ [Dispenser] Dispense timeout reached (15s)! Stopping for safety."));
      completionStatus = (currentWeight >= MIN_ACCEPTABLE_GRAMS) ? "Partial_Timeout" : "Aborted_Timeout";
      gateClosedEarly = true;
      break;
    }

    // Condition C: Hopper stall / empty detection
    if (millis() - lastStallCheck > STALL_CHECK_INTERVAL_MS) {
      float weightDelta = currentWeight - lastStallWeight;
      if (weightDelta < STALL_MIN_INCREASE_GRAMS) {
        Serial.println(F("⚠️ [Dispenser] Flow stall detected! Food hopper may be empty or jammed."));
        completionStatus = (currentWeight >= MIN_ACCEPTABLE_GRAMS) ? "Partial_HopperStall" : "Aborted_HopperEmpty";
        gateClosedEarly = true;
        break;
      }
      lastStallWeight = currentWeight;
      lastStallCheck  = millis();
    }

    // Condition D: Anomaly hard cap exceeded
    if (currentWeight > MAX_ALLOWED_GRAMS) {
      Serial.println(F("❌ [Dispenser] Overfill safety cap exceeded! Emergency stop."));
      completionStatus = "Aborted_Overflow";
      gateClosedEarly = true;
      break;
    }

    // Brief delay to allow ESP8266 WiFi background stack processing
    delay(50);
  }

  // Step 4: GUARANTEED SAFE GATE CLOSURE
  Serial.println(F("[Dispenser] Closing dispenser gate..."));
  setServoPosition(SERVO_CLOSED);

  // Step 5: Post-closure stabilization delay
  delay(STABILIZATION_DELAY_MS);

  // Step 6: High-precision final weight measurement
  float finalDeliveredGrams = 0.0f;
  if (scale.is_ready()) {
    finalDeliveredGrams = scale.get_units(FINAL_READING_SAMPLES);
    if (finalDeliveredGrams < 0.0f) finalDeliveredGrams = 0.0f;
  } else {
    finalDeliveredGrams = currentWeight;
  }

  unsigned long totalDurationMs = millis() - startTime;
  Serial.println(F("========================================"));
  Serial.print(F("DISPENSING SUMMARY: "));
  Serial.println(completionStatus);
  Serial.print(F("Actual Measured Weight: "));
  Serial.print(finalDeliveredGrams, 1);
  Serial.println(F(" g"));
  Serial.print(F("Target Was: "));
  Serial.print(targetGrams, 1);
  Serial.println(F(" g"));
  Serial.print(F("Time Elapsed: "));
  Serial.print(totalDurationMs);
  Serial.println(F(" ms"));
  Serial.println(F("========================================"));

  // Step 7: Transmit confirmed serving to backend
  if (finalDeliveredGrams >= MIN_ACCEPTABLE_GRAMS) {
    bool posted = sendServedData(sId, sName, food, finalDeliveredGrams, completionStatus, txnId);
    Serial.println(posted ? F("Backend record confirmed and logged.") : F("❌ FAILED to persist to backend database."));
  } else {
    Serial.println(F("⚠️ Serving weight below minimum acceptable threshold; no food log created."));
    notifyHardwareState("error", "Insufficient Food Dispensed");
  }

  promptDisplayed = false;
  delay(CARD_READ_COOLDOWN_MS);
}

// ============================================
// RFID CARD PROCESSING
// ============================================
void processCard() {
  String uidString = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    char b[4];
    sprintf(b, "%02X", rfid.uid.uidByte[i]);
    uidString += String(b);
    if (i < rfid.uid.size - 1) uidString += " ";
  }

  Serial.println(F("--------------------------------"));
  Serial.print(F("Card Scanned: UID ["));
  Serial.print(uidString);
  Serial.println(F("]"));

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  // Step 1: Scan student against backend
  String response = requestScan(uidString);

  StaticJsonDocument<384> doc;
  DeserializationError err = deserializeJson(doc, response);
  if (err) {
    Serial.println(F("❌ Backend returned invalid JSON response"));
    promptDisplayed = false;
    return;
  }

  if (doc.containsKey("error") || (doc.containsKey("success") && !doc["success"].as<bool>())) {
    String msg = doc.containsKey("message") ? doc["message"].as<String>() : doc["error"].as<String>();
    Serial.print(F("❌ Scan rejected: "));
    Serial.println(msg);
    promptDisplayed = false;
    return;
  }

  if (doc.containsKey("studentId") && doc.containsKey("name") && doc.containsKey("targetGrams")) {
    int    sId         = doc["studentId"].as<int>();
    String sName       = doc["name"].as<String>();
    float  targetGrams = doc["targetGrams"].as<float>();
    String foodItem    = doc.containsKey("foodItem") ? doc["foodItem"].as<String>() : "Cooked Rice";
    String txnId       = doc.containsKey("txn_id") ? doc["txn_id"].as<String>() : "";

    Serial.print(F("Authenticated Student: "));
    Serial.println(sName);
    Serial.print(F("Government Portion Target: "));
    Serial.print(targetGrams, 0);
    Serial.println(F("g"));

    // Step 2: Proceed to closed-loop dispensing
    serveFood(sId, sName, foodItem, targetGrams, txnId);
  } else {
    Serial.println(F("❌ Scan response missing required fields (studentId, name, targetGrams)"));
    promptDisplayed = false;
  }
}

// ============================================
// ARDUINO SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println(F("========================================"));
  Serial.println(F(" PM POSHAN IoT Automated Dispenser"));
  Serial.println(F(" System Initializing..."));
  Serial.println(F("========================================"));

  // 1. Initialize RC522 RFID (Hardware SPI)
  SPI.begin();
  delay(50);
  rfid.PCD_Init();
  delay(50);

  byte rfidVersion = rfid.PCD_ReadRegister(MFRC522::VersionReg);
  Serial.print(F("RC522 Firmware Version: 0x"));
  Serial.println(rfidVersion, HEX);
  if (rfidVersion == 0x00 || rfidVersion == 0xFF) {
    Serial.println(F("⚠️ WARNING: RC522 not responding. Check SPI wiring (D8/D3/D5/D6/D7)."));
  } else {
    Serial.println(F("✓ RC522 RFID Reader initialized"));
  }

  // 2. Initialize HX711 Load Cell
  Serial.print(F("Initializing HX711 Load Cell (DT=D0, SCK=D4)..."));
  scale.begin(HX711_DT, HX711_SCK);

  int tries = 0;
  while (!scale.is_ready() && tries < 15) {
    delay(200);
    Serial.print(F("."));
    tries++;
  }
  Serial.println();

  if (scale.is_ready()) {
    scale.set_scale(CALIBRATION_FACTOR);
    scale.tare(TARE_STABILITY_SAMPLES);
    scaleInitialized = true;
    Serial.print(F("✓ HX711 ready. Calibration Factor: "));
    Serial.println(CALIBRATION_FACTOR, 1);
  } else {
    scaleInitialized = false;
    Serial.println(F("⚠️ WARNING: HX711 not responding! Check DT/SCK wiring and 3.3V power."));
  }

  // 3. Initialize Dispenser Servo (Park at closed position and detach)
  Serial.println(F("Parking Dispenser Servo at Closed Position (0 deg)..."));
  servoMotor.attach(SERVO_PIN);
  delay(100);
  servoMotor.write(SERVO_CLOSED);
  delay(800);
  servoMotor.detach();
  Serial.println(F("✓ Servo parked at CLOSED and PWM detached (no jitter)"));

  // 4. Connect to Wi-Fi
  connectToWiFi();

  Serial.println(F("========================================"));
  Serial.println(F(" SYSTEM READY — WAITING FOR RFID CARD"));
  Serial.println(F("========================================"));
}

// ============================================
// MAIN LOOP
// ============================================
void loop() {
  // Wi-Fi connection watchdog
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastWifiRetry = 0;
    if (millis() - lastWifiRetry > 10000) {
      Serial.println(F("[Watchdog] WiFi disconnected, attempting reconnection..."));
      connectToWiFi();
      lastWifiRetry = millis();
    }
  }

  // Display waiting banner once when idle
  if (!promptDisplayed) {
    Serial.println(F("Ready: Place RFID card near the scanner..."));
    promptDisplayed = true;
  }

  // Check for new RFID card
  if (!rfid.PICC_IsNewCardPresent()) {
    delay(40);
    return;
  }
  if (!rfid.PICC_ReadCardSerial()) {
    delay(40);
    return;
  }

  // Process card
  processCard();
}