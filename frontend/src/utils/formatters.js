import { format, formatDistanceToNow } from 'date-fns';
import { BMI_RANGES, BMI_CATEGORIES } from './constants.js';

// Date formatting
export const formatDate = (date) => {
  return format(new Date(date), 'MMM dd, yyyy');
};

export const formatTime = (date) => {
  return format(new Date(date), 'HH:mm');
};

export const formatDateTime = (date) => {
  return format(new Date(date), 'MMM dd, yyyy HH:mm');
};

export const formatRelativeTime = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

// BMI calculation
export const calculateBMI = (weight, height) => {
  // height in cm, weight in kg
  if (!weight || !height || height === 0) return null;
  const heightInMeters = height / 100;
  return (weight / (heightInMeters * heightInMeters)).toFixed(1);
};

// Get BMI category
export const getBMICategory = (bmi) => {
  if (bmi === null) return 'unknown';
  
  for (const [key, range] of Object.entries(BMI_RANGES)) {
    if (bmi >= range.min && bmi < range.max) {
      return key;
    }
  }
  return 'obese';
};

// Get BMI status
export const getBMIStatus = (bmi) => {
  const category = getBMICategory(bmi);
  return BMI_RANGES[category];
};

// Format numbers
export const formatNumber = (num) => {
  return new Intl.NumberFormat('en-US').format(num);
};

export const formatDecimal = (num, decimals = 2) => {
  return parseFloat(num).toFixed(decimals);
};

export const formatPercentage = (value, total) => {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
};

// Format nutrition values
export const formatNutrition = (value, unit) => {
  return `${formatDecimal(value)}${unit}`;
};

// Capitalize strings
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const capitalizeWords = (str) => {
  if (!str) return '';
  return str
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ');
};

// Format risk level display
export const formatRiskLevel = (level) => {
  return capitalizeWords(level.replace(/_/g, ' '));
};

// Get trend indicator
export const getTrendIndicator = (current, previous) => {
  if (current > previous) return { icon: 'TrendingUp', color: 'text-red-500' };
  if (current < previous) return { icon: 'TrendingDown', color: 'text-green-500' };
  return { icon: 'Minus', color: 'text-gray-500' };
};

export const getTrendValue = (current, previous) => {
  const diff = current - previous;
  const percentage = ((diff / previous) * 100).toFixed(1);
  const sign = diff > 0 ? '+' : '';
  return `${sign}${percentage}%`;
};

// Phone number formatting (for future use)
export const formatPhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  }
  return phone;
};

// Student age calculation
export const calculateAge = (dateOfBirth) => {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};
