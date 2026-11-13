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
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    const dateStr = d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timeStr = d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    return `${dateStr}, ${timeStr} IST`;
  } catch {
    return 'N/A';
  }
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
export const getBMICategory = (bmi, age = null) => {
  if (bmi === null || bmi === undefined) return 'unknown';
  const numBmi = parseFloat(bmi);
  const numAge = age ? Number(age) : 10;
  
  // Pediatric age-appropriate screening thresholds (WHO 5-19 reference approximations)
  const thinnessThreshold = numAge <= 10 ? 13.5 : 15.0;
  const overweightThreshold = numAge <= 10 ? 19.0 : 22.0;

  if (numBmi < thinnessThreshold) return 'thinness';
  if (numBmi > overweightThreshold) return 'overweight';
  return 'normal';
};

// Get BMI status
export const getBMIStatus = (bmi, age = null) => {
  const category = getBMICategory(bmi, age);
  return BMI_RANGES[category] || BMI_RANGES.normal;
};

// Format pediatric BMI screening label
export const formatPediatricScreening = (bmi, age, gender) => {
  if (!bmi) return 'Pending screening';
  const status = getBMIStatus(bmi, age);
  return `${status.label} (Screening indicator)`;
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
