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
    <div className="border-b border-[#E8DCC9] flex items-end gap-1 overflow-x-auto">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={
              'relative px-4 py-3 text-[0.9375rem] font-medium transition-colors ' +
              'flex items-center gap-2 whitespace-nowrap ' +
              (active ? 'text-[#1C1814]' : 'text-[#6B5B4D] hover:text-[#1C1814]')
            }
          >
            {t.icon}
            <span>{t.label}</span>
            {t.badge != null && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[#F2EBE0] text-[#3D332C] text-[0.75rem] font-semibold">
                {t.badge}
              </span>
            )}
            {active && (
              <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-[#C2622F] rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
