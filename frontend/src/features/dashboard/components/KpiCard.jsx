import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Card from '../../../components/common/Card.jsx';

function KpiCard({ title, value, trend, icon: IconComponent, color = 'indigo' }) {
  const colorClasses = {
    indigo: 'text-indigo-400 bg-indigo-500/10',
    green: 'text-green-400 bg-green-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    red: 'text-red-400 bg-red-500/10',
  };

  const trendPositive = trend >= 0;

  return (
    <Card variant="default" className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <div className="mt-3 flex items-baseline gap-3">
          <h3 className="text-3xl font-bold text-white">
            {typeof value === 'number' && value > 100 ? value.toLocaleString() : value}
          </h3>
          <div className={`flex items-center gap-1 text-sm font-semibold ${trendPositive ? 'text-green-400' : 'text-red-400'}`}>
            {trendPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{trend > 0 ? '+' : ''}{trend}%</span>
          </div>
        </div>
      </div>

      {/* Icon */}
      {IconComponent && (
        <div className={`p-4 rounded-xl ${colorClasses[color]}`}>
          <IconComponent size={28} />
        </div>
      )}
    </Card>
  );
}

export default KpiCard;
