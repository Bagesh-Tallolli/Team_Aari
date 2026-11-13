import axios from 'axios';
import { STORAGE_KEYS } from '../utils/constants.js';

// ============================================
// REQUEST CACHE & DEDUPLICATION LAYER
// ============================================

// Cache for GET request responses with TTL
const requestCache = new Map();
// Track in-flight requests to deduplicate
const inFlightRequests = new Map();

const CACHE_TTL = {
  students: 30000,      // 30 seconds
  health: 30000,        // 30 seconds
  foodLogs: 20000,      // 20 seconds
  dietPlans: 60000,     // 60 seconds
  analytics: 120000,    // 2 minutes
  default: 30000,       // 30 seconds
};

/**
 * Get cache TTL for a given endpoint
 */
function getCacheTTL(url) {
  if (url.includes('/students')) return CACHE_TTL.students;
  if (url.includes('/health')) return CACHE_TTL.health;
  if (url.includes('/food-log') && !url.includes('POST')) return CACHE_TTL.foodLogs;
  if (url.includes('/diet-plan')) return CACHE_TTL.dietPlans;
  if (url.includes('/analytics')) return CACHE_TTL.analytics;
  return CACHE_TTL.default;
}

/**
 * Generate cache key from URL and params
 */
function getCacheKey(url, params = {}) {
  const paramStr = Object.entries(params)
    .sort()
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `${url}${paramStr ? '?' + paramStr : ''}`;
}

/**
 * Get cached response if valid
 */
function getCachedResponse(cacheKey) {
  const cached = requestCache.get(cacheKey);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    requestCache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

/**
 * Set response in cache
 */
function setCachedResponse(cacheKey, data) {
  requestCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    ttl: getCacheTTL(cacheKey),
  });
}

/**
 * Make cached GET request with deduplication
 */
async function cachedRequest(method, url, params = {}, config = {}) {
  if (method !== 'get') {
    // For non-GET requests, don't cache
    return null;
  }

  const cacheKey = getCacheKey(url, params);

  // Check cache first
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    return cached;
  }

  // Check if request is already in-flight
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  // Make request and cache the promise
  const promise = apiClient.get(url, { params, ...config });

  inFlightRequests.set(cacheKey, promise);

  try {
    const response = await promise;
    setCachedResponse(cacheKey, response);
    inFlightRequests.delete(cacheKey);
    return response;
  } catch (error) {
    inFlightRequests.delete(cacheKey);
    throw error;
  }
}

/**
 * Invalidate cache by pattern
 */
function invalidateCache(pattern) {
  if (!pattern) {
    requestCache.clear();
    return;
  }

  for (const key of requestCache.keys()) {
    if (key.includes(pattern)) {
      requestCache.delete(key);
    }
  }
}

// Resolve API base URL from the Vite environment, with a single local default.
// Do not rewrite the configured port here; the backend may already be bound to it.
const apiBaseToUse = (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL !== '')
  ? import.meta.env.VITE_API_BASE_URL
  : 'http://localhost:5001/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: apiBaseToUse,
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000'),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

  // Helpful debug: log actual API base in development
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info('[apiService] Using API base URL:', apiBaseToUse);
  }

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
    (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Request error
    try {
      console.error('[apiService] Request error:', error.message || error);
    } catch {
      /* ignore */
    }
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If 401 Unauthorized, token might have expired
    if (error.response?.status === 401) {
      // Clear expired token from localStorage
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
      // Redirect to login by dispatching custom event
      window.dispatchEvent(new CustomEvent('tokenExpired'));
    }
    return Promise.reject(error);
  }
);

