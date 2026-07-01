'use client';

import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { RequireAuth } from '@/components/RequireAuth';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchDashboardSummary, type DashboardSummary } from './::handlers/dashboard';

const STATUS_LABEL: Record<string, string> = {
  waiting: 'Waiting',
  deploying: 'Deploying',
  active: 'Active',
  paused: 'Paused',
  error: 'Error',
};

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const digits = i === 0 ? 0 : i <= 2 ? 0 : 1;
  return `${v.toFixed(digits)} ${units[i]}`;
}

export default function HomePage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await fetchDashboardSummary();
        if (!alive) return;
        setData(d);
      } catch {
        if (!alive) return;
        setErr('Could not load dashboard.');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const chartData =
    data != null
      ? Object.entries(data.instancesByStatus).map(([key, value]) => ({
          name: STATUS_LABEL[key] ?? key,
          key,
          value,
        }))
      : [];

  return (
    <RequireAuth>
      <PageContainer>
        <PageHeader
          title="Dashboard"
          subtitle="Host resources and preview instance activity."
        />
        {err ? <div className="alert-error mb-4">{err}</div> : null}
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="card p-5 lg:col-span-2">
            <h2 className="text-base font-semibold text-[#e8eaed]">Server resources</h2>
            <p className="mt-1 text-sm text-[#8b919a]">
              CPU, memory, and disk on the machine running the API.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/55">CPU (loadavg)</div>
                <div className="mt-1 text-lg font-semibold text-white/90">
                  {data
                    ? `${data.host.cpu.loadavg1.toFixed(2)} / ${data.host.cpu.loadavg5.toFixed(
                        2,
                      )} / ${data.host.cpu.loadavg15.toFixed(2)}`
                    : '—'}
                </div>
                <div className="mt-1 text-xs text-white/55">
                  {data ? `${data.host.cpu.cores} cores` : ''}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/55">Memory</div>
                <div className="mt-1 text-lg font-semibold text-white/90">
                  {data ? `${data.host.memory.usedPct}%` : '—'}
                </div>
                <div className="mt-1 text-xs text-white/55">
                  {data
                    ? `${formatBytes(data.host.memory.usedBytes)} / ${formatBytes(
                        data.host.memory.totalBytes,
                      )}`
                    : ''}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/55">Disk ({data?.host.disk.path ?? '—'})</div>
                <div className="mt-1 text-lg font-semibold text-white/90">
                  {data ? `${data.host.disk.usedPct}%` : '—'}
                </div>
                <div className="mt-1 text-xs text-white/55">
                  {data
                    ? `${formatBytes(data.host.disk.usedBytes)} / ${formatBytes(
                        data.host.disk.totalBytes,
                      )}`
                    : ''}
                </div>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <h2 className="text-base font-semibold text-[#e8eaed]">Instances by status</h2>
            <p className="mt-1 text-sm text-[#8b919a]">
              Configured limit:{' '}
              <span className="font-semibold text-white/90">
                {data?.maxActiveInstances ?? '—'}
              </span>{' '}
              active max.
            </p>
            <div className="mt-4 h-64">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 8,
                      }}
                      labelStyle={{ color: 'rgba(255,255,255,0.85)' }}
                    />
                    <Bar dataKey="value" fill="#6b7280" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-white/55">No data yet.</p>
              )}
            </div>
          </div>
          <div className="card p-5">
            <h2 className="text-base font-semibold text-[#e8eaed]">Recent project activity</h2>
            <p className="mt-1 text-sm text-[#8b919a]">
              Sorted by last instance update per project.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {(data?.recentProjects ?? []).map((p) => (
                <li
                  key={p.slug}
                  className="flex justify-between gap-3 border-b border-white/10 pb-2 last:border-0"
                >
                  <span className="font-medium text-white/90">{p.slug}</span>
                  <span className="text-white/55">
                    {new Date(p.lastActivityAt).toLocaleString('en-US')}
                  </span>
                </li>
              ))}
              {data && data.recentProjects.length === 0 ? (
                <li className="text-white/50">No records.</li>
              ) : null}
            </ul>
          </div>
          <div className="card p-5 lg:col-span-2">
            <h2 className="text-base font-semibold text-[#e8eaed]">Recent status changes</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-white/10 px-2 py-2 text-left text-white/75">
                      When
                    </th>
                    <th className="border-b border-white/10 px-2 py-2 text-left text-white/75">
                      Project
                    </th>
                    <th className="border-b border-white/10 px-2 py-2 text-left text-white/75">
                      Branch
                    </th>
                    <th className="border-b border-white/10 px-2 py-2 text-left text-white/75">
                      From → To
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentStatusChanges ?? []).map((e, i) => (
                    <tr key={`${e.at}-${i}`}>
                      <td className="border-b border-white/10 px-2 py-2 text-white/65">
                        {new Date(e.at).toLocaleString('en-US')}
                      </td>
                      <td className="border-b border-white/10 px-2 py-2 font-medium text-white/90">
                        {e.projectSlug}
                      </td>
                      <td className="border-b border-white/10 px-2 py-2 font-mono text-xs text-white/70">
                        {e.branch}
                      </td>
                      <td className="border-b border-white/10 px-2 py-2 text-white/75">
                        {e.from ?? '—'} → <span className="font-semibold">{e.to}</span>
                      </td>
                    </tr>
                  ))}
                  {data && data.recentStatusChanges.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-3 text-white/50">
                        No events yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </PageContainer>
    </RequireAuth>
  );
}
