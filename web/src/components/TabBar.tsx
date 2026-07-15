'use client';

import type { ReactNode } from 'react';

export type TabItem<T extends string> = {
  id: T;
  label: string;
  icon: ReactNode;
};

type Props<T extends string> = {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
};

export function TabBar<T extends string>({ tabs, value, onChange, className }: Props<T>) {
  return (
    <div
      className={`flex flex-wrap gap-1 border-b border-[#3d4048] ${className ?? ''}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm transition ${
              active
                ? 'border-[#e8eaed] text-[#e8eaed]'
                : 'border-transparent text-[#8b919a] hover:text-[#e8eaed]'
            }`}
            onClick={() => onChange(tab.id)}
          >
            <span className="opacity-80">{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
