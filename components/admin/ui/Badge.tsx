import React from 'react';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

const toneClass: Record<Tone, string> = {
  neutral: 'bg-[#F2EBE0] text-[#3D332C] border-[#E8DCC9]',
  primary: 'bg-[#FBE8DA] text-[#843D17] border-[#F5D2B5]',
  success: 'bg-[#EAF1E4] text-[#445D36] border-[#C9D9B8]',
  warning: 'bg-[#FAEFD3] text-[#8A6612] border-[#F0D89A]',
  danger: 'bg-[#F8E1E1] text-[#8A2929] border-[#EAB7B7]',
};

interface BadgeProps {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', children, className = '' }) => (
  <span
    className={
      'inline-flex items-center px-2.5 py-0.5 rounded-full border ' +
      `text-[0.6875rem] font-semibold uppercase tracking-[0.08em] ${toneClass[tone]} ${className}`
    }
  >
    {children}
  </span>
);
