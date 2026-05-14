import React, { useState } from 'react';
import MainLayout from '../../../components/layout/MainLayout.jsx';
import Card from '../../../components/common/Card.jsx';
import ChartWrapper from '../../../components/common/ChartWrapper.jsx';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { SkeletonChart } from '../../../components/common/Skeleton.jsx';
import { useAnalyticsData } from '../hooks/useAnalyticsData.js';
import apiService from '../../../services/apiService.js';

function AnalyticsPage() {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const { data, loading, error } = useAnalyticsData(selectedStudent);

  React.useEffect(() => {
    const fetchStudents = async () => {
      try {
        // page=1, limit=50
        const result = await apiService.data.getAllStudents(1, 50);
        if (result.success) {
          setStudents(result.data || []);
          if (result.data && result.data.length > 0) {
            setSelectedStudent(result.data[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching students:', err);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, []);

  if (loading || loadingStudents) {
    return (
      <MainLayout>
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonChart key={i} />
          ))}
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Card variant="default" className="bg-red-900/20 border border-red-700 text-red-200 p-4">
          Error: {error}
        </Card>
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-slate-400">Failed to load analytics data</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fadeIn">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="text-slate-400 mt-1">Nutrition trends and insights</p>
        </div>

        {/* Student Selector */}
        <div className="flex gap-4 items-center">
          <label className="text-slate-300 font-medium">Select Student:</label>
          <select
            value={selectedStudent || ''}
            onChange={(e) => setSelectedStudent(parseInt(e.target.value))}
            className="px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg focus:border-indigo-500 focus:outline-none"
          >
            <option value="">-- Choose a student --</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </div>

        {/* Summary Cards */}
        {data.summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <div className="p-4">
                <p className="text-slate-400 text-sm">Avg Calories</p>
                <p className="text-2xl font-bold text-white mt-2">
                  {Math.round(data.summary.avgCalories)}
                </p>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <p className="text-slate-400 text-sm">Avg Protein (g)</p>
                <p className="text-2xl font-bold text-white mt-2">
                  {Math.round(data.summary.avgProtein)}
                </p>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <p className="text-slate-400 text-sm">Avg BMI</p>
                <p className="text-2xl font-bold text-white mt-2">
                  {(data.summary.avgBmi).toFixed(1)}
                </p>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <p className="text-slate-400 text-sm">Records (30d)</p>
                <p className="text-2xl font-bold text-white mt-2">
                  {data.summary.recordCount}
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Nutrition Trends */}
        <ChartWrapper
          title="Nutrition Trends"
          subtitle="Protein, calories, carbs, and fats over time (30 days)"
        >
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data.nutritionTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid #4f46e5',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Line type="monotone" dataKey="protein" stroke="#4F46E5" strokeWidth={2} />
              <Line type="monotone" dataKey="calories" stroke="#22C55E" strokeWidth={2} />
              <Line type="monotone" dataKey="carbs" stroke="#F59E0B" strokeWidth={2} />
              <Line type="monotone" dataKey="fats" stroke="#EF4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartWrapper>

        {/* Risk Trend */}
        <ChartWrapper
          title="Risk Distribution Trend"
          subtitle="Student population by risk level over time"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.riskTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid #4f46e5',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Bar dataKey="healthy" fill="#22C55E" fillOpacity={0.8} />
              <Bar dataKey="atRisk" fill="#F59E0B" fillOpacity={0.8} />
              <Bar dataKey="critical" fill="#EF4444" fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>

        {/* Student Comparison */}
        <ChartWrapper
          title="Student Nutrition Comparison"
          subtitle="BMI and protein intake"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.studentComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid #4f46e5',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Bar dataKey="bmi" fill="#4F46E5" fillOpacity={0.8} />
              <Bar dataKey="protein" fill="#22C55E" fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>
    </MainLayout>
  );
}

export default AnalyticsPage;