// API Service object with all endpoints
const apiService = {
  // Auth endpoints
  auth: {
    signup: async (email, password, name, role = 'staff', phone = null, school_name = null) => {
      try {
        const payload = typeof email === 'object'
          ? email
          : { email, password, name, role, phone, school_name };
        const response = await apiClient.post('/auth/signup', payload);
        return {
          success: response.data.success,
          data: response.data.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || (error.response?.data?.errors ? error.response.data.errors.map(e => e.message).join(', ') : error.message),
        };
      }
    },

    login: async (email, password) => {
      try {
        const response = await apiClient.post('/auth/login', {
          email,
          password,
        });
        return {
          success: response.data.success,
          data: response.data.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    verify: async () => {
      try {
        const response = await apiClient.get('/auth/verify');
        return {
          success: response.data.success,
          data: response.data.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },
  },

  // Data endpoints (students, food, health status)
  data: {
    // Students
    getAllStudents: async (page = 1, limit = 50) => {
      try {
        const params = { page, limit };
        const response = await cachedRequest('get', '/data/students', params);
        const students = response.data?.data?.students || [];

        // If cached result is empty but server reports rows exist, fetch fresh
        if (students.length === 0 && (response.data?.data?.total || 0) > 0) {
          const freshResponse = await apiClient.get('/data/students', { params });
          setCachedResponse(getCacheKey('/data/students', params), freshResponse);
          return {
            success: true,
            data: Array.isArray(freshResponse.data?.data?.students) ? freshResponse.data.data.students : [],
            total: freshResponse.data?.data?.total || 0,
          };
        }

        return {
          success: true,
          data: Array.isArray(students) ? students : [],
          total: response.data?.data?.total || 0,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
          data: [],
        };
      }
    },

    // Food Logs
    getFoodLogs: async (page = 1, limit = 200) => {
      try {
        const response = await cachedRequest('get', '/data/food-log', { page, limit });
        const foodLogs = response.data?.data?.food_logs || response.data?.data || [];
        return {
          success: true,
          data: Array.isArray(foodLogs) ? foodLogs : [],
          meta: response.data?.data || {},
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
          data: [],
        };
      }
    },

    getFoodLogsByStudent: async (studentId, limit = 50) => {
      try {
        const response = await cachedRequest('get', `/data/food-log/${studentId}`, { limit });
        const foodLogs = response.data?.data || [];
        return {
          success: true,
          data: Array.isArray(foodLogs) ? foodLogs : [],
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
          data: [],
        };
      }
    },

    createFoodLog: async (foodData) => {
      try {
        const response = await apiClient.post('/data/food-log', foodData);
        // Invalidate cache after creating food log
        invalidateCache('food-log');
        invalidateCache('health');
        invalidateCache('diet-plan');
        invalidateCache('analytics');
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    // Health Status
    getHealthStatus: async () => {
      try {
        const response = await cachedRequest('get', '/data/health');
        const healthStatus = response.data?.data?.health_status || response.data?.data || [];
        return {
          success: true,
          data: Array.isArray(healthStatus) ? healthStatus : [],
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
          data: [],
        };
      }
    },

    getHealthStatusByStudent: async (studentId) => {
      try {
        const response = await cachedRequest('get', `/data/health/${studentId}`);
        const healthData = response.data?.data || response.data?.data || null;
        return {
          success: true,
          data: healthData,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
          data: null,
        };
      }
    },

    getAiDietRecommendationsByStudent: async (studentId) => {
      try {
        const response = await cachedRequest('get', `/data/ai-diet-recommendations/${studentId}`);
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
          data: null,
        };
      }
    },

    // Diet Plans
    getDietPlans: async () => {
      try {
        const response = await cachedRequest('get', '/data/diet-plan');
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },
  },

  // Dashboard endpoints
  dashboard: {
    getData: async () => {
      try {
        const response = await apiClient.get('/dashboard');
        return {
          success: true,
          data: response.data.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },
  },

  // Students endpoints (legacy, kept for compatibility)
  students: {
    registerStudent: async (studentData) => {
      try {
        const response = await apiClient.post('/students/register', studentData);
        // Invalidate students cache after registration
        invalidateCache('students');
        return {
          success: true,
          data: response.data?.data || response.data,
          message: response.data?.message || 'Student registered successfully',
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    getAll: async (page = 1, limit = 150, search = null, riskLevel = null) => {
      try {
        const params = { page, limit };
        if (search) params.search = search;
        if (riskLevel) params.riskLevel = riskLevel;
        const response = await cachedRequest('get', '/students', params);
        return {
          success: true,
          data: Array.isArray(response.data?.data?.students) ? response.data.data.students : response.data?.data || [],
          total: response.data?.data?.total || 0,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
          data: [],
        };
      }
    },

    getById: async (id) => {
      try {
        const response = await cachedRequest('get', `/students/${id}`);
        return {
          success: true,
          data: response.data.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },
    getDetails: async (id) => {
      // Try protected comprehensive endpoint first; if it fails (401/auth), fall back to public /data endpoints
      try {
        const response = await cachedRequest('get', `/students/${id}/details`);
        return {
          success: true,
          data: response.data.data || response.data,
        };
      } catch (error) {
        // If unauthorized or other failure, assemble using public endpoints
        if (error.response?.status === 401 || error.response?.status === 403 || error.code === 'ECONNREFUSED') {
          try {
            const studentsRes = await apiService.data.getAllStudents(1, 500);
            const student = Array.isArray(studentsRes.data) ? studentsRes.data.find(s => String(s.id) === String(id)) : null;

            const healthRes = await apiService.data.getHealthStatusByStudent(id);
            const foodRes = await apiService.data.getFoodLogsByStudent(id);
            const aiDietRes = await apiService.data.getAiDietRecommendationsByStudent(id);

            const payload = {
              student: student || null,
              nutrition_analytics: {
                avg_weekly_calories: healthRes.success && healthRes.data?.avg_weekly_calories ? healthRes.data.avg_weekly_calories : (aiDietRes.success && aiDietRes.data?.avg_weekly_calories ? aiDietRes.data.avg_weekly_calories : 0),
                required_calories: aiDietRes.success && aiDietRes.data?.required_calories ? aiDietRes.data.required_calories : 1800,
              },
              ai_analysis: aiDietRes.success && aiDietRes.data ? aiDietRes.data : (healthRes.success && healthRes.data ? healthRes.data : null),
              food_history: foodRes.success ? (Array.isArray(foodRes.data) ? foodRes.data : []) : [],
            };

            return { success: true, data: payload };
          } catch (fallbackError) {
            return { success: false, error: fallbackError.message || 'Failed to assemble student details' };
          }
        }

        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    getDietRecommendation: async (id) => {
      try {
        const response = await cachedRequest('get', `/students/${id}/diet-recommendation`);
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    generateDietRecommendation: async (id, preference = 'veg') => {
      try {
        const response = await apiClient.post(`/students/${id}/diet-recommendation/generate`, { preference });
        invalidateCache(`students/${id}`);
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    getWeeklyAnalysis: async (id, forceRefresh = false, endDate = null) => {
      try {
        const params = {};
        if (forceRefresh) params.forceRefresh = 'true';
        if (endDate) params.endDate = endDate;
        const response = forceRefresh
          ? await apiClient.get(`/students/${id}/weekly-analysis`, { params })
          : await cachedRequest('get', `/students/${id}/weekly-analysis`, params);
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    generateWeeklyAnalysis: async (id, endDate = null) => {
      try {
        const response = await apiClient.post(`/students/${id}/weekly-analysis/generate`, { endDate });
        invalidateCache(`students/${id}`);
        invalidateCache('weekly-analysis');
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    predictMalnutrition: async (data, studentId = null) => {
      try {
        const url = studentId ? `/students/${studentId}/predict-malnutrition` : '/students/predict-malnutrition';
        const response = await apiClient.post(url, data);
        if (data.save_to_db && studentId) {
          invalidateCache(`students/${studentId}`);
          invalidateCache('students');
        }
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    sendMalnutritionReport: async (id, payload = {}) => {
      try {
        const response = await apiClient.post(`/students/${id}/malnutrition-report/send`, payload);
        invalidateCache(`students/${id}`);
        return {
          success: true,
          data: response.data?.data || response.data,
          message: response.data?.message || 'Malnutrition report sent to parent email',
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    getMalnutritionReportPdfUrl: (id) => {
      const baseUrl = apiClient.defaults.baseURL || 'http://localhost:5001/api';
      return `${baseUrl}/students/${id}/malnutrition-report/pdf`;
    },

    // Parent Contact & Weekly Report Delivery (Phase 7)
    getParentContact: async (id) => {
      try {
        const response = await cachedRequest('get', `/students/${id}/parent-contact`);
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    updateParentContact: async (id, contactData) => {
      try {
        const response = await apiClient.put(`/students/${id}/parent-contact`, contactData);
        invalidateCache(`students/${id}`);
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    previewWeeklyReport: async (id) => {
      try {
        const response = await apiClient.get(`/students/${id}/weekly-report/preview`);
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    sendWeeklyReport: async (id, forceResend = false) => {
      try {
        const response = await apiClient.post(`/students/${id}/weekly-report/send`, { forceResend });
        invalidateCache(`students/${id}`);
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    getDeliveryHistory: async (id) => {
      try {
        const response = await cachedRequest('get', `/students/${id}/weekly-report/delivery-history`);
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    sendParentVerification: async (id) => {
      try {
        const response = await apiClient.post(`/students/${id}/parent-contact/send-verification`);
        return {
          success: true,
          data: response.data?.data || response.data,
          message: response.data?.message,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    verifyParentOtp: async (id, otpCode) => {
      try {
        const response = await apiClient.post(`/students/${id}/parent-contact/verify-otp`, { otp_code: otpCode });
        invalidateCache(`students/${id}`);
        return {
          success: true,
          data: response.data?.data || response.data,
          message: response.data?.message,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    withdrawParentConsent: async (id, reason = 'Withdrawn by user') => {
      try {
        const response = await apiClient.post(`/students/${id}/parent-contact/withdraw-consent`, { reason });
        invalidateCache(`students/${id}`);
        return {
          success: true,
          data: response.data?.data || response.data,
          message: response.data?.message,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    getConsentHistory: async (id) => {
      try {
        const response = await cachedRequest('get', `/students/${id}/parent-contact/consent-history`);
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    getPdfUrl: (id) => `/api/students/${id}/weekly-report/pdf`,
  },

  // Diet Recommendations (Phase 5)
  dietRecommendations: {
    get: async (studentId) => {
      try {
        const response = await cachedRequest('get', `/diet-recommendations/${studentId}`);
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },
    generate: async (studentId, preference = 'veg') => {
      try {
        const response = await apiClient.post(`/diet-recommendations/${studentId}/generate`, { preference });
        invalidateCache(`students/${studentId}`);
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },
  },

  // Weekly Nutrition Analysis (Phase 6)
  weeklyAnalysis: {
    getByStudent: async (studentId, forceRefresh = false, endDate = null) => {
      return apiService.students.getWeeklyAnalysis(studentId, forceRefresh, endDate);
    },
    generate: async (studentId, endDate = null) => {
      return apiService.students.generateWeeklyAnalysis(studentId, endDate);
    },
    getById: async (reportId) => {
      try {
        const response = await cachedRequest('get', `/weekly-analysis/${reportId}`);
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },
    getTrends: async (reportId) => {
      try {
        const response = await cachedRequest('get', `/weekly-analysis/${reportId}/trends`);
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },
  },

  // Parent Report Deliveries (Phase 7)
  parentDelivery: {
    getContact: async (studentId) => apiService.students.getParentContact(studentId),
    updateContact: async (studentId, data) => apiService.students.updateParentContact(studentId, data),
    preview: async (studentId) => apiService.students.previewWeeklyReport(studentId),
    send: async (studentId, forceResend = false) => apiService.students.sendWeeklyReport(studentId, forceResend),
    getHistory: async (studentId) => apiService.students.getDeliveryHistory(studentId),
    getPdfUrl: (studentId) => apiService.students.getPdfUrl(studentId),
    sendVerification: async (studentId) => apiService.students.sendParentVerification(studentId),
    verifyOtp: async (studentId, otp) => apiService.students.verifyParentOtp(studentId, otp),
    withdrawConsent: async (studentId, reason) => apiService.students.withdrawParentConsent(studentId, reason),
    getConsentHistory: async (studentId) => apiService.students.getConsentHistory(studentId),
    getDeliveryById: async (deliveryId) => {
      try {
        const response = await cachedRequest('get', `/parent-report-deliveries/${deliveryId}`);
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },
  },

  // Food Log endpoints (legacy, kept for compatibility)
  foodLogs: {
    create: async (foodData) => {
      try {
        const response = await apiClient.post('/data/food-log', foodData);
        // Invalidate cache after creating
        invalidateCache('food-log');
        invalidateCache('health');
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    getByStudentId: async (studentId) => {
      try {
        const response = await cachedRequest('get', `/data/food-log/${studentId}`);
        return {
          success: true,
          data: response.data.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },
  },

  // Alerts endpoints
  alerts: {
    getAll: async (riskLevel = 'all') => {
      try {
        const response = await apiClient.get('/alerts', {
          params: { riskLevel },
        });
        return {
          success: true,
          data: response.data.data || response.data,
          stats: response.data.stats,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    getStats: async () => {
      try {
        const response = await apiClient.get('/alerts/stats');
        return {
          success: true,
          data: response.data.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    getByStudentId: async (studentId) => {
      try {
        const response = await apiClient.get(`/alerts/student/${studentId}`);
        return {
          success: true,
          data: response.data.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },
  },

  // RFID Scan endpoints
  scan: {
    process: async (rfidCardId) => {
      try {
        const response = await apiClient.post('/scan', {
          rfid_card_id: rfidCardId,
        });
        // Invalidate cache after scan (might update health/diet)
        invalidateCache('food-log');
        invalidateCache('health');
        invalidateCache('diet-plan');
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },
  },

  // Convenience methods for direct use
  scanStudent: async (rfidCardId) => {
    return apiService.scan.process(rfidCardId);
  },

  logFood: async (foodData) => {
    return apiService.data.createFoodLog(foodData);
  },

  // Analytics endpoints
  analytics: {
    getMonthly: async (studentId) => {
      try {
        const response = await cachedRequest('get', `/analytics/monthly/${studentId}`);
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    getMonthlyDetailed: async (studentId) => {
      try {
        const response = await cachedRequest('get', `/analytics/monthly/${studentId}/detailed`);
        return {
          success: true,
          data: response.data?.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },

    get: async (timeRange = '6m') => {
      try {
        const response = await cachedRequest('get', '/analytics', { timeRange });
        return {
          success: true,
          data: response.data.data || response.data,
        };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
        };
      }
    },
  },

  // Health check
  health: async () => {
    try {
      const response = await apiClient.get('/health');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  },

  // AI endpoints
  ai: {
    runBatch: async () => {
      try {
        const response = await apiClient.post('/ai/batch');
        // invalidate relevant caches
        invalidateCache('health');
        invalidateCache('diet-plan');
        invalidateCache('students');
        return { success: true, data: response.data?.data || response.data };
      } catch (error) {
        return { success: false, error: error.response?.data?.message || error.message };
      }
    },
  },

  // Cache management utilities
  cache: {
    invalidate: invalidateCache,
    clear: () => invalidateCache(null),
  },
};

export default apiService;
export { invalidateCache };
