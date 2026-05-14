import React from 'react';

/**
 * Loader Component - Loading spinner
 */
function Loader({ size = 'md', message = 'Loading...' }) {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-12 w-12 border-4',
    lg: 'h-16 w-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={`${sizeClasses[size]} border-indigo-500 border-t-transparent rounded-full animate-spin`}
      />
      {message && <p className="text-slate-300 text-sm">{message}</p>}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="w-full h-screen bg-slate-950 flex items-center justify-center">
      <Loader size="lg" message="Loading..." />
    </div>
  );
}

export default Loader;
