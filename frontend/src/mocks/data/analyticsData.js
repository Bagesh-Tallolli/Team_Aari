// Mock analytics data
export const mockAnalyticsData = {
  nutritionTrends: [
    { month: 'Jan', protein: 48, calories: 1950, carbs: 280, fats: 60 },
    { month: 'Feb', protein: 49, calories: 1970, carbs: 285, fats: 61 },
    { month: 'Mar', protein: 48, calories: 1950, carbs: 280, fats: 59 },
    { month: 'Apr', protein: 50, calories: 2000, carbs: 295, fats: 62 },
    { month: 'May', protein: 52, calories: 2050, carbs: 310, fats: 64 },
    { month: 'Jun', protein: 51, calories: 2020, carbs: 300, fats: 63 },
  ],

  studentComparison: [
    { name: 'Aarav S.', bmi: 22.2, calories: 1950, protein: 48, status: 'healthy' },
    { name: 'Priya P.', bmi: 19.1, calories: 1850, protein: 46, status: 'healthy' },
    { name: 'Rohan G.', bmi: 28.6, calories: 2300, protein: 52, status: 'at_risk' },
    { name: 'Anjali S.', bmi: 17.2, calories: 1050, protein: 28, status: 'critical' },
    { name: 'Vikram K.', bmi: 21.8, calories: 1950, protein: 48, status: 'healthy' },
  ],

  deficiencyPatterns: [
    { category: 'Protein', deficient: 45, normal: 380, excess: 62 },
    { category: 'Calories', deficient: 78, normal: 320, excess: 89 },
    { category: 'Carbs', deficient: 92, normal: 310, excess: 85 },
    { category: 'Fats', deficient: 65, normal: 330, excess: 92 },
    { category: 'Vitamins', deficient: 120, normal: 280, excess: 87 },
  ],

  riskTrend: [
    { month: 'Jan', healthy: 340, atRisk: 115, critical: 32 },
    { month: 'Feb', healthy: 345, atRisk: 110, critical: 32 },
    { month: 'Mar', healthy: 340, atRisk: 110, critical: 37 },
    { month: 'Apr', healthy: 350, atRisk: 105, critical: 32 },
    { month: 'May', healthy: 355, atRisk: 100, critical: 32 },
    { month: 'Jun', healthy: 360, atRisk: 95, critical: 32 },
  ],

  bmiDistribution: [
    { range: '< 18.5', count: 65, label: 'Underweight' },
    { range: '18.5 - 24.9', count: 320, label: 'Normal' },
    { range: '25 - 29.9', count: 85, label: 'Overweight' },
    { range: '≥ 30', count: 17, label: 'Obese' },
  ],

  timeSeriesMetrics: {
    dailyMealsServed: [
      { date: '2024-03-25', value: 1180 },
      { date: '2024-03-26', value: 1220 },
      { date: '2024-03-27', value: 1200 },
      { date: '2024-03-28', value: 1250 },
      { date: '2024-03-29', value: 1230 },
      { date: '2024-03-30', value: 1240 },
      { date: '2024-03-31', value: 1243 },
    ],
    alertFrequency: [
      { date: '2024-03-25', value: 8 },
      { date: '2024-03-26', value: 12 },
      { date: '2024-03-27', value: 9 },
      { date: '2024-03-28', value: 15 },
      { date: '2024-03-29', value: 11 },
      { date: '2024-03-30', value: 10 },
      { date: '2024-03-31', value: 6 },
    ],
  },
};
