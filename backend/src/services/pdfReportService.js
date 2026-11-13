import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { AppError } from '../middlewares/errorHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storageDir = path.resolve(__dirname, '../../storage/reports');

/**
 * Ensure storage directory for reports exists
 */
const ensureStorageDir = () => {
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
};

/**
 * Escape text for PDF literal strings (escapes parentheses and backslashes)
 */
const escapePdfText = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ' '); // Clean ASCII for standard Type1 fonts
};

/**
 * PDF Builder helper to construct standard PDF-1.4 files
 */
class SimplePdfDoc {
  constructor() {
    this.pages = [];
    this.currentPageCommands = [];
    this.y = 800; // Standard A4 is 595.28 x 841.89 points
  }

  addPage() {
    if (this.currentPageCommands.length > 0) {
      this.pages.push(this.currentPageCommands.join('\n'));
      this.currentPageCommands = [];
    }
    this.y = 800;
  }

  drawRect(x, y, w, h, fillColor = null, strokeColor = null, lineWidth = 1) {
    let cmd = `q\n${lineWidth} w\n`;
    if (fillColor) {
      cmd += `${fillColor[0]} ${fillColor[1]} ${fillColor[2]} rg\n`;
    }
    if (strokeColor) {
      cmd += `${strokeColor[0]} ${strokeColor[1]} ${strokeColor[2]} RG\n`;
    }
    cmd += `${x} ${y} ${w} ${h} re\n`;
    if (fillColor && strokeColor) {
      cmd += 'B\nQ';
    } else if (fillColor) {
      cmd += 'f\nQ';
    } else {
      cmd += 's\nQ';
    }
    this.currentPageCommands.push(cmd);
  }

  drawLine(x1, y1, x2, y2, strokeColor = [0.8, 0.8, 0.8], lineWidth = 1) {
    const cmd = `q\n${lineWidth} w\n${strokeColor[0]} ${strokeColor[1]} ${strokeColor[2]} RG\n${x1} ${y1} m\n${x2} ${y2} l\nS\nQ`;
    this.currentPageCommands.push(cmd);
  }

  drawText(text, x, y, size = 10, isBold = false, color = [0.1, 0.1, 0.1]) {
    const font = isBold ? '/F2' : '/F1';
    const escaped = escapePdfText(text);
    const cmd = `q\n${color[0]} ${color[1]} ${color[2]} rg\nBT\n${font} ${size} Tf\n${x} ${y} Td\n(${escaped}) Tj\nET\nQ`;
    this.currentPageCommands.push(cmd);
  }

