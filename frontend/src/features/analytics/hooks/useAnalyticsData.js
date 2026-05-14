import { useState, useEffect } from 'react';
import apiService from '../../../services/apiService.js';

export const useAnalyticsData = (studentId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        const [monthlyResult, detailedResult, healthResult] = await Promise.all([
          apiService.analytics.getMonthly(studentId),
          apiService.analytics.getMonthlyDetailed(studentId),
          apiService.data.getHealthStatus(),
        ]);

        if (monthlyResult.success && detailedResult.success && healthResult.success) {
          const monthly = monthlyResult.data || {};
          const detailed = detailedResult.data || {};

          const studentHealth = (healthResult.data || [])
            .filter((h) => h.student_id === parseInt(studentId, 10))
            .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

          const groupedByDay = studentHealth.reduce((acc, row) => {
            const day = new Date(row.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
            if (!acc[day]) {
              acc[day] = {
                month: day,
                protein: 0,
                calories: 0,
                bmi: 0,
                count: 0,
                carbs: 0,
                fats: 0,
              };
            }
            acc[day].protein += parseFloat(row.protein || 0);
            acc[day].calories += parseFloat(row.calories || 0);
            acc[day].bmi += parseFloat(row.bmi || 0);
            acc[day].count += 1;
            return acc;
          }, {});

          const nutritionTrends = Object.values(groupedByDay)
            .map((d) => {
              const avgCalories = d.count ? d.calories / d.count : 0;
              return {
                month: d.month,
                protein: d.count ? Math.round(d.protein / d.count) : 0,
                calories: d.count ? Math.round(avgCalories) : 0,
                carbs: Math.round((avgCalories * 0.5) / 4),
                fats: Math.round((avgCalories * 0.3) / 9),
                bmi: d.count ? Number((d.bmi / d.count).toFixed(2)) : 0,
              };
            })
            .slice(-12);

          const distribution = detailed.status_distribution || [];
          const statusMap = distribution.reduce((acc, entry) => {
            acc[(entry.status || '').toLowerCase()] = entry.count;
            return acc;
          }, {});

          const riskTrend = nutritionTrends.map((point) => ({
            month: point.month,
            healthy: statusMap.healthy || 0,
            atRisk: statusMap['at risk'] || 0,
            critical: statusMap.underweight || 0,
          }));

          const transformedData = {
            summary: {
              avgCalories: monthly.avg_calories || detailed.summary?.avg_calories || 0,
              avgProtein: monthly.avg_protein || detailed.summary?.avg_protein || 0,
              avgBmi: monthly.avg_bmi || detailed.summary?.avg_bmi || 0,
              recordCount: monthly.record_count || detailed.summary?.total_records || 0,
            },
            nutritionTrends,
            riskTrend,
            studentComparison: [
              {
                name: 'Avg BMI',
                bmi: Number(monthly.avg_bmi || 0),
                protein: Number(monthly.avg_protein || 0),
              },
            ],
          };

          setData(transformedData);
        } else {
          setError('Failed to fetch analytics data');
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [studentId]);

  return { data, loading, error };
};
