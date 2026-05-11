import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted';
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  className = '',
  children,
  ...rest
}) => (
  <div
    {...rest}
    className={
      'rounded-2xl border ' +
      (variant === 'default'
        ? 'bg-[#FAF7F0] border-[#E8DCC9] shadow-[0_1px_2px_rgba(28,24,20,0.04),0_4px_12px_-4px_rgba(28,24,20,0.06)] '
        : 'bg-[#F2EBE0]/50 border-[#E8DCC9]/70 ') +
      className
    }
  >
    {children}
  </div>
);
