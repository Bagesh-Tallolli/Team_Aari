// Constants for the nutrition monitoring system

export const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/' },
  { id: 'foodDistribution', label: 'Food Distribution', icon: 'Utensils', path: '/food-distribution' },
  { id: 'students', label: 'Students', icon: 'Users', path: '/students' },
  { id: 'nutritionTracker', label: 'Nutrition Tracker', icon: 'Activity', path: '/students/nutrition-tracker' },
  { id: 'alerts', label: 'Alerts', icon: 'AlertCircle', path: '/alerts' },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3', path: '/analytics' },
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

export const BMI_CATEGORIES = {
  UNDERWEIGHT: 'underweight',
  NORMAL: 'normal',
  OVERWEIGHT: 'overweight',
  OBESE: 'obese',
};

export const BMI_RANGES = {
  underweight: { min: 0, max: 18.5, label: 'Underweight', color: 'blue' },
  normal: { min: 18.5, max: 24.9, label: 'Normal weight', color: 'green' },
  overweight: { min: 25, max: 29.9, label: 'Overweight', color: 'yellow' },
  obese: { min: 30, max: 999, label: 'Obese', color: 'red' },
};

export const NUTRITION_TARGETS = {
  protein: { daily: 50, unit: 'g' },
  calories: { daily: 2000, unit: 'kcal' },
  carbs: { daily: 300, unit: 'g' },
  fats: { daily: 65, unit: 'g' },
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
