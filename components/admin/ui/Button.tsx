import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variantClass: Record<Variant, string> = {
  primary:
    'bg-[#C2622F] text-white hover:bg-[#A04E22] active:bg-[#843D17] ' +
    'focus-visible:ring-[#C2622F]/40 disabled:bg-[#D6C5AA] disabled:text-[#8B7B6E]',
  secondary:
    'bg-[#FAF7F0] text-[#1C1814] border border-[#D6C5AA] hover:bg-[#F2EBE0] ' +
    'active:bg-[#E8DCC9] focus-visible:ring-[#C2622F]/30 disabled:opacity-50',
  ghost:
    'bg-transparent text-[#3D332C] hover:bg-[#F2EBE0] active:bg-[#E8DCC9] ' +
    'focus-visible:ring-[#C2622F]/30 disabled:opacity-50',
  danger:
    'bg-[#FAF7F0] text-[#B14848] border border-[#F8E1E1] hover:bg-[#F8E1E1] ' +
    'hover:border-[#B14848]/40 active:bg-[#B14848] active:text-white ' +
    'focus-visible:ring-[#B14848]/40 disabled:opacity-50',
};

const sizeClass: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-[0.8125rem] gap-1.5',
  md: 'px-4 py-2.5 text-[0.9375rem] gap-2',
  lg: 'px-6 py-3 text-[1rem] gap-2.5',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  className = '',
  children,
  ...rest
}) => (
  <button
    {...rest}
    className={
      'inline-flex items-center justify-center font-medium ' +
      'rounded-lg transition-all duration-150 ' +
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
      'focus-visible:ring-offset-[#FAF7F0] disabled:cursor-not-allowed ' +
      `${variantClass[variant]} ${sizeClass[size]} ${className}`
    }
  >
    {leftIcon && <span className="shrink-0">{leftIcon}</span>}
    {children != null && <span>{children}</span>}
    {rightIcon && <span className="shrink-0">{rightIcon}</span>}
  </button>
);
