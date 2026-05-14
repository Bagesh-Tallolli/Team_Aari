import React from 'react';
import { Activity, TrendingUp, AlertTriangle } from 'lucide-react';

function AIHealthStatus({ status, confidence, reason }) {
  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'healthy':
        return {
          bg: 'bg-green-500/10',
          border: 'border-green-500/50',
          text: 'text-green-400',
          badge: 'bg-green-500/20',
          icon: 'text-green-400'
        };
      case 'at risk':
      case 'at_risk':
        return {
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/50',
          text: 'text-yellow-400',
          badge: 'bg-yellow-500/20',
          icon: 'text-yellow-400'
        };
      case 'underweight':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/50',
          text: 'text-red-400',
          badge: 'bg-red-500/20',
          icon: 'text-red-400'
        };
      default:
        return {
          bg: 'bg-slate-500/10',
          border: 'border-slate-500/50',
          text: 'text-slate-400',
          badge: 'bg-slate-500/20',
          icon: 'text-slate-400'
        };
    }
  };

  const colors = getStatusColor(status);
  const confidencePercent = confidence ? (confidence * 100).toFixed(1) : 0;

  return (
    <div className={`glass rounded-xl p-6 border ${colors.border}`}>
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Activity size={20} className={colors.icon} />
        AI Health Status
      </h3>

      <div className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-full font-semibold ${colors.badge} ${colors.text} text-sm uppercase tracking-wide`}>
            {status || 'Unknown'}
          </div>
          
          {/* Confidence */}
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-400" />
            <span className="text-slate-300 text-sm">Confidence:</span>
            <span className="text-indigo-400 font-bold">{confidencePercent}%</span>
          </div>
        </div>

        {/* Confidence Bar */}
        <div>
          <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                status?.toLowerCase() === 'healthy'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                  : status?.toLowerCase().includes('risk')
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                  : 'bg-gradient-to-r from-red-500 to-pink-500'
              }`}
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>

        {/* Reason/Analysis */}
        {reason && (
          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-2 font-semibold">Analysis</p>
            <p className="text-slate-300 text-sm leading-relaxed">
              {reason}
            </p>
          </div>
        )}

        {/* Status Indicator */}
        <div className={`flex items-start gap-3 p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
          <Activity size={18} className={`flex-shrink-0 mt-0.5 ${colors.text}`} />
          <div>
            <p className={`text-sm font-semibold ${colors.text}`}>
              {status?.toLowerCase() === 'healthy'
                ? '✓ Student is well-nourished'
                : status?.toLowerCase().includes('risk')
                ? '⚠ Requires dietary intervention'
                : '⚠ Needs nutritional support'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIHealthStatus;
