import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ChartWrapper from '../../../components/common/ChartWrapper.jsx';

function FoodIntakeChart({ data }) {
  const chartData = data?.map(item => ({
    name: item.name,
    required: item.required,
    actual: item.actual,
  })) || [];

  return (
    <ChartWrapper
      title="Daily Nutrition Intake"
      subtitle="Required vs Actual consumption"
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
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
          <Bar dataKey="required" fill="#4F46E5" fillOpacity={0.8} />
          <Bar dataKey="actual" fill="#22C55E" fillOpacity={0.8} />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

export default FoodIntakeChart;
