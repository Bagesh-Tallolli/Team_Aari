import React from 'react';
import MainLayout from '../../../components/layout/MainLayout.jsx';
import KpiCard from '../components/KpiCard.jsx';
import BmiTrendChart from '../components/BmiTrendChart.jsx';
import FoodIntakeChart from '../components/FoodIntakeChart.jsx';
import RiskDistributionChart from '../components/RiskDistributionChart.jsx';
import ActivityFeed from '../components/ActivityFeed.jsx';
import RfidServePanel from '../components/RfidServePanel.jsx';
import { SkeletonCard, SkeletonChart } from '../../../components/common/Skeleton.jsx';
import { useDashboardData } from '../hooks/useDashboardData.js';
import {
  Users,
  UtensilsCrossed,
  AlertTriangle,
  Activity,
} from 'lucide-react';

function DashboardPage() {
  const { data, loading } = useDashboardData();
  const [running, setRunning] = React.useState(false);

  const iconMap = {
    Users,
    UtensilsCrossed,
    AlertTriangle,
    Activity,
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          {/* KPI Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>

          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonChart />
            <SkeletonChart />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-slate-400">Failed to load dashboard data</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fadeIn">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Nutrition Monitoring Dashboard</h1>
            <p className="text-slate-400 mt-1">Welcome back! Here's your nutrition monitoring overview.</p>
          </div>
          <div>
            <button
              onClick={async () => {
                try {
                  setRunning(true);
                  const res = await apiService.ai.runBatch();
                  if (!res.success) throw new Error(res.error || 'Batch failed');
                  // simple feedback
                  alert('Batch predictions completed');
                } catch (err) {
                  alert('Batch prediction failed: ' + (err.message || err));
                } finally {
                  setRunning(false);
                }
              }}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              disabled={running}
            >
              {running ? 'Running...' : 'Run AI Predictions'}
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.kpis?.map((kpi) => {
            const Icon = iconMap[kpi.icon];
            return (
              <KpiCard
                key={kpi.id}
                title={kpi.title}
                value={kpi.value}
                trend={kpi.trend}
                icon={Icon}
                color={kpi.color}
              />
            );
          })}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calorie Trend */}
          <BmiTrendChart data={data.calorieTrends} />

          {/* Risk Distribution */}
          <RiskDistributionChart data={data.riskDistribution} />
        </div>

        {/* Food Intake Chart */}
        <FoodIntakeChart data={data.foodIntake} />

        {/* RFID Serving Flow */}
        <RfidServePanel />

        {/* Activity Feed */}
        <ActivityFeed activities={data.activityFeed} />
      </div>
    </MainLayout>
  );
}

export default DashboardPage;
