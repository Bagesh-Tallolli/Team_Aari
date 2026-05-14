import React from 'react';

/**
 * Skeleton Component - Loading placeholder
 */
function Skeleton({ width = 'w-full', height = 'h-4', className = '' }) {
  return (
    <div
      className={`${width} ${height} bg-slate-700/40 rounded-lg animate-pulse ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <Skeleton width="w-3/4" height="h-6" />
      <Skeleton width="w-full" height="h-4" />
      <Skeleton width="w-5/6" height="h-4" />
      <Skeleton width="w-full" height="h-4" />
      <Skeleton width="w-4/6" height="h-4" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="glass rounded-lg p-4 flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} width="w-1/4" height="h-4" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <Skeleton width="w-1/3" height="h-6" />
      <div className="space-y-2">
        <Skeleton width="w-full" height="h-40" />
      </div>
    </div>
  );
}

export default Skeleton;
