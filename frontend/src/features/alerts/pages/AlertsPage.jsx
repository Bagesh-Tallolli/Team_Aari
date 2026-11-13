import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout.jsx';
import Card from '../../../components/common/Card.jsx';
import { RiskBadge } from '../../../components/common/Badge.jsx';
import { SkeletonCard } from '../../../components/common/Skeleton.jsx';
import { formatRelativeTime } from '../../../utils/formatters.js';
import apiService from '../../../services/apiService.js';
import { CheckCircle2, AlertCircle } from 'lucide-react';

function AlertsPage() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real health alerts from backend endpoint GET /api/alerts
      const result = await apiService.alerts.getAll(filter === 'all' ? null : filter);

      if (result.success && result.data) {
        const rawAlerts = Array.isArray(result.data.alerts)
          ? result.data.alerts
          : Array.isArray(result.data)
            ? result.data
            : [];

        const normalized = rawAlerts.map((a) => ({
          id: a.id,
          studentId: a.student_id,
          studentName: a.student_name || `Student ${a.student_id}`,
          bmi: a.current_bmi ?? a.bmi,
          riskLevel: a.risk_level || 'at_risk',
          severity: a.severity || 'warning',
          message: a.message || 'Health alert generated',
          resolved: a.resolved || false,
          timestamp: a.created_at || new Date().toISOString(),
        }));

        setAlerts(normalized);
        if (result.stats || result.data.stats) {
          setStats(result.stats || result.data.stats);
        }
      } else {
        throw new Error(result.error || 'Failed to fetch alerts');
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError(err.message || 'Error loading alerts from server');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleResolve = async (alertId) => {
    try {
      setResolvingId(alertId);
      const res = await apiService.alerts.resolve(alertId);
      if (res.success) {
        // Remove resolved alert from active list or mark resolved
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      } else {
        alert(res.error || 'Failed to resolve alert');
      }
    } catch (err) {
      alert('Error resolving alert: ' + (err.message || err));
    } finally {
      setResolvingId(null);
    }
  };

  if (loading && alerts.length === 0) {
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Health & Nutrition Alerts</h1>
            <p className="text-slate-400 mt-1">Live alerts aggregated from student screenings and meals</p>
          </div>
          {stats && (
            <div className="flex gap-3 text-xs font-semibold">
              <span className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30">
                Critical: {stats.critical || 0}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                At Risk: {stats.at_risk || 0}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Healthy: {stats.healthy || 0}
              </span>
            </div>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'critical', 'at_risk', 'healthy'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === f
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
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
              <AlertCircle size={40} className="mx-auto text-slate-500 mb-3" />
              <p className="text-slate-300 font-medium">No unresolved alerts for filter: &ldquo;{filter}&rdquo;</p>
              <p className="text-slate-500 text-sm mt-1">All screened students in this category are currently meeting guidelines.</p>
            </Card>
          ) : (
            alerts.map((alert) => (
              <Card
                key={alert.id}
                variant={alert.riskLevel === 'critical' ? 'alert' : 'default'}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-lg font-bold text-white">
                      {alert.studentName}
                    </h3>
                    <RiskBadge level={alert.riskLevel} />
                    <span className="text-xs text-slate-400">
                      ID: #{alert.studentId}
                    </span>
                  </div>
                  <p className="text-slate-300">{alert.message}</p>
                  <div className="text-xs text-slate-400 mt-2 flex gap-4">
                    {alert.bmi != null && (
                      <p>BMI: <span className="text-white font-medium">{parseFloat(alert.bmi).toFixed(1)}</span></p>
                    )}
                    <p>{formatRelativeTime(alert.timestamp)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleResolve(alert.id)}
                    disabled={resolvingId === alert.id}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors text-sm font-medium whitespace-nowrap border border-emerald-500/30 disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    {resolvingId === alert.id ? 'Resolving...' : 'Mark Resolved'}
                  </button>
                  <button
                    onClick={() => navigate(`/students/${alert.studentId}`)}
                    className="px-3.5 py-2 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition-colors text-sm font-medium whitespace-nowrap border border-indigo-500/30"
                  >
                    View Profile
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default AlertsPage;
