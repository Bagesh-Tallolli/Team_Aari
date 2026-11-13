import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import ChartWrapper from '../../../components/common/ChartWrapper.jsx';

function RiskDistributionChart({ data }) {
  return (
    <ChartWrapper
      title="Risk Distribution"
      subtitle="Student population by risk level"
    >
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={({ value }) => value > 0}
            label={({ name, value }) => value > 0 ? `${name} (${value})` : ''}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data?.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              border: '1px solid #4f46e5',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

export default RiskDistributionChart;
