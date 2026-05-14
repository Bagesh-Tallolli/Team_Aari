/**
 * Seed Script: Populate 50 Students with Realistic Data
 * Generates: 50 students, 150+ food logs, 150+ BMI records, 35+ alerts
 * Run: node scripts/seed-50-students.js
 */

import { query } from '../src/config/database.js';

// Student name database
const firstNames = ['Aman', 'Priya', 'Raj', 'Neha', 'Rohan', 'Sneha', 'Aditya', 'Meera', 'Vikram', 'Anjali',
  'Rahul', 'Divya', 'Nikhil', 'Pooja', 'Sanjay', 'Riya', 'Arjun', 'Shreya', 'Varun', 'Isha',
  'Abhishek', 'Ananya', 'Karthik', 'Priyanka', 'Harshit', 'Tanvi', 'Rishabh', 'Nisha', 'Sameer', 'Avni',
  'Darsh', 'Esha', 'Faisal', 'Girija', 'Himanshu', 'Indira', 'Jitendra', 'Kanika', 'Lakshay', 'Mahima',
  'Nitin', 'Ojaswi', 'Pankaj', 'Quratulain', 'Rajesh', 'Sakshi', 'Tushar', 'Usha', 'Vedant', 'Weena'];

const lastNames = ['Kumar', 'Singh', 'Patel', 'Sharma', 'Gupta', 'Desai', 'Verma', 'Nair', 'Reddy', 'Iyer',
  'Mishra', 'Kapoor', 'Saxena', 'Menon', 'Rao', 'Chopra', 'Pillai', 'Agarwal', 'Srivastava', 'Dutta',
  'Nath', 'Bhat', 'Trivedi', 'Bajaj', 'Joshi', 'Bhatnagar', 'Yadav', 'Khan', 'Tiwari', 'Malhotra',
  'Bansal', 'Ahmed', 'Sinha', 'Rathore', 'Pandey', 'Mehta', 'Deshmukh', 'Prabhu', 'Singh', 'Talwar'];

// Food items with nutrition data (grams are per 100g serving)
const foods = [
  { name: 'Chicken Biryani', calories: 180, protein: 10, carbs: 22, fats: 7, portionSize: [200, 300, 350] },
  { name: 'Paneer Tikka', calories: 160, protein: 14, carbs: 4, fats: 10, portionSize: [150, 200, 250] },
  { name: 'Fish Curry', calories: 150, protein: 14, carbs: 6, fats: 7, portionSize: [200, 250, 300] },
  { name: 'Butter Chicken', calories: 173, protein: 10, carbs: 5, fats: 13, portionSize: [250, 300, 350] },
  { name: 'Dal Makhani', calories: 130, protein: 8, carbs: 16, fats: 4, portionSize: [200, 250, 300] },
  { name: 'Brown Rice', calories: 130, protein: 3, carbs: 29, fats: 1, portionSize: [150, 200, 250] },
  { name: 'Roti', calories: 265, protein: 10, carbs: 50, fats: 3, portionSize: [100, 150, 200] },
  { name: 'Milk', calories: 61, protein: 3.2, carbs: 4.8, fats: 3.3, portionSize: [200, 250, 300] },
  { name: 'Egg', calories: 155, protein: 13, carbs: 1.1, fats: 11, portionSize: [50, 100, 150] },
  { name: 'Vegetables', calories: 35, protein: 2.8, carbs: 6.9, fats: 0.2, portionSize: [100, 150, 200] },
  { name: 'Chole Bhature', calories: 240, protein: 8, carbs: 42, fats: 6, portionSize: [250, 350, 400] },
  { name: 'Dosa', calories: 186, protein: 5.3, carbs: 28, fats: 5.3, portionSize: [150, 200, 250] },
  { name: 'Idli', calories: 112, protein: 2.7, carbs: 23, fats: 0.3, portionSize: [100, 150, 200] },
  { name: 'Samosa', calories: 280, protein: 6, carbs: 32, fats: 14, portionSize: [100, 150, 200] },
  { name: 'Aloo Paratha', calories: 150, protein: 3.3, carbs: 28, fats: 2.7, portionSize: [100, 150, 200] },
  { name: 'Upma', calories: 133, protein: 3.9, carbs: 23, fats: 2.8, portionSize: [150, 200, 250] },
  { name: 'Rajma Rice', calories: 127, protein: 4.7, carbs: 22, fats: 1.7, portionSize: [200, 250, 300] },
  { name: 'Poha', calories: 90, protein: 2, carbs: 19, fats: 0.5, portionSize: [150, 200, 250] },
  { name: 'Khichdi', calories: 95, protein: 3, carbs: 18, fats: 1, portionSize: [200, 250, 300] },
  { name: 'Spinach Dal', calories: 106, protein: 8, carbs: 15, fats: 2, portionSize: [200, 250, 300] },
];

