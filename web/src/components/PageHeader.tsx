import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="page-title">{title}</h1>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
    </div>
  );
}
