import React from 'react';

/**
 * ChartWrapper Component - Consistent chart container styling
 */
function ChartWrapper({
  title,
  subtitle = '',
  children,
  className = '',
  controls = null,
}) {
  return (
    <div className={`glass rounded-2xl p-6 ${className}`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {controls && <div className="flex gap-2">{controls}</div>}
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
}

export default ChartWrapper;
