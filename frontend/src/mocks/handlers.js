import { http, HttpResponse } from 'msw';
import { mockStudents, mockFoodLogs } from './data/studentsData.js';
import { mockDashboardData } from './data/dashboardData.js';
import { mockAlerts } from './data/alertsData.js';
import { mockAnalyticsData } from './data/analyticsData.js';

// Simulated delay for realistic experience
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const handlers = [
  // Auth endpoints
  http.post('/api/auth/login', async ({ request }) => {
    await delay(800);
    const body = await request.json();

    // Simple validation
    if (body.email && body.password) {
      return HttpResponse.json(
        {
          success: true,
          token: 'mock_token_' + Date.now(),
          userId: 1,
          email: body.email,
          name: 'Admin User',
          role: 'admin',
          avatar: 'AU',
        },
        { status: 200 }
      );
    }

    return HttpResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  // Dashboard endpoints
  http.get('/api/dashboard', async () => {
    await delay(600);
    return HttpResponse.json(mockDashboardData, { status: 200 });
  }),

  // Students endpoints
  http.get('/api/students', async ({ request }) => {
    await delay(500);
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const riskLevel = url.searchParams.get('riskLevel');

    let filtered = [...mockStudents];

    if (search) {
      filtered = filtered.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (riskLevel && riskLevel !== 'all') {
      filtered = filtered.filter((s) => s.riskLevel === riskLevel);
    }

    return HttpResponse.json(
      { success: true, data: filtered, total: mockStudents.length },
      { status: 200 }
    );
  }),

  http.get('/api/students/:id', async ({ params }) => {
    await delay(500);
    const student = mockStudents.find((s) => s.id === parseInt(params.id));

    if (!student) {
      return HttpResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    const foodLogs = mockFoodLogs[student.id] || [];

    return HttpResponse.json(
      {
        success: true,
        data: {
          ...student,
          foodLogs,
          nutrition: {
            proteinDaily: 50,
            proteinConsumed: foodLogs.reduce((sum, log) => sum + log.protein, 0),
            caloriesDaily: 2000,
            caloriesConsumed: foodLogs.reduce((sum, log) => sum + log.calories, 0),
          },
        },
      },
      { status: 200 }
    );
  }),

  // Alerts endpoints
  http.get('/api/alerts', async ({ request }) => {
    await delay(400);
    const url = new URL(request.url);
    const riskLevel = url.searchParams.get('riskLevel');

    let filtered = [...mockAlerts];

    if (riskLevel && riskLevel !== 'all') {
      filtered = filtered.filter((a) => a.riskLevel === riskLevel);
    }

    return HttpResponse.json(
      {
        success: true,
        data: filtered,
        stats: {
          critical: filtered.filter((a) => a.riskLevel === 'critical').length,
          at_risk: filtered.filter((a) => a.riskLevel === 'at_risk').length,
          healthy: filtered.filter((a) => a.riskLevel === 'healthy').length,
        },
      },
      { status: 200 }
    );
  }),

  // Analytics endpoints
  http.get('/api/analytics', async ({ request }) => {
    await delay(700);
    const url = new URL(request.url);
    const timeRange = url.searchParams.get('timeRange') || '6m';

    return HttpResponse.json(
      {
        success: true,
        data: mockAnalyticsData,
        timeRange,
      },
      { status: 200 }
    );
  }),

  // Health check
  http.get('/api/health', async () => {
    return HttpResponse.json(
      { success: true, message: 'API is running' },
      { status: 200 }
    );
  }),
];
