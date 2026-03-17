// ==========================================================================
//  WELLCARE DESIGN SYSTEM — Card Component
//  resources/js/design-system/components/Card.tsx
// ==========================================================================

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  hover?: boolean;
  elevated?: boolean;
  flat?: boolean;
  accentLeft?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface CardSectionProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  hover = false,
  elevated = false,
  flat = false,
  accentLeft = false,
  size = 'md',
  className = '',
}) => {
  const classes = [
    'wc-card',
    hover       ? 'wc-card-hover'        : '',
    elevated    ? 'wc-card-elevated'     : '',
    flat        ? 'wc-card-flat'         : '',
    accentLeft  ? 'wc-card-accent-left'  : '',
    size === 'sm' ? 'wc-card-sm'         : '',
    size === 'lg' ? 'wc-card-lg'         : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classes}>{children}</div>;
};

export const CardHeader: React.FC<CardSectionProps> = ({ children, className = '' }) => (
  <div className={`wc-card-header ${className}`}>{children}</div>
);

export const CardBody: React.FC<CardSectionProps> = ({ children, className = '' }) => (
  <div className={`wc-card-body ${className}`}>{children}</div>
);

export const CardFooter: React.FC<CardSectionProps> = ({ children, className = '' }) => (
  <div className={`wc-card-footer ${className}`}>{children}</div>
);