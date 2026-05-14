import React from 'react';

/**
 * Card Component - Base glassmorphic card container
 * Supports multiple variants and shadow levels
 */
function Card({
  children,
  className = '',
  variant = 'default',
  shadow = 'lg',
  hover = false,
  onClick = null,
  ...props
}) {
  const baseClasses = 'glass rounded-2xl p-6';

  const variants = {
    default: 'bg-slate-800/40 border border-indigo-500/20',
    elevated: 'bg-slate-800/50 border border-indigo-500/30 shadow-lg',
    alert: 'bg-red-500/10 border border-red-500/50',
    success: 'bg-green-500/10 border border-green-500/50',
  };

  const shadows = {
    sm: 'shadow-md',
    md: 'shadow-lg',
    lg: 'shadow-lg shadow-indigo-500/10',
    xl: 'shadow-2xl shadow-indigo-500/20',
  };

  const hoverClasses = hover
    ? 'hover:bg-slate-800/50 hover:border-indigo-500/40 hover:shadow-indigo-500/20 cursor-pointer transition-all duration-300'
    : '';

  const classes = `${baseClasses} ${variants[variant]} ${shadows[shadow]} ${hoverClasses} ${className}`;

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={classes}
      onClick={onClick}
      {...props}
    >
      {children}
    </Component>
  );
}

export default Card;