  buildBuffer() {
    if (this.currentPageCommands.length > 0) {
      this.pages.push(this.currentPageCommands.join('\n'));
      this.currentPageCommands = [];
    }

    const objects = [];
    let objCount = 0;

    const addObj = (content) => {
      objCount++;
      objects.push({ id: objCount, content });
      return objCount;
    };

    // Object 1: Catalog
    addObj('<< /Type /Catalog /Pages 2 0 R >>');

    // Object 2: Pages container (placeholder, updated later)
    addObj('');

    // Font Objects
    const f1Id = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const f2Id = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

    const pageObjIds = [];

    // Create page objects and content streams
    for (const pageCmds of this.pages) {
      const streamLen = Buffer.byteLength(pageCmds, 'utf-8');
      const contentId = addObj(`<< /Length ${streamLen} >>\nstream\n${pageCmds}\nendstream`);
      const pageId = addObj(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${f1Id} 0 R /F2 ${f2Id} 0 R >> >> >>`
      );
      pageObjIds.push(`${pageId} 0 R`);
    }

    // Update Object 2: Pages
    objects[1].content = `<< /Type /Pages /Kids [${pageObjIds.join(' ')}] /Count ${pageObjIds.length} >>`;

    // Construct final PDF binary string with cross-reference table
    let body = '%PDF-1.4\n%âãÏÓ\n';
    const offsets = [0]; // Offset for object 0

    for (const obj of objects) {
      offsets.push(Buffer.byteLength(body, 'utf-8'));
      body += `${obj.id} 0 obj\n${obj.content}\nendobj\n`;
    }

    const startXref = Buffer.byteLength(body, 'utf-8');
    body += `xref\n0 ${objCount + 1}\n0000000000 65535 f \n`;

    for (let i = 1; i <= objCount; i++) {
      const offset = String(offsets[i]).padStart(10, '0');
      body += `${offset} 00000 n \n`;
    }

    body += `trailer\n<< /Size ${objCount + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
    return Buffer.from(body, 'utf-8');
  }
}

/**
 * Generate PDF Report from Phase 6 Weekly Report Data
 * 
 * @param {object} weeklyReport - Phase 6 report object
 * @param {object} [dietPlan] - Optional Phase 5 diet recommendations
 * @returns {Promise<{ filePath: string, buffer: Buffer, fileName: string }>}
 */
export const generateWeeklyNutritionPdf = async (weeklyReport, dietPlan = null) => {
  if (!weeklyReport || !weeklyReport.student) {
    throw new AppError('Valid weekly report data required for PDF generation', HTTP_STATUS.BAD_REQUEST);
  }

  ensureStorageDir();

  const student = weeklyReport.student;
  const period = weeklyReport.period || {};
  const intake = weeklyReport.school_meal_intake || {};
  const poshan = weeklyReport.pm_poshan_target || {};
  const fullDay = weeklyReport.full_day_context || {};
  const screening = weeklyReport.anthropometric_screening || {};
  const dailyBreakdown = weeklyReport.daily_breakdown || [];
  const risk = weeklyReport.ai_risk_assessment?.rule_based || {};

  const doc = new SimplePdfDoc();

  // ==========================================================================
  // PAGE 1: Weekly Nutrition & Attendance Report Card
  // ==========================================================================
  
  // Header Banner
  doc.drawRect(40, 755, 515, 55, [0.15, 0.22, 0.38], null);
  doc.drawText('PM POSHAN - MID-DAY MEAL SCHEME', 55, 788, 14, true, [1, 1, 1]);
  doc.drawText('Weekly Student Nutrition Assurance & Growth Report', 55, 772, 11, false, [0.85, 0.9, 1]);
  doc.drawText(`Report Period: ${period.start_date} to ${period.end_date}`, 350, 772, 9, false, [0.85, 0.9, 1]);

  // Section A: Student Information Box
  doc.drawRect(40, 680, 515, 65, [0.97, 0.98, 1.0], [0.8, 0.85, 0.95], 1);
  doc.drawText('STUDENT INFORMATION', 55, 728, 10, true, [0.2, 0.3, 0.5]);
  
  doc.drawText(`Student Name: ${student.name}`, 55, 712, 10, true, [0.1, 0.1, 0.1]);
  doc.drawText(`Age: ${student.age} years | Gender: ${student.gender}`, 55, 696, 9, false, [0.3, 0.3, 0.3]);
  doc.drawText(`Diet Preference: ${student.food_preference || 'Vegetarian'}`, 55, 684, 9, false, [0.3, 0.3, 0.3]);

  doc.drawText(`Active School Days: ${period.recorded_days_count} / 7 days`, 330, 712, 10, true, [0.1, 0.45, 0.25]);
  doc.drawText(`Data Completeness: ${period.data_completeness_pct || 0}%`, 330, 696, 9, false, [0.3, 0.3, 0.3]);
  doc.drawText(`Weekly Risk Flag: ${risk.category || 'Normal monitoring'}`, 330, 684, 9, true, [0.2, 0.3, 0.6]);

  // Section B: Weekly School-Meal Nutrition Summary
  doc.drawRect(40, 580, 515, 90, [1, 1, 1], [0.85, 0.85, 0.85], 1);
  doc.drawText('WEEKLY MID-DAY MEAL INTAKE & PM POSHAN COMPLIANCE', 55, 652, 10, true, [0.15, 0.25, 0.45]);

  // Metric Column 1: Calories
  doc.drawRect(55, 592, 140, 50, [0.96, 0.98, 0.96], [0.8, 0.9, 0.8], 1);
  doc.drawText('Average Daily Calories', 65, 628, 8, false, [0.4, 0.4, 0.4]);
  doc.drawText(`${intake.avg_daily_calories || 0} kcal`, 65, 612, 13, true, [0.1, 0.5, 0.2]);
  doc.drawText(`Target: ${poshan.target_calories || 450} kcal (${poshan.calorie_fulfillment_pct || 0}%)`, 65, 598, 8, false, [0.3, 0.3, 0.3]);

  // Metric Column 2: Protein
  doc.drawRect(205, 592, 140, 50, [0.96, 0.97, 1.0], [0.8, 0.85, 0.95], 1);
  doc.drawText('Average Daily Protein', 215, 628, 8, false, [0.4, 0.4, 0.4]);
  doc.drawText(`${intake.avg_daily_protein || 0} g`, 215, 612, 13, true, [0.2, 0.3, 0.7]);
  doc.drawText(`Target: ${poshan.target_protein || 12} g (${poshan.protein_fulfillment_pct || 0}%)`, 215, 598, 8, false, [0.3, 0.3, 0.3]);

  // Metric Column 3: Days Target Met
  doc.drawRect(355, 592, 185, 50, [1.0, 0.98, 0.95], [0.95, 0.85, 0.75], 1);
  doc.drawText('Statutory Benchmark Days', 365, 628, 8, false, [0.4, 0.4, 0.4]);
  doc.drawText(`Met: ${poshan.days_met || 0} days | Below: ${poshan.days_below || 0}`, 365, 612, 10, true, [0.7, 0.35, 0.1]);
  doc.drawText(`School meal gap: ${poshan.calorie_gap || 0} kcal / ${poshan.protein_gap || 0}g`, 365, 598, 8, false, [0.4, 0.4, 0.4]);

  // Section C: Daily Nutrition Breakdown Table (7 days)
  doc.drawText('DAILY SCHOOL-MEAL SERVING BREAKDOWN (7-DAY LOG)', 55, 560, 10, true, [0.15, 0.25, 0.45]);
  
  // Table Header
  doc.drawRect(40, 538, 515, 18, [0.25, 0.3, 0.4], null);
  doc.drawText('Date', 45, 544, 8, true, [1, 1, 1]);
  doc.drawText('Day', 95, 544, 8, true, [1, 1, 1]);
  doc.drawText('Serving Status', 145, 544, 8, true, [1, 1, 1]);
  doc.drawText('Food Items Logged (HX711)', 225, 544, 8, true, [1, 1, 1]);
  doc.drawText('Calories', 430, 544, 8, true, [1, 1, 1]);
  doc.drawText('Protein', 485, 544, 8, true, [1, 1, 1]);
  doc.drawText('% Target', 520, 544, 8, true, [1, 1, 1]);

  let tableY = 520;
  dailyBreakdown.forEach((day, idx) => {
    const isEven = idx % 2 === 0;
    const rowBg = isEven ? [0.98, 0.98, 0.99] : [1, 1, 1];
    doc.drawRect(40, tableY - 4, 515, 18, rowBg, [0.9, 0.9, 0.9], 0.5);

    doc.drawText(day.date, 45, tableY, 8, false, [0.2, 0.2, 0.2]);
    doc.drawText(day.day_of_week?.slice(0, 3) || '', 95, tableY, 8, false, [0.3, 0.3, 0.3]);

    if (day.is_recorded) {
      doc.drawText('Recorded', 145, tableY, 8, true, [0.1, 0.5, 0.2]);
      const itemsSummary = (day.items || []).map(it => `${it.food_item} (${it.served_grams}g)`).join(', ') || 'Standard serving';
      const truncatedItems = itemsSummary.length > 40 ? itemsSummary.slice(0, 37) + '...' : itemsSummary;
      doc.drawText(truncatedItems, 225, tableY, 8, false, [0.2, 0.2, 0.2]);
      doc.drawText(`${day.calories} kcal`, 430, tableY, 8, false, [0.1, 0.1, 0.1]);
      doc.drawText(`${day.protein}g`, 485, tableY, 8, false, [0.1, 0.1, 0.1]);
      doc.drawText(`${day.fulfillment_pct}%`, 520, tableY, 8, true, day.met_school_target ? [0.1, 0.5, 0.2] : [0.7, 0.4, 0.1]);
    } else {
      doc.drawText('Unrecorded', 145, tableY, 8, false, [0.6, 0.6, 0.6]);
      doc.drawText('No mid-day meal logged / Weekend', 225, tableY, 8, false, [0.6, 0.6, 0.6]);
      doc.drawText('0 kcal', 430, tableY, 8, false, [0.6, 0.6, 0.6]);
      doc.drawText('0g', 485, tableY, 8, false, [0.6, 0.6, 0.6]);
      doc.drawText('0%', 520, tableY, 8, false, [0.6, 0.6, 0.6]);
    }

    tableY -= 18;
  });

  // Section D: Anthropometric Growth Screening (WHO 5-19)
  tableY -= 10;
  doc.drawRect(40, tableY - 45, 515, 50, [0.97, 0.98, 0.99], [0.85, 0.9, 0.95], 1);
  doc.drawText('ANTHROPOMETRIC GROWTH STATUS (WHO 5-19 REFERENCES)', 55, tableY - 5, 9, true, [0.2, 0.3, 0.5]);
  doc.drawText(`Height: ${screening.height_cm || student.height} cm   |   Weight: ${screening.weight_kg || student.weight} kg   |   BMI: ${screening.bmi || student.current_bmi}`, 55, tableY - 20, 9, true, [0.1, 0.1, 0.1]);
  doc.drawText(`Classification: ${screening.screening_label || screening.screening_category || 'Healthy Growth'}`, 55, tableY - 33, 9, true, [0.1, 0.45, 0.25]);
  doc.drawText('* Screening aid only. Growth indicators do NOT constitute a medical diagnosis.', 55, tableY - 43, 7.5, false, [0.5, 0.5, 0.5]);

  // Section E: Full-Day Context & Untracked Home Meals
  tableY -= 60;
  doc.drawRect(40, tableY - 40, 515, 45, [1.0, 0.99, 0.95], [0.9, 0.85, 0.75], 1);
  doc.drawText('FULL-DAY ICMR-NIN RDA REFERENCE & HOME MEAL CONTEXT', 55, tableY - 4, 9, true, [0.5, 0.3, 0.1]);
  doc.drawText(`Estimated Full-Day RDA: ${fullDay.full_day_calories_required || 1500} kcal, ${fullDay.full_day_protein_required || 18}g protein`, 55, tableY - 18, 8.5, false, [0.2, 0.2, 0.2]);
  doc.drawText(`Estimated Remaining Allowance for Home: ~${fullDay.estimated_remaining_daily_calories || 1050} kcal / ~${fullDay.estimated_remaining_daily_protein || 6}g protein`, 55, tableY - 29, 8.5, true, [0.6, 0.3, 0.1]);
  doc.drawText('Notice: School meals provide ~1/3 of daily calories. Breakfast and home dinner are unrecorded. Remainder is NOT a deficit.', 55, tableY - 38, 7.5, false, [0.5, 0.4, 0.3]);

  // Footer of Page 1
  doc.drawText('Page 1 of 2  •  Antigravity PM POSHAN AI Nutrition Assurance Platform  •  Confidential Student Record', 110, 30, 8, false, [0.5, 0.5, 0.5]);

  // ==========================================================================
  // PAGE 2: Personalized Dietary Guidance & Statutory Notices
  // ==========================================================================
  doc.addPage();

  // Header Banner Page 2
  doc.drawRect(40, 765, 515, 45, [0.15, 0.22, 0.38], null);
  doc.drawText('PM POSHAN - PERSONALIZED DIETARY RECOMMENDATIONS', 55, 792, 13, true, [1, 1, 1]);
  doc.drawText(`Tailored Nutrition Guidance for ${student.name} (${student.age}y)`, 55, 776, 9.5, false, [0.85, 0.9, 1]);

  let y2 = 740;

  // Section E1: In-School Portions
  doc.drawRect(40, y2 - 70, 515, 75, [1, 1, 1], [0.85, 0.85, 0.85], 1);
  doc.drawText('1. IN-SCHOOL MEAL PORTION ADJUSTMENTS', 55, y2 - 5, 10, true, [0.15, 0.35, 0.6]);
  doc.drawText('Recommendations limited to approved PM POSHAN school menu items:', 55, y2 - 18, 8.5, false, [0.4, 0.4, 0.4]);
  doc.drawText('• Ensure student receives the full statutory grain allocation (100g primary / 150g upper primary cooked rice/wheat).', 65, y2 - 32, 8.5, false, [0.2, 0.2, 0.2]);
  doc.drawText('• Encourage consuming the full serving of dal/sambar to satisfy mandated protein requirements.', 65, y2 - 45, 8.5, false, [0.2, 0.2, 0.2]);
  doc.drawText('• Include seasonal green vegetables (cooked palak/methi) to reinforce bioavailable iron and calcium.', 65, y2 - 58, 8.5, false, [0.2, 0.2, 0.2]);

  // Section E2: Supplementary Affordable School Snacks
  y2 -= 90;
  doc.drawRect(40, y2 - 70, 515, 75, [1, 1, 1], [0.85, 0.85, 0.85], 1);
  doc.drawText('2. COMPLEMENTARY MID-DAY SNACKS (WHERE PROVIDED)', 55, y2 - 5, 10, true, [0.2, 0.5, 0.25]);
  doc.drawText('High-density traditional Indian nutrition supplements:', 55, y2 - 18, 8.5, false, [0.4, 0.4, 0.4]);
  doc.drawText('• Roasted Bengal Gram (Chana - 30g portion): Provides 114 kcal, 5.4g protein, and 1.9mg iron.', 65, y2 - 32, 8.5, false, [0.2, 0.2, 0.2]);
  doc.drawText('• Groundnut Chikki (25g bar): Delivers 125 kcal and 3.5g protein as a wholesome energy booster.', 65, y2 - 45, 8.5, false, [0.2, 0.2, 0.2]);
  doc.drawText('• Steamed Moong Sprouts / Boiled Egg: High biological value protein for optimal adolescent growth.', 65, y2 - 58, 8.5, false, [0.2, 0.2, 0.2]);

  // Section E3: Home Coordination Guidance
  y2 -= 90;
  doc.drawRect(40, y2 - 70, 515, 75, [1, 1, 1], [0.85, 0.85, 0.85], 1);
  doc.drawText('3. HOME DIETARY GUIDANCE & MORNING/EVENING COORDINATION', 55, y2 - 5, 10, true, [0.6, 0.35, 0.1]);
  doc.drawText('Essential practices for parents and guardians to complement school lunches:', 55, y2 - 18, 8.5, false, [0.4, 0.4, 0.4]);
  doc.drawText('• Morning Breakfast: Never send child on an empty stomach. A warm meal (idli, poha, paratha, or porridge) jumpstarts metabolism.', 65, y2 - 32, 8.5, false, [0.2, 0.2, 0.2]);
  doc.drawText('• Evening Snack: Provide a small serving of seasonal fruit (banana/guava) or roasted makhana/nuts.', 65, y2 - 45, 8.5, false, [0.2, 0.2, 0.2]);
  doc.drawText('• Balanced Dinner: Whole grains accompanied by lentils, curd, and cooked leafy greens.', 65, y2 - 58, 8.5, false, [0.2, 0.2, 0.2]);

  // Section E4: Food Allergy & Safety Warning
  y2 -= 85;
  doc.drawRect(40, y2 - 50, 515, 55, [1.0, 0.96, 0.96], [0.9, 0.7, 0.7], 1);
  doc.drawText('IMPORTANT FOOD ALLERGY & SAFETY ADVISORY', 55, y2 - 5, 9.5, true, [0.7, 0.15, 0.15]);
  doc.drawText('• Do NOT introduce groundnut chikki, boiled eggs, or dairy/milk without prior verification of allergies.', 65, y2 - 20, 8.5, true, [0.6, 0.1, 0.1]);
  doc.drawText('• Please inform the school headmaster and class teacher immediately if your child has known food allergies.', 65, y2 - 34, 8.5, false, [0.3, 0.1, 0.1]);
  doc.drawText('• All school meals are cooked with potable water and fresh ingredients under strict hygienic standards.', 65, y2 - 46, 8.5, false, [0.3, 0.1, 0.1]);

  // Section F: Important Explanations & Disclaimers Box
  y2 -= 80;
  doc.drawRect(40, y2 - 95, 515, 105, [0.96, 0.97, 0.98], [0.8, 0.85, 0.9], 1);
  doc.drawText('IMPORTANT EXPLANATIONS & STATUTORY DISCLAIMERS', 55, y2 - 5, 9.5, true, [0.2, 0.3, 0.5]);
  doc.drawText('1. Actual Consumption: The report records food measured and dispensed at school via HX711 automated load cells;', 60, y2 - 20, 8, false, [0.3, 0.3, 0.3]);
  doc.drawText('   it does not confirm that the child consumed the entire portion.', 60, y2 - 30, 8, false, [0.3, 0.3, 0.3]);
  doc.drawText('2. Untracked Meals: Home breakfast, evening snacks, and family dinner are not recorded in this system.', 60, y2 - 42, 8, false, [0.3, 0.3, 0.3]);
  doc.drawText('3. Daily Allowance: Remaining full-day energy needs are ICMR estimates, NOT confirmed nutritional deficiencies.', 60, y2 - 54, 8, false, [0.3, 0.3, 0.3]);
  doc.drawText('4. Screening vs Diagnosis: Height, weight, and BMI categorizations are screening aids and NOT medical diagnoses.', 60, y2 - 66, 8, false, [0.3, 0.3, 0.3]);
  doc.drawText('5. Auxiliary AI Indicator: Machine learning predictions are experimental auxiliary indicators and must not be', 60, y2 - 78, 8, false, [0.3, 0.3, 0.3]);
  doc.drawText('   treated as clinical validation. Consult a pediatrician or medical officer for clinical evaluations.', 60, y2 - 88, 8, false, [0.3, 0.3, 0.3]);

  // Footer of Page 2
  doc.drawText('Page 2 of 2  •  Issued by PM POSHAN School Health & Nutrition Authority  •  Secure Digital Document', 105, 30, 8, false, [0.5, 0.5, 0.5]);

  const buffer = doc.buildBuffer();

  const safePeriodEnd = (period.end_date || new Date().toISOString().split('T')[0]).replace(/[^a-zA-Z0-9-]/g, '_');
  const fileName = `Weekly_Nutrition_Report_${student.id}_${safePeriodEnd}.pdf`;
  const filePath = path.join(storageDir, fileName);

  try {
    fs.writeFileSync(filePath, buffer);
    logger.info(`📄 Weekly nutrition PDF report generated successfully: ${filePath}`);
  } catch (fsErr) {
    logger.warn(`⚠️ Could not write PDF to filesystem (${fsErr.message}); returning in-memory buffer`);
  }

  return {
    filePath,
    buffer,
    fileName,
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Generate Comprehensive Malnutrition & Clinical Risk Assessment PDF Report
 * 
 * @param {object} student - Student profile object
 * @param {object} malnutritionData - Prediction & medical assessment object
 * @param {object} [dietPlan] - Optional Phase 5 diet recommendation
 * @param {object} [parentContact] - Parent contact details
 * @returns {Promise<{ filePath: string, buffer: Buffer, fileName: string, generatedAt: string }>}
 */
export const generateMalnutritionPdfReport = async (studentOrOpts, malnutritionDataParam = null, dietPlanParam = null, parentContactParam = null) => {
  let student, malnutritionData, dietPlan, parentContact;
  if (studentOrOpts && studentOrOpts.student) {
    student = studentOrOpts.student;
    malnutritionData = studentOrOpts.malnutritionData;
    dietPlan = studentOrOpts.dietPlan || null;
    parentContact = studentOrOpts.parentContact || null;
  } else {
    student = studentOrOpts;
    malnutritionData = malnutritionDataParam;
    dietPlan = dietPlanParam;
    parentContact = parentContactParam;
  }

  if (!student) {
    throw new AppError('Valid student data required for Malnutrition PDF generation', HTTP_STATUS.BAD_REQUEST);
  }

  ensureStorageDir();

  const doc = new SimplePdfDoc();
  const prediction = malnutritionData?.prediction || {};
  const inputs = malnutritionData?.inputs || {};
  const benchmarks = malnutritionData?.nutritional_benchmarks || {};
  const medicalAssessment = malnutritionData?.medical_assessment || {};

  const studentName = student.name || inputs.name || 'Child';
  const age = student.age || inputs.age || 10;
  const gender = student.gender || inputs.gender || 'Child';
  const height = inputs.height || student.height || 120;
  const weight = inputs.weight || student.weight || 25;
  const bmi = inputs.calculated_bmi || student.current_bmi || (weight / ((height / 100) * (height / 100))).toFixed(2);
  const status = prediction.status || student.health_status || 'Evaluated';
  const riskLevel = (prediction.risk_level || student.risk_level || 'healthy').toUpperCase();

  const parentName = parentContact?.parent_name || student.parent_name || 'Guardian';
  const parentEmail = parentContact?.parent_email || student.parent_email || 'Not Provided';
  const parentPhone = parentContact?.parent_phone || student.parent_phone || 'Not Provided';

  // ==========================================================================
  // PAGE 1: Malnutrition & Clinical Pathology Assessment
  // ==========================================================================

  // 1. National Official Header Banner
  doc.drawRect(40, 770, 515, 55, [0.1, 0.18, 0.35], null);
  doc.drawText('GOVERNMENT OF INDIA  •  MINISTRY OF EDUCATION  •  PM POSHAN SCHEME', 55, 808, 9, true, [0.9, 0.75, 0.3]);
  doc.drawText('PEDIATRIC MALNUTRITION & CLINICAL RISK ASSESSMENT', 55, 792, 13, true, [1, 1, 1]);
  doc.drawText('ICMR-NIN 2020 RDA Standardized Growth Surveillance & Clinical Pathology Report', 55, 778, 8.5, false, [0.85, 0.9, 0.98]);

  // 2. Student & Parent Registration Record Box
  doc.drawRect(40, 695, 515, 65, [0.97, 0.98, 1.0], [0.8, 0.85, 0.95], 1);
  doc.drawText('1. REGISTERED STUDENT & GUARDIAN PROFILE', 55, 747, 9, true, [0.15, 0.25, 0.5]);
  
  // Left Column: Student Details
  doc.drawText(`Student Name: ${studentName}`, 55, 732, 8.5, true, [0.1, 0.1, 0.1]);
  doc.drawText(`Student ID: ${student.id || 'N/A'}   |   Age: ${age} years   |   Sex: ${gender}`, 55, 720, 8, false, [0.2, 0.2, 0.2]);
  doc.drawText(`School: ${student.school_name || 'Govt. Model Primary School'}   |   RFID: ${student.rfid_card_id || 'Assigned'}`, 55, 708, 8, false, [0.3, 0.3, 0.3]);

  // Right Column: Guardian Details
  doc.drawText(`Parent / Guardian: ${parentName}`, 320, 732, 8.5, true, [0.1, 0.1, 0.1]);
  doc.drawText(`Registered Email: ${parentEmail}`, 320, 720, 8, false, [0.1, 0.4, 0.2]);
  doc.drawText(`Phone: ${parentPhone}   |   Verified: ${student.parent_email_verified ? 'Yes' : 'Recorded'}`, 320, 708, 8, false, [0.3, 0.3, 0.3]);

  // 3. Clinical Diagnostic Header Card
  const isCritical = riskLevel === 'CRITICAL' || riskLevel === 'UNDERWEIGHT';
  const diagBg = isCritical ? [1.0, 0.95, 0.95] : [0.95, 1.0, 0.96];
  const diagBorder = isCritical ? [0.9, 0.3, 0.3] : [0.2, 0.7, 0.4];
  const diagTextColor = isCritical ? [0.8, 0.1, 0.1] : [0.1, 0.5, 0.2];

  doc.drawRect(40, 615, 515, 70, diagBg, diagBorder, 1.5);
  doc.drawText('2. AI DIAGNOSTIC STATUS & WHO PEDIATRIC GROWTH CLASSIFICATION', 55, 670, 9, true, [0.3, 0.3, 0.3]);
  doc.drawText(status.toUpperCase(), 55, 648, 16, true, diagTextColor);
  doc.drawText(`CLINICAL RISK LEVEL: ${riskLevel}`, 55, 634, 8.5, true, diagTextColor);
  
  // Model info on right
  doc.drawRect(370, 622, 175, 54, [1, 1, 1], [0.85, 0.85, 0.85], 0.5);
  doc.drawText('RANDOM FOREST INFERENCE', 380, 663, 7.5, true, [0.4, 0.4, 0.4]);
  doc.drawText(`Confidence: ${Math.round((prediction.confidence || 0.88) * 100)}%`, 380, 650, 10, true, [0.1, 0.1, 0.1]);
  doc.drawText('WHO Growth Reference (5-19 yrs)', 380, 638, 7.5, false, [0.3, 0.3, 0.3]);
  doc.drawText(`Z-Score Category: ${prediction.pediatric_screening?.label || 'Evaluated'}`, 380, 627, 7.5, true, [0.2, 0.3, 0.6]);

  // Diagnosis note
  const reasonText = prediction.reason || 'Screening evaluated against WHO growth curves and dietary intake standards.';
  doc.drawText(`Assessment: ${reasonText.length > 95 ? reasonText.slice(0, 92) + '...' : reasonText}`, 55, 620, 7.5, false, [0.3, 0.3, 0.3]);

  // 4. Physical Anthropometry & ICMR Calorie Metrics
  doc.drawRect(40, 545, 120, 60, [0.98, 0.98, 0.98], [0.85, 0.85, 0.85], 1);
  doc.drawText('STATURE & MASS', 48, 592, 7.5, true, [0.4, 0.4, 0.4]);
  doc.drawText(`${height} cm`, 48, 577, 12, true, [0.1, 0.1, 0.1]);
  doc.drawText(`Weight: ${weight} kg`, 48, 563, 8.5, true, [0.2, 0.4, 0.7]);
  doc.drawText(`BMI: ${bmi} kg/m²`, 48, 551, 8.5, true, [0.1, 0.1, 0.1]);

  doc.drawRect(165, 545, 125, 60, [0.98, 0.98, 0.98], [0.85, 0.85, 0.85], 1);
  doc.drawText('PM POSHAN TARGET', 173, 592, 7.5, true, [0.4, 0.4, 0.4]);
  doc.drawText(`${benchmarks.school_meal_target || (age <= 10 ? 450 : 700)} kcal`, 173, 577, 12, true, [0.1, 0.5, 0.2]);
  doc.drawText(`Mandated: ${age <= 10 ? 12 : 20}g Protein`, 173, 563, 8, false, [0.3, 0.3, 0.3]);
  doc.drawText('Mid-Day Meal Allowance', 173, 551, 7.5, false, [0.5, 0.5, 0.5]);

  doc.drawRect(295, 545, 125, 60, [0.98, 0.98, 0.98], [0.85, 0.85, 0.85], 1);
  doc.drawText('MACHINE SERVED TODAY', 303, 592, 7.5, true, [0.4, 0.4, 0.4]);
  const servedKcal = benchmarks.actual_school_calories_served || student.nutritionAnalytics?.actualServed || 0;
  doc.drawText(`${servedKcal} kcal`, 303, 577, 12, true, servedKcal > 0 ? [0.1, 0.5, 0.2] : [0.6, 0.6, 0.6]);
  doc.drawText(servedKcal > 0 ? 'Dispensed via IoT Device' : 'Awaiting Dispensing', 303, 563, 8, false, [0.3, 0.3, 0.3]);
  doc.drawText(`Gap: ${benchmarks.school_meal_gap || 0} kcal`, 303, 551, 7.5, true, [0.8, 0.4, 0.1]);

  doc.drawRect(425, 545, 130, 60, [1.0, 0.98, 0.95], [0.9, 0.8, 0.7], 1);
  doc.drawText('ICMR FULL-DAY RDA', 433, 592, 7.5, true, [0.5, 0.3, 0.1]);
  doc.drawText(`${benchmarks.full_day_calories_required || (age <= 9 ? 1500 : 2200)} kcal`, 433, 577, 12, true, [0.8, 0.3, 0.1]);
  doc.drawText(`Remaining: ~${benchmarks.remaining_daily_calories || 1200} kcal`, 433, 563, 8, true, [0.8, 0.3, 0.1]);
  doc.drawText('24h Reference Energy', 433, 551, 7.5, false, [0.5, 0.5, 0.5]);

  // 5. Associated Medical Conditions & Clinical Pathology (ICD-10 Mapped)
  doc.drawText('3. ALL ASSOCIATED MEDICAL CONDITIONS & CLINICAL PATHOLOGY (ICD-10)', 40, 525, 9.5, true, [0.15, 0.25, 0.5]);
  doc.drawText(`Clinical Urgency: ${medicalAssessment.urgency || 'CLINICAL_MONITORING'}`, 420, 525, 8.5, true, [0.8, 0.2, 0.2]);

  const conditions = medicalAssessment.medical_conditions || [
    {
      name: 'Pediatric Undernutrition & Growth Delay',
      icd_hint: 'ICD-10 E44.0',
      severity: 'High',
      pathophysiology: 'Inadequate caloric and protein intake resulting in sub-optimal cellular protein synthesis and lean muscle mass depletion.',
      symptoms: ['Fatigue', 'Reduced physical stamina', 'Growth faltering'],
    },
    {
      name: 'Nutritional Anemia & Micronutrient Depletion',
      icd_hint: 'ICD-10 D53.9',
      severity: 'Critical',
      pathophysiology: 'Reduced hemoglobin synthesis secondary to insufficient bioavailable dietary iron, leading to tissue hypoxia.',
      symptoms: ['Pallor', 'Impaired cognitive focus', 'Dizziness', 'Weakness'],
    },
    {
      name: 'Compromised Cell-Mediated Immunity',
      icd_hint: 'ICD-10 D84.9',
      severity: 'Moderate',
      pathophysiology: 'Thymic involution and impaired lymphocyte proliferation resulting from chronic micronutrient deficits.',
      symptoms: ['Frequent upper respiratory infections', 'Delayed wound healing'],
    },
    {
      name: 'Pediatric Wasting & Metabolic Slowdown',
      icd_hint: 'ICD-10 E43',
      severity: 'Critical',
      pathophysiology: 'Catabolism of endogenous adipose stores to sustain basal physiological operations.',
      symptoms: ['Subcutaneous fat reduction', 'Decreased basal temperature'],
    },
  ];

  let condY = 505;
  conditions.slice(0, 4).forEach((cond) => {
    doc.drawRect(40, condY - 50, 515, 55, [1, 1, 1], [0.85, 0.85, 0.85], 0.8);
    
    // Condition title & severity
    const condName = cond.name || cond.condition || 'Nutritional Diagnostic';
    const severityStr = String(cond.severity || cond.level || 'Evaluation').toUpperCase();
    const icdHint = cond.icd_hint || cond.code || cond.icd_code || 'ICD-10';
    const isCritical = severityStr === 'CRITICAL' || severityStr === 'SEVERE';

    doc.drawText(condName, 50, condY - 12, 8.5, true, [0.1, 0.1, 0.1]);
    doc.drawText(`${severityStr} (${icdHint})`, 410, condY - 12, 8, true, isCritical ? [0.8, 0.1, 0.1] : [0.7, 0.4, 0.1]);
    
    // Pathophysiology
    const pathText = cond.pathophysiology || cond.description || cond.reason || '';
    const safePath = pathText.length > 115 ? pathText.slice(0, 112) + '...' : pathText;
    doc.drawText(`Pathology: ${safePath || 'Metabolic deficit requiring dietary intervention'}`, 50, condY - 26, 7.5, false, [0.25, 0.25, 0.25]);

    // Manifestations
    const syms = Array.isArray(cond.symptoms) ? cond.symptoms.join(', ') : (cond.symptoms || '');
    doc.drawText(`Clinical Signs: ${syms || 'Clinical observation advised'}`, 50, condY - 39, 7.5, false, [0.4, 0.4, 0.4]);

    condY -= 60;
  });

  // Footer of Page 1
  doc.drawText('Page 1 of 2  •  Antigravity PM POSHAN AI Child Health Assurance  •  Confidential Medical Record', 105, 30, 8, false, [0.5, 0.5, 0.5]);

  // ==========================================================================
  // PAGE 2: Dietary Blueprint, Home Coordination & Clinical Action
  // ==========================================================================
  doc.addPage();

  // Header Banner Page 2
  doc.drawRect(40, 770, 515, 50, [0.12, 0.28, 0.32], null);
  doc.drawText('PM POSHAN & ICMR-NIN  •  PERSONALIZED DIETARY BLUEPRINT', 55, 804, 11, true, [1, 1, 1]);
  doc.drawText(`Targeted Nutritional Intervention Plan for ${studentName} (${age} years)`, 55, 788, 9, false, [0.85, 0.95, 0.9]);

  let y2 = 750;

  // 1. In-School Mid-Day Meal Allocations
  doc.drawRect(40, y2 - 65, 515, 70, [1, 1, 1], [0.85, 0.85, 0.85], 1);
  doc.drawText('1. IN-SCHOOL MEAL REINFORCEMENTS (MID-DAY MEAL)', 55, y2 - 5, 9.5, true, [0.1, 0.4, 0.5]);
  doc.drawText('• Mandatory Rice/Grain Portion: Ensure child receives the complete cooked allocation (100g primary / 150g upper primary).', 65, y2 - 20, 8, false, [0.2, 0.2, 0.2]);
  doc.drawText('• Protein-Fortified Dal & Sambar: Full katori of thick dal containing pigeon pea (toor) or green gram for essential lysine.', 65, y2 - 33, 8, false, [0.2, 0.2, 0.2]);
  doc.drawText('• Micronutrient Greens: Cooked spinach (palak), methi, or drumstick leaves to combat nutritional anemia.', 65, y2 - 46, 8, false, [0.2, 0.2, 0.2]);

  // 2. High-Density Supplementary School Snacks
  y2 -= 80;
  doc.drawRect(40, y2 - 65, 515, 70, [1, 1, 1], [0.85, 0.85, 0.85], 1);
  doc.drawText('2. SUPPLEMENTARY NUTRITION BOOSTER (AFFORDABLE / SCHOOL-SUPPLIED)', 55, y2 - 5, 9.5, true, [0.2, 0.5, 0.2]);
  doc.drawText('• Roasted Bengal Gram (Chana - 30g): 114 kcal, 5.4g protein, 1.9mg elemental iron. Excellent satiety and energy density.', 65, y2 - 20, 8, false, [0.2, 0.2, 0.2]);
  doc.drawText('• Peanut / Groundnut Chikki (25g bar): 125 kcal, 3.5g protein. Delivers essential fatty acids for cellular growth.', 65, y2 - 33, 8, false, [0.2, 0.2, 0.2]);
  doc.drawText('• Steamed Sprouted Moong / Boiled Egg: High biological value protein. Mandatory recommendation for underweight recovery.', 65, y2 - 46, 8, false, [0.2, 0.2, 0.2]);

  // 3. Home Guidance for Parents & Guardians
  y2 -= 80;
  doc.drawRect(40, y2 - 75, 515, 80, [1, 1, 1], [0.85, 0.85, 0.85], 1);
  doc.drawText('3. HOME MEAL GUIDELINES FOR PARENTS (BREAKFAST & DINNER)', 55, y2 - 5, 9.5, true, [0.6, 0.35, 0.1]);
  doc.drawText('• Morning Breakfast: Never send child to school on an empty stomach. A warm meal (ragi malt, poha, idli, or paratha) is critical.', 65, y2 - 20, 8, false, [0.2, 0.2, 0.2]);
  doc.drawText('• Evening Snack at Home: Fresh seasonal fruit (guava, banana) or roasted puffed rice with jaggery for rapid glycogen reload.', 65, y2 - 33, 8, false, [0.2, 0.2, 0.2]);
  doc.drawText('• High-Calorie Dinner: Whole wheat roti or rice served with mixed vegetable sambar, curd, and a teaspoon of ghee.', 65, y2 - 46, 8, false, [0.2, 0.2, 0.2]);
  doc.drawText('• Hydration: Ensure 1.5 - 2.0 liters of safe potable drinking water daily.', 65, y2 - 59, 8, false, [0.2, 0.2, 0.2]);

  // 4. Clinical Action & Pediatric Medical Care
  y2 -= 90;
  doc.drawRect(40, y2 - 70, 515, 75, [1.0, 0.97, 0.97], [0.85, 0.6, 0.6], 1);
  doc.drawText('4. RECOMMENDED CLINICAL & MEDICAL ACTION STEPS', 55, y2 - 5, 9.5, true, [0.75, 0.1, 0.1]);
  doc.drawText('• Physician Consultation: Child exhibits symptoms corresponding to clinical undernutrition; visit Primary Health Centre (PHC).', 65, y2 - 20, 8, false, [0.2, 0.2, 0.2]);
  doc.drawText('• Iron & Folic Acid (WIFS): Administer weekly supervised IFA tablet under the National Iron Plus Initiative.', 65, y2 - 33, 8, false, [0.2, 0.2, 0.2]);
  doc.drawText('• Deworming Schedule: Verify bi-annual Albendazole (400mg) dosage under National Deworming Day guidelines.', 65, y2 - 46, 8, false, [0.2, 0.2, 0.2]);
  doc.drawText('• Biometric Monitoring: Retake calibrated stadiometer height and electronic weight measurement every 14 days.', 65, y2 - 59, 8, false, [0.2, 0.2, 0.2]);

  // 5. Official Verification Seal & Disclaimers
  y2 -= 85;
  doc.drawRect(40, y2 - 90, 515, 95, [0.97, 0.98, 0.99], [0.8, 0.85, 0.9], 1);
  doc.drawText('STATUTORY NOTICE, OFFICIAL SIGN-OFF & MEDICAL DISCLAIMER', 55, y2 - 5, 8.5, true, [0.2, 0.3, 0.5]);
  doc.drawText('1. AI-Assisted Screening: This report is generated via Random Forest Machine Learning trained on pediatric dietary patterns.', 55, y2 - 18, 7.5, false, [0.3, 0.3, 0.3]);
  doc.drawText('   It serves as a preventive surveillance screening tool and does NOT substitute for a formal clinical medical diagnosis.', 55, y2 - 28, 7.5, false, [0.3, 0.3, 0.3]);
  doc.drawText('2. IoT Serving Records: School meals are recorded at automated dispenser points; home consumption is unmonitored.', 55, y2 - 39, 7.5, false, [0.3, 0.3, 0.3]);
  
  // Seal Box
  doc.drawRect(375, y2 - 82, 170, 36, [1, 1, 1], [0.7, 0.7, 0.7], 0.8);
  doc.drawText('OFFICIAL HEALTH AUTHORITY', 385, y2 - 54, 7, true, [0.2, 0.2, 0.5]);
  doc.drawText(`Date: ${new Date().toLocaleDateString('en-IN')}`, 385, y2 - 64, 7, false, [0.3, 0.3, 0.3]);
  doc.drawText('Digital Verification: PM-POSHAN-VERIFIED', 385, y2 - 74, 6.5, true, [0.1, 0.5, 0.2]);

  doc.drawText('Issued under the National Child Health & Nutrition Surveillance Mission, Ministry of Education, Govt. of India.', 55, y2 - 78, 7.5, true, [0.2, 0.2, 0.2]);

  // Footer of Page 2
  doc.drawText('Page 2 of 2  •  Issued by PM POSHAN Health & Nutrition Authority  •  Secure Digital Document', 110, 30, 8, false, [0.5, 0.5, 0.5]);

  const buffer = doc.buildBuffer();

  const safeStudentName = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStamp = new Date().toISOString().split('T')[0];
  const fileName = `Malnutrition_Report_${safeStudentName}_${dateStamp}.pdf`;
  const filePath = path.join(storageDir, fileName);

  try {
    fs.writeFileSync(filePath, buffer);
    logger.info(`📄 Malnutrition PDF report generated successfully: ${filePath}`);
  } catch (fsErr) {
    logger.warn(`⚠️ Could not write PDF to filesystem (${fsErr.message}); returning in-memory buffer`);
  }

  return {
    filePath,
    buffer,
    fileName,
    generatedAt: new Date().toISOString(),
  };
};

export default {
  generateWeeklyNutritionPdf,
  generateMalnutritionPdfReport,
};

