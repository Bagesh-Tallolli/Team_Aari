// Constants for the nutrition monitoring system

export const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/' },
  { id: 'foodDistribution', label: 'Food Distribution', icon: 'Utensils', path: '/food-distribution' },
  { id: 'students', label: 'Students', icon: 'Users', path: '/students' },
  { id: 'nutritionTracker', label: 'Nutrition Tracker', icon: 'Activity', path: '/students/nutrition-tracker' },
  { id: 'alerts', label: 'Alerts', icon: 'AlertCircle', path: '/alerts' },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3', path: '/analytics' },
  { id: 'schemes', label: 'Govt. Schemes', icon: 'Landmark', path: '/government-schemes' },
  { id: 'howItWorks', label: 'How It Works', icon: 'Info', path: '/how-it-works' },
];

export const RISK_LEVELS = {
  HEALTHY: 'healthy',
  AT_RISK: 'at_risk',
  CRITICAL: 'critical',
};

export const RISK_COLORS = {
  healthy: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' },
  at_risk: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50' },
  critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' },
};

export const PM_POSHAN_TARGETS = {
  primary: { calories: 450, protein: 12, label: 'Primary (Class 1-5, Age <= 10)' },
  upperPrimary: { calories: 700, protein: 20, label: 'Upper Primary (Class 6-8, Age > 10)' },
};

export const ICMR_DAILY_TARGETS = {
  primary: { calories: 1500, protein: 18, label: 'Daily Requirement (Age 6-9)' },
  upperPrimary: { calories: 2200, protein: 32, label: 'Daily Requirement (Age 10-14)' },
};

export const BMI_CATEGORIES = {
  SEVERE_THINNESS: 'severe_thinness',
  THINNESS: 'thinness',
  NORMAL: 'normal',
  OVERWEIGHT: 'overweight',
  OBESE: 'obese',
};

// Pediatric Growth Reference Note
export const PEDIATRIC_SCREENING_INFO = {
  source: 'WHO Growth Reference (5-19 Years) & PM POSHAN 2021 Norms',
  disclaimer: 'Screening indicator only. Not a medical diagnosis. Evaluated using age- and sex-specific growth standards.',
};

export const BMI_RANGES = {
  thinness: { min: 0, max: 15.0, label: 'Thinness / Underweight', color: 'blue' },
  normal: { min: 15.0, max: 20.0, label: 'Healthy Weight for Age', color: 'green' },
  overweight: { min: 20.0, max: 24.0, label: 'Overweight for Age', color: 'yellow' },
  obese: { min: 24.0, max: 999, label: 'Obese for Age', color: 'red' },
  // Backward compatibility alias
  underweight: { min: 0, max: 15.0, label: 'Thinness / Underweight', color: 'blue' },
};

export const NUTRITION_TARGETS = {
  school_meal_primary: { calories: 450, protein: 12, unit: 'kcal' },
  school_meal_upper_primary: { calories: 700, protein: 20, unit: 'kcal' },
  daily_estimated_primary: { calories: 1500, protein: 18, unit: 'kcal' },
  daily_estimated_upper_primary: { calories: 2200, protein: 32, unit: 'kcal' },
  // Legacy aliases
  protein: { daily: 12, unit: 'g' },
  calories: { daily: 450, unit: 'kcal' },
  carbs: { daily: 70, unit: 'g' },
  fats: { daily: 10, unit: 'g' },
};

export const ALERT_TYPES = {
  LOW_BMI: 'low_bmi',
  HIGH_BMI: 'high_bmi',
  LOW_PROTEIN: 'low_protein',
  LOW_CALORIES: 'low_calories',
  MISSED_MEAL: 'missed_meal',
};

export const API_ENDPOINTS = {
  AUTH_LOGIN: '/api/auth/login',
  DASHBOARD: '/api/dashboard',
  STUDENTS: '/api/students',
  STUDENT_DETAIL: '/api/students/:id',
  ALERTS: '/api/alerts',
  ANALYTICS: '/api/analytics',
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  AUTH_USER: 'auth_user',
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
};

export const ANIMATION_DURATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
};

export const CHART_COLORS = {
  primary: '#4F46E5',
  secondary: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export const PAGE_LIMITS = {
  STUDENTS_PER_PAGE: 10,
  ALERTS_PER_PAGE: 20,
  LOGS_PER_PAGE: 15,
};
