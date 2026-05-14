import React from 'react';
import { RISK_COLORS } from '../../utils/constants.js';

/**
 * Badge Component - Status indicator
 * Variants: danger, warning, success, info, default
 */
function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const variantClasses = {
    danger:
      'bg-red-500/20 text-red-400 border border-red-500/50 rounded-full font-medium',
    warning:
      'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 rounded-full font-medium',
    success:
      'bg-green-500/20 text-green-400 border border-green-500/50 rounded-full font-medium',
    info: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50 rounded-full font-medium',
    default:
      'bg-slate-600/30 text-slate-200 border border-slate-500/50 rounded-full font-medium',
  };

  const classes = `inline-block ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}

export function RiskBadge({ level = 'healthy', className = '' }) {
  const riskColor = RISK_COLORS[level];
  if (!riskColor) {
    return <Badge variant="default">Unknown</Badge>;
  }

  return (
    <span
      className={`inline-block px-3 py-1.5 text-sm font-medium rounded-full ${riskColor.bg} ${riskColor.text} border ${riskColor.border} ${className}`}
    >
      {level.replace('_', ' ').toUpperCase()}
    </span>
  );
}

export default Badge;
