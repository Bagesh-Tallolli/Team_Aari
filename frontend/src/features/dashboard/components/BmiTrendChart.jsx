import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ChartWrapper from '../../../components/common/ChartWrapper.jsx';

function BmiTrendChart({ data }) {
  return (
    <ChartWrapper
      title="Weekly Calorie Trend"
      subtitle="Last 7 days total calories tracking"
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="date" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              border: '1px solid #4f46e5',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#fff' }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#4F46E5"
            strokeWidth={3}
            dot={false}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

export default BmiTrendChart;
