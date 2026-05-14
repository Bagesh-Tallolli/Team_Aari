import React, { useState, useEffect } from 'react';
import MainLayout from '../../../components/layout/MainLayout.jsx';
import Card from '../../../components/common/Card.jsx';
import { RiskBadge } from '../../../components/common/Badge.jsx';
import { SkeletonCard } from '../../../components/common/Skeleton.jsx';
import { formatRelativeTime } from '../../../utils/formatters.js';
import apiService from '../../../services/apiService.js';

function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch students and health data
        const studentsResult = await apiService.data.getAllStudents();
        const healthResult = await apiService.data.getHealthStatus();

        if (studentsResult.success && healthResult.success) {
          const students = studentsResult.data || [];
          const healthStatuses = healthResult.data || [];

          // Create alerts from health statuses
          const generatedAlerts = healthStatuses
            .map((health) => {
              const student = students.find((s) => s.id === health.student_id);
              const status = health.status?.toLowerCase();
              
              let riskLevel = 'healthy';
              let message = 'Student is in good health';

              if (status === 'underweight') {
                riskLevel = 'critical';
                message = `Underweight status: BMI ${parseFloat(health.bmi).toFixed(1)}`;
              } else if (status === 'at risk') {
                riskLevel = 'at_risk';
                message = `At-risk status: BMI ${parseFloat(health.bmi).toFixed(1)}`;
              }

              return {
                id: health.id,
                studentName: student?.name || 'Unknown Student',
                studentId: health.student_id,
                bmi: health.bmi,
                calories: health.calories,
                protein: health.protein,
                riskLevel,
                message,
                timestamp: health.created_at || new Date().toISOString(),
              };
            })
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

          // Filter alerts
          let filtered = generatedAlerts;
          if (filter !== 'all') {
            filtered = generatedAlerts.filter((alert) => alert.riskLevel === filter);
          }

          setAlerts(filtered);
        } else {
          setError('Failed to fetch alerts');
          setAlerts([]);
        }
      } catch (err) {
        console.error('Error fetching alerts:', err);
        setError(err.message);
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [filter]);

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fadeIn">
        <div>
          <h1 className="text-3xl font-bold text-white">Alerts</h1>
          <p className="text-slate-400 mt-1">Monitor student nutrition alerts</p>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'critical', 'at_risk', 'healthy'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>

        {error && (
          <Card variant="default" className="bg-red-900/20 border border-red-700 text-red-200 p-4">
            Error: {error}
          </Card>
        )}

        {/* Alerts List */}
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <Card variant="default" className="text-center py-12">
              <p className="text-slate-400">No alerts found</p>
            </Card>
          ) : (
            alerts.map((alert) => (
              <Card
                key={alert.id}
                variant={alert.riskLevel === 'critical' ? 'alert' : 'default'}
                className="flex items-start justify-between p-6"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-white">
                      {alert.studentName}
                    </h3>
                    <RiskBadge level={alert.riskLevel} />
                  </div>
                  <p className="text-slate-300">{alert.message}</p>
                  <div className="text-xs text-slate-500 mt-2 space-y-1">
                    <p>BMI: {parseFloat(alert.bmi).toFixed(1)}</p>
                    <p>{formatRelativeTime(alert.timestamp)}</p>
                  </div>
                </div>
                <button className="px-4 py-2 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition-colors text-sm font-medium whitespace-nowrap ml-4">
                  View Profile
                </button>
              </Card>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default AlertsPage;
