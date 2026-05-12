/**
 * Tabs — Riso Kantin primitive.
 *
 * Generic, controlled tab strip. Active tab has an "ink stamp" underline
 * (thick ink bar + offset pink line). Non-active tabs are paper.
 *
 * Generic over the tab id type so callers can use string unions or enums
 * without losing type info.
 */

import React from 'react';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  active: T;
  onChange: (next: T) => void;
  /** Optional className for the strip container. */
  className?: string;
  /** Optional data-testid for the strip — individual tabs get `${testid}-${id}`. */
  'data-testid'?: string;
}

export function Tabs<T extends string>({
  items,
  active,
  onChange,
  className = '',
  'data-testid': testId,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      data-testid={testId}
      className={['flex flex-wrap gap-2 border-b-2 border-carbon', className].join(' ')}
    >
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={item.disabled || undefined}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            data-testid={testId ? `${testId}-${item.id}` : undefined}
            className={[
              'relative -mb-[2px] inline-flex items-center gap-2',
              'font-riso-body font-semibold tracking-wide',
              'border-2 border-carbon px-4 py-2 text-sm sm:text-base',
              'riso-focus transition-colors duration-150',
              isActive
                ? 'bg-riso-pink text-carbon border-b-paper z-10'
                : 'bg-paper text-carbon hover:bg-paper-deep',
              item.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
            ].join(' ')}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
