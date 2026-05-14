import { useState, useEffect } from 'react';
import apiService from '../../../services/apiService.js';

export function useDashboardData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [studentsResult, healthResult, foodLogsResult] = await Promise.all([
          apiService.data.getAllStudents(),
          apiService.data.getHealthStatus(),
          apiService.data.getFoodLogs(1, 500),
        ]);

        if (studentsResult.success && healthResult.success && foodLogsResult.success) {
          const students = studentsResult.data || [];
          const healthStatuses = healthResult.data || [];
          const foodLogs = foodLogsResult.data || [];

          const studentsById = new Map(students.map((s) => [s.id, s]));

          const totalStudents = students.length;
          const today = new Date().toDateString();
          const mealsServedToday = foodLogs.filter((log) => {
            const dt = new Date(log.logged_at || log.created_at || 0);
            return dt.toDateString() === today;
          }).length;

          const atRiskCount = healthStatuses.filter((h) => {
            const status = (h.status || '').toLowerCase();
            return status && status !== 'healthy';
          }).length;

          const avgBmi = healthStatuses.length > 0
            ? (healthStatuses.reduce((sum, h) => sum + (parseFloat(h.bmi) || 0), 0) / healthStatuses.length).toFixed(1)
            : 0;

          const healthyCount = healthStatuses.filter((h) => h.status?.toLowerCase() === 'healthy').length;
          const atRiskHealthCount = healthStatuses.filter((h) => h.status?.toLowerCase() === 'at risk').length;
          const underweightCount = healthStatuses.filter((h) => h.status?.toLowerCase() === 'underweight').length;

          const calorieAgg = new Map();
          for (const log of foodLogs) {
             const dt = new Date(log.logged_at || log.created_at || 0).toDateString();
             calorieAgg.set(dt, (calorieAgg.get(dt) || 0) + (parseFloat(log.estimated_calories) || 0));
          }
          const recentHealth = Array.from(calorieAgg.entries())
            .sort((a, b) => new Date(a[0]) - new Date(b[0]))
            .slice(-7)
            .map(([date, value]) => ({
              date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              value: Math.round(value),
            }));

          const foodIntakeAgg = new Map();
          for (const log of foodLogs) {
            const key = (log.food_item || 'unknown').toLowerCase();
            if (!foodIntakeAgg.has(key)) {
              foodIntakeAgg.set(key, { name: key, required: 0, actual: 0 });
            }
            const curr = foodIntakeAgg.get(key);
            curr.actual += parseFloat(log.served_grams || 0);
            curr.required += parseFloat(log.served_grams || 0);
          }
          const foodIntake = Array.from(foodIntakeAgg.values())
            .slice(0, 6)
            .map((item) => ({
              ...item,
              name: item.name.charAt(0).toUpperCase() + item.name.slice(1),
            }));

          const recentActivities = [...foodLogs]
            .sort((a, b) => new Date(b.logged_at || b.created_at || 0) - new Date(a.logged_at || a.created_at || 0))
            .slice(0, 8)
            .map((log) => ({
              id: `meal-${log.id}`,
              type: 'meal_served',
              studentName: studentsById.get(log.student_id)?.name || `Student ${log.student_id}`,
              quantity: `${parseFloat(log.served_grams || 0)}g`,
              foodName: log.food_item,
              timestamp: log.logged_at || log.created_at,
            }));

          const alertActivities = [...healthStatuses]
            .filter((h) => (h.status || '').toLowerCase() !== 'healthy')
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
            .slice(0, 5)
            .map((h) => ({
              id: `alert-${h.id}`,
              type: 'alert',
              studentName: studentsById.get(h.student_id)?.name || `Student ${h.student_id}`,
              message: `${h.status} detected (BMI ${parseFloat(h.bmi || 0).toFixed(1)})`,
              severity: (h.status || '').toLowerCase() === 'underweight' ? 'critical' : 'at_risk',
              timestamp: h.created_at,
            }));

          const activityFeed = [...recentActivities, ...alertActivities]
            .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
            .slice(0, 10);

          const dashboardData = {
            kpis: [
              {
                id: 1,
                title: 'Total Students',
                value: totalStudents,
                trend: 0,
                icon: 'Users',
                color: 'indigo',
              },
              {
                id: 2,
                title: 'Total Scans Today',
                value: mealsServedToday,
                trend: 0,
                icon: 'Activity',
                color: 'green',
              },
              {
                id: 3,
                title: 'Underweight Students',
                value: underweightCount,
                trend: 0,
                icon: 'AlertTriangle',
                color: 'red',
              },
              {
                id: 4,
                title: 'Avg BMI',
                value: parseFloat(avgBmi),
                trend: 0,
                icon: 'Activity',
                color: 'yellow',
              },
            ],
            riskDistribution: [
              { name: 'Healthy', value: healthyCount, fill: '#10b981' },
              { name: 'At Risk', value: atRiskHealthCount, fill: '#f59e0b' },
              { name: 'Underweight', value: underweightCount, fill: '#ef4444' },
            ],
            calorieTrends: recentHealth,
            foodIntake,
            activityFeed,
          };

          setData(dashboardData);
          setError(null);
        } else {
          throw new Error('Failed to fetch dashboard data');
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
}
