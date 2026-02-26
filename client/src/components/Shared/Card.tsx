import React from 'react';

export interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  hover = false,
  padding = 'md'
}) => {
  const paddings: Record<string, string> = {
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  const classes = [
    'card animate-fade-in',
    paddings[padding],
    hover ? 'hover:shadow-glow-ocean hover:border-ocean-500/20 cursor-pointer' : '',
    className,
  ].join(' ');

  return (
    <div className={classes}>
      {title && (
        <div className="mb-4">
          <h3 className="text-base font-semibold t-text">{title}</h3>
          {subtitle && <p className="text-sm t-text-2 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};
