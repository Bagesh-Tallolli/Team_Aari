const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

type ApiResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

const getToken = () => localStorage.getItem('auth_token');

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const token = getToken();
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const json = await response.json();

    if (!response.ok) {
      return { success: false, error: json?.message || 'Request failed' };
    }

    return { success: true, data: json?.data ?? json };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Network error' };
  }
}

export async function getStudents() {
  return request<any[]>('/data/students?limit=200');
}

export async function getHealth() {
  return request<any[]>('/data/health?limit=500');
}

export async function getDietPlan(studentId?: number) {
  return request<any>(studentId ? `/data/diet-plan/${studentId}` : '/data/diet-plan');
}

export async function scanStudent(studentId: number) {
  return request<any>('/scan', {
    method: 'POST',
    body: JSON.stringify({ student_id: studentId }),
  });
}

export async function logFood(payload: { student_id: number; food_item: string; served_grams: number }) {
  return request<any>('/data/food-log', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
