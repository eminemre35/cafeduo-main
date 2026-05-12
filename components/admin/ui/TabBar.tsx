/**
 * Admin TabBar — Riso Kantin re-skin (PR #24). API preserved.
 *
 * Active tab gets the pink spot colour + ink border, sits 2px below the
 * strip so its bottom border merges with the strip's. Badges become hard
 * ink-bordered chips.
 */
import React from 'react';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
}

interface TabBarProps<T extends string> {
  tabs: ReadonlyArray<TabItem<T>>;
  value: T;
  onChange: (next: T) => void;
}

export function TabBar<T extends string>({ tabs, value, onChange }: TabBarProps<T>) {
  return (
    <div className="flex flex-wrap items-end gap-2 border-b-2 border-carbon overflow-x-auto">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(t.id)}
            className={
              'relative -mb-[2px] inline-flex items-center gap-2 px-4 py-2 ' +
              'border-2 border-carbon font-riso-body font-semibold tracking-wide ' +
              'text-sm sm:text-base riso-focus transition-colors duration-150 whitespace-nowrap ' +
              (active
                ? 'bg-riso-pink text-carbon border-b-paper z-10'
                : 'bg-paper text-carbon hover:bg-paper-deep')
            }
          >
            {t.icon && <span className="shrink-0">{t.icon}</span>}
            <span>{t.label}</span>
            {t.badge != null && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 border-2 border-carbon bg-paper text-carbon text-[0.75rem] font-bold">
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
