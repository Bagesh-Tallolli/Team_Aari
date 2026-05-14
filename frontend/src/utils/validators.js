// Form validation rules

export const validators = {
  email: {
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Invalid email address',
    },
    required: 'Email is required',
  },

  password: {
    required: 'Password is required',
    minLength: {
      value: 6,
      message: 'Password must be at least 6 characters',
    },
  },

  name: {
    required: 'Name is required',
    minLength: {
      value: 2,
      message: 'Name must be at least 2 characters',
    },
    maxLength: {
      value: 50,
      message: 'Name cannot exceed 50 characters',
    },
  },

  age: {
    required: 'Age is required',
    min: {
      value: 5,
      message: 'Age must be at least 5',
    },
    max: {
      value: 120,
      message: 'Age cannot exceed 120',
    },
  },

  height: {
    required: 'Height is required',
    min: {
      value: 50,
      message: 'Height must be at least 50 cm',
    },
    max: {
      value: 250,
      message: 'Height cannot exceed 250 cm',
    },
  },

  weight: {
    required: 'Weight is required',
    min: {
      value: 10,
      message: 'Weight must be at least 10 kg',
    },
    max: {
      value: 500,
      message: 'Weight cannot exceed 500 kg',
    },
  },

  quantity: {
    required: 'Quantity is required',
    min: {
      value: 0,
      message: 'Quantity cannot be negative',
    },
  },
};

// Custom validation functions

export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const validatePassword = (password) => {
  return password && password.length >= 6;
};

export const validateAge = (age) => {
  const ageNum = parseInt(age, 10);
  return ageNum >= 5 && ageNum <= 120;
};

export const validateHeight = (height) => {
  const heightNum = parseFloat(height);
  return heightNum >= 50 && heightNum <= 250;
};

export const validateWeight = (weight) => {
  const weightNum = parseFloat(weight);
  return weightNum >= 10 && weightNum <= 500;
};

export const validateBMI = (bmi) => {
  const bmiNum = parseFloat(bmi);
  return bmiNum > 0 && bmiNum < 100;
};

export const validateRequired = (value) => {
  if (typeof value === 'string') {
    return value && value.trim().length > 0;
  }
  return value !== null && value !== undefined;
};

export const validateMinLength = (value, minLength) => {
  return value && value.length >= minLength;
};

export const validateMaxLength = (value, maxLength) => {
  return !value || value.length <= maxLength;
};

export const validateNumberRange = (value, min, max) => {
  const num = parseFloat(value);
  return num >= min && num <= max;
};

// Async validators (for API calls)

export const validateEmailUnique = async (email) => {
  try {
    // This would call the backend API
    // const response = await fetch(`/api/validate/email?email=${email}`);
    // return response.ok;
    return true; // Mock for now
  } catch (error) {
    return false;
  }
};