// Generate realistic students
function generateStudents() {
  const students = [];
  for (let i = 0; i < 50; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const age = Math.floor(Math.random() * 8) + 8; // Ages 8-15 for mid-day meal scheme
    
    // Generate realistic height and weight for school children
    const height = Math.floor(Math.random() * 50) + 110; // 110-160 cm for school kids
    const weight = Math.floor(Math.random() * 30) + 20; // 20-50 kg
    const bmi = (weight / ((height / 100) ** 2)).toFixed(2);
    
    // Determine risk level based on BMI
    let riskLevel = 'healthy';
    if (bmi < 14) riskLevel = 'underweight';
    else if (bmi > 24) riskLevel = 'at_risk';
    if (bmi > 28) riskLevel = 'critical';
    
    students.push({
      name: `${firstName} ${lastName}`,
      email: `student${i + 1}@nutrition.com`,
      age,
      height: height.toFixed(2),
      weight: weight.toFixed(2),
      bmi: bmi,
      riskLevel,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}${lastName}`
    });
  }
  return students;
}

// Generate food logs for a student
function generateFoodLogs(studentId, count = 3) {
  const logs = [];
  const mealtimes = [
    { type: 'breakfast', hour: 8 },
    { type: 'midday', hour: 12 },
    { type: 'snack', hour: 15 },
    { type: 'dinner', hour: 19 }
  ];
  
  for (let i = 0; i < count; i++) {
    const food = foods[Math.floor(Math.random() * foods.length)];
    const portion = food.portionSize[Math.floor(Math.random() * food.portionSize.length)];
    const daysAgo = Math.floor(Math.random() * 15); // Last 15 days
    const mealtime = mealtimes[Math.floor(Math.random() * mealtimes.length)];
    
    const calories = (food.calories * portion / 100).toFixed(2);
    const protein = (food.protein * portion / 100).toFixed(2);
    const carbs = (food.carbs * portion / 100).toFixed(2);
    const fats = (food.fats * portion / 100).toFixed(2);
    
    const loggedAt = new Date();
    loggedAt.setDate(loggedAt.getDate() - daysAgo);
    loggedAt.setHours(mealtime.hour, Math.floor(Math.random() * 60), 0, 0);
    
    logs.push({
      studentId,
      foodItem: food.name,
      servedGrams: portion.toFixed(2),
      estimatedCalories: calories,
      protein: protein,
      carbs: carbs,
      fats: fats,
      loggedAt: loggedAt.toISOString()
    });
  }
  return logs;
}

// Generate BMI records with historical trend
function generateBmiRecords(studentId, height, weight, bmi, riskLevel) {
  const records = [];
  
  // Create 3-4 historical records
  let currentWeight = weight;
  for (let i = 3; i >= 0; i--) {
    const daysAgo = i * 7; // Weekly records
    const variation = (Math.random() - 0.5) * 3; // ±1.5 kg variation
    currentWeight = parseFloat(weight) + variation;
    
    const currentBmi = (currentWeight / ((height / 100) ** 2)).toFixed(2);
    let status = 'normal';
    if (currentBmi < 14) status = 'underweight';
    else if (currentBmi > 24) status = 'overweight';
    if (currentBmi > 28) status = 'obese';
    
    const analysis = generateAiAnalysis(currentBmi, riskLevel);
    
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    
    records.push({
      studentId,
      bmi: currentBmi,
      weight: currentWeight.toFixed(2),
      height: height.toFixed(2),
      status,
      riskFlag: riskLevel,
      aiAnalysis: analysis,
      createdAt: createdAt.toISOString()
    });
  }
  return records;
}

// Generate AI analysis based on BMI
function generateAiAnalysis(bmi, riskLevel) {
  if (riskLevel === 'critical') {
    return `CRITICAL: BMI ${bmi} indicates serious health concern. Immediate medical intervention required.`;
  } else if (riskLevel === 'at_risk') {
    return `WARNING: BMI ${bmi} indicates at-risk condition. Dietary modification and exercise recommended.`;
  } else if (riskLevel === 'underweight') {
    return `ALERT: BMI ${bmi} indicates underweight status. Nutrition enrichment required.`;
  }
  return `HEALTHY: BMI ${bmi} is within normal healthy range. Maintain current lifestyle.`;
}

// Generate health alerts
function generateAlerts(students) {
  const alerts = [];
  
  students.forEach((student, idx) => {
    const bmi = parseFloat(student.bmi);
    
    if (student.riskLevel === 'critical') {
      alerts.push({
        studentId: idx + 1,
        alertType: 'BMI_ALERT',
        severity: 'critical',
        message: `Critical: BMI ${bmi.toFixed(2)} - Immediate intervention needed`,
        riskLevel: student.riskLevel,
        bmiValue: bmi,
        resolved: false
      });
      alerts.push({
        studentId: idx + 1,
        alertType: 'NUTRITION_ALERT',
        severity: 'critical',
        message: `Critical: Student requires urgent nutritional assessment`,
        riskLevel: student.riskLevel,
        bmiValue: bmi,
        resolved: false
      });
    } else if (student.riskLevel === 'at_risk') {
      alerts.push({
        studentId: idx + 1,
        alertType: 'BMI_ALERT',
        severity: 'warning',
        message: `At Risk: BMI ${bmi.toFixed(2)} - Dietary modification advised`,
        riskLevel: student.riskLevel,
        bmiValue: bmi,
        resolved: false
      });
    } else if (student.riskLevel === 'underweight') {
      alerts.push({
        studentId: idx + 1,
        alertType: 'NUTRITION_ALERT',
        severity: 'warning',
        message: `Underweight: BMI ${bmi.toFixed(2)} - Nutrition enrichment needed`,
        riskLevel: student.riskLevel,
        bmiValue: bmi,
        resolved: false
      });
    }
  });
  
  return alerts;
}

// Main seeding function
async function seedDatabase() {
  try {
    console.log('🌱 Starting comprehensive data seeding...\n');
    
    // 1. Generate students
    const students = generateStudents();
    console.log(`📚 Generated ${students.length} students`);
    
    // 2. Insert students
    for (const student of students) {
      await query(
        `INSERT INTO students (name, email, age, height, weight, current_bmi, risk_level, avatar, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [student.name, student.email, student.age, student.height, student.weight, student.bmi, student.riskLevel, student.avatar]
      );
    }
    console.log(`✓ Inserted ${students.length} students into database\n`);
    
    // 3. Generate and insert food logs (3-4 per student = 150-200 logs)
    console.log('🍽️  Generating food logs...');
    let foodLogCount = 0;
    for (let i = 0; i < students.length; i++) {
      const logsPerStudent = Math.floor(Math.random() * 2) + 3; // 3-4 logs per student
      const logs = generateFoodLogs(i + 1, logsPerStudent);
      
      for (const log of logs) {
        await query(
          `INSERT INTO food_logs (student_id, food_item, served_grams, estimated_calories, protein, carbs, fats, logged_at, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [log.studentId, log.foodItem, log.servedGrams, log.estimatedCalories, log.protein, log.carbs, log.fats, log.loggedAt]
        );
        foodLogCount++;
      }
    }
    console.log(`✓ Inserted ${foodLogCount} food logs into database\n`);
    
    // 4. Generate and insert BMI records
    console.log('📊 Generating BMI records...');
    let bmiRecordCount = 0;
    for (let i = 0; i < students.length; i++) {
      const records = generateBmiRecords(
        i + 1,
        parseFloat(students[i].height),
        parseFloat(students[i].weight),
        parseFloat(students[i].bmi),
        students[i].riskLevel
      );
      
      for (const record of records) {
        await query(
          `INSERT INTO bmi_records (student_id, bmi, weight, height, status, risk_flag, ai_analysis, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [record.studentId, record.bmi, record.weight, record.height, record.status, record.riskFlag, record.aiAnalysis, record.createdAt]
        );
        bmiRecordCount++;
      }
    }
    console.log(`✓ Inserted ${bmiRecordCount} BMI records into database\n`);
    
    // 5. Generate and insert alerts
    console.log('🚨 Generating health alerts...');
    const alerts = generateAlerts(students);
    
    for (const alert of alerts) {
      await query(
        `INSERT INTO alerts (student_id, alert_type, severity, message, risk_level, bmi_value, resolved, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [alert.studentId, alert.alertType, alert.severity, alert.message, alert.riskLevel, alert.bmiValue, alert.resolved ? 1 : 0]
      );
    }
    console.log(`✓ Inserted ${alerts.length} health alerts into database\n`);
    
    // 6. Summary
    console.log('✅ SEEDING COMPLETE!\n');
    console.log('📈 Summary:');
    console.log(`   - Students: ${students.length}`);
    console.log(`   - Food Logs: ${foodLogCount}`);
    console.log(`   - BMI Records: ${bmiRecordCount}`);
    console.log(`   - Health Alerts: ${alerts.length}`);
    console.log(`\n📊 Risk Distribution:`);
    const healthyCount = students.filter(s => s.riskLevel === 'healthy').length;
    const atRiskCount = students.filter(s => s.riskLevel === 'at_risk').length;
    const criticalCount = students.filter(s => s.riskLevel === 'critical').length;
    const underweightCount = students.filter(s => s.riskLevel === 'underweight').length;
    console.log(`   - Healthy: ${healthyCount} (${((healthyCount/50)*100).toFixed(1)}%)`);
    console.log(`   - At Risk: ${atRiskCount} (${((atRiskCount/50)*100).toFixed(1)}%)`);
    console.log(`   - Critical: ${criticalCount} (${((criticalCount/50)*100).toFixed(1)}%)`);
    console.log(`   - Underweight: ${underweightCount} (${((underweightCount/50)*100).toFixed(1)}%)`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding
seedDatabase();
