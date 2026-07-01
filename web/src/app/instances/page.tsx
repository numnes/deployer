'use client';

import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { RequireAuth } from '@/components/RequireAuth';
import { ClientTable } from '@/components/ClientTable';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { listInstances, type InstanceRow } from './::handlers/instances';

export default function InstancesPage() {
  const router = useRouter();
  const [instances, setInstances] = useState<InstanceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listInstances();
        if (!alive) return;
        setInstances(data);
      } catch {
        if (!alive) return;
        setError('Could not load instances.');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <RequireAuth>
      <PageContainer>
        <PageHeader
          title="Instances"
          subtitle="Persisted in the database; active status comes from PM2 on the host. Click a row for details and logs."
        />
        <div className="card p-5">
          {error ? <div className="alert-error mb-4">{error}</div> : null}
          <ClientTable
            head={
              <tr>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                  Project
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                  Branch
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                  PM2
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                  Port
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                  Status
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                  PM2 online
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                  Preview
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                  PM2 status
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                  CPU
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                  Memory
                </th>
              </tr>
            }
          >
            {(instances ?? []).map((i) => (
              <tr
                key={i.id}
                className="cursor-pointer hover:bg-white/[0.04]"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/instances/${i.id}`);
                  }
                }}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('a')) return;
                  router.push(`/instances/${i.id}`);
                }}
              >
                <td className="border-b border-white/10 px-3 py-2 font-semibold">
                  {i.projectSlug}
                </td>
                <td className="border-b border-white/10 px-3 py-2 text-white/70">
                  {i.branch}
                </td>
                <td className="border-b border-white/10 px-3 py-2 font-mono text-xs text-white/70">
                  {i.pm2Name}
                </td>
                <td className="border-b border-white/10 px-3 py-2 text-white/70">
                  {i.port ?? '—'}
                </td>
                <td className="border-b border-white/10 px-3 py-2 text-white/70">
                  <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs">
                    {i.status}
                  </span>
                </td>
                <td className="border-b border-white/10 px-3 py-2 text-white/70">
                  {i.pm2Online ? (
                    <span className="text-emerald-200/90">yes</span>
                  ) : (
                    <span className="text-amber-200/90">no</span>
                  )}
                </td>
                <td className="border-b border-white/10 px-3 py-2 text-white/70">
                  {i.previewUrl ? (
                    <Link
                      className="text-sky-200/90 underline-offset-2 hover:underline"
                      href={i.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </Link>
                  ) : (
                    <span className="text-white/45">—</span>
                  )}
                </td>
                <td className="border-b border-white/10 px-3 py-2 text-white/70">
                  {i.pm2Status ?? '—'}
                </td>
                <td className="border-b border-white/10 px-3 py-2 text-white/70">
                  {typeof i.monit?.cpu === 'number' ? `${i.monit.cpu}%` : '—'}
                </td>
                <td className="border-b border-white/10 px-3 py-2 text-white/70">
                  {typeof i.monit?.memory === 'number'
                    ? `${Math.round(i.monit.memory / (1024 * 1024))} MB`
                    : '—'}
                </td>
              </tr>
            ))}
            {instances && instances.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-3 text-white/70">
                  No instances yet (they appear here after a successful deploy).
                </td>
              </tr>
            ) : null}
            {!instances && !error ? (
              <tr>
                <td colSpan={10} className="px-3 py-3 text-white/70">
                  Loading…
                </td>
              </tr>
            ) : null}
          </ClientTable>
        </div>
      </PageContainer>
    </RequireAuth>
  );
}
