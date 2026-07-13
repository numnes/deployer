'use client';

import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { ReloadButton } from '@/components/ReloadButton';
import { RequireAuth } from '@/components/RequireAuth';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  activateInstance,
  getInstance,
  getInstanceLogs,
  pauseInstance,
  removeInstance,
} from './::handlers/detail';
import { runnerLabel, type InstanceRow } from '../::handlers/instances';
import {
  activeLifetimePausedHint,
  lifetimeExpiryDisplay,
} from '@/lib/instance-lifetime';

export default function InstanceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [row, setRow] = useState<InstanceRow | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [logLines, setLogLines] = useState(200);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    setError(null);
    const data = await getInstance(id);
    setRow(data);
  }, [id]);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await getInstanceLogs(id, logLines);
      setLogs(res.output);
    } catch {
      setLogs('Could not load logs.');
    } finally {
      setLogsLoading(false);
    }
  }, [id, logLines]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        await loadDetail();
      } catch {
        if (alive) setError('Instance not found.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadDetail]);

  useEffect(() => {
    if (!row) return;
    void loadLogs();
  }, [row, loadLogs]);

  const reloadAll = useCallback(async () => {
    await Promise.all([loadDetail(), loadLogs()]);
  }, [loadDetail, loadLogs]);

  return (
    <RequireAuth>
      <PageContainer>
        <div className="mb-3 text-sm text-[#b8bcc4]">
          <Link className="link-muted" href="/instances">
            ← Back to instances
          </Link>
        </div>

        {error ? <div className="alert-error mb-4">{error}</div> : null}

        {loading ? (
          <div className="text-sm text-white/70">Loading…</div>
        ) : row ? (
          <div className="space-y-5">
            <PageHeader
              title="Instance"
              subtitle={
                <>
                  Project <span className="font-semibold text-[#e8eaed]">{row.projectSlug}</span>
                  {' · '}
                  branch <span className="font-mono text-[#e8eaed]">{row.branch}</span>
                </>
              }
              action={<ReloadButton onReload={reloadAll} title="Reload instance" />}
            />

            {row.status === 'error' && row.lastDeployError ? (
              <div className="rounded-xl border border-rose-400/30 bg-rose-950/40 p-4">
                <h2 className="text-sm font-semibold text-rose-100">Deploy failed</h2>
                <p className="mt-1 text-xs text-rose-200/70">
                  Last error recorded during deploy (branch{' '}
                  <span className="font-mono">{row.branch}</span>).
                </p>
                <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-rose-400/20 bg-black/40 p-3 font-mono text-xs leading-relaxed text-rose-50/90 whitespace-pre-wrap">
                  {row.lastDeployError}
                </pre>
              </div>
            ) : null}

            <div className="card p-5">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-primary text-sm"
                  disabled={actionLoading || row.status !== 'active'}
                  title={row.status !== 'active' ? 'Only active instances can be paused' : undefined}
                  onClick={async () => {
                    setActionMsg(null);
                    setActionLoading(true);
                    try {
                      const r = await pauseInstance(id);
                      setRow(r);
                      await loadLogs();
                      setActionMsg('Instance paused; queue may advance.');
                    } catch {
                      setActionMsg('Could not pause.');
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                >
                  Pause
                </button>
                <button
                  type="button"
                  className="btn text-sm"
                  disabled={
                    actionLoading ||
                    !['waiting', 'paused', 'error', 'active'].includes(row.status)
                  }
                  onClick={async () => {
                    setActionMsg(null);
                    setActionLoading(true);
                    try {
                      const r = await activateInstance(id);
                      setRow(r);
                      await loadLogs();
                      setActionMsg(
                        r.status === 'waiting'
                          ? 'No free slot; still waiting.'
                          : 'Deploy triggered.',
                      );
                    } catch {
                      setActionMsg('Could not activate / redeploy.');
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                >
                  Activate / redeploy
                </button>
                <button
                  type="button"
                  className="btn text-sm border-rose-200/30 bg-rose-200/10 text-rose-100 hover:bg-rose-200/15"
                  disabled={actionLoading}
                  onClick={async () => {
                    if (
                      !confirm(
                        `Remove this instance?\n\nProject: ${row.projectSlug}\nBranch: ${row.branch}\n\nThis stops the runtime (${runnerLabel(row.runner)}/nginx) and deletes the database record.`,
                      )
                    ) {
                      return;
                    }
                    setActionMsg(null);
                    setActionLoading(true);
                    try {
                      await removeInstance(id);
                      router.push('/instances');
                      router.refresh();
                    } catch {
                      setActionMsg('Could not remove instance.');
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                >
                  Remove
                </button>
              </div>
              {actionMsg ? (
                <p className="mt-2 text-sm text-white/70">{actionMsg}</p>
              ) : null}
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-white/55">Status (database)</dt>
                  <dd className="font-mono text-white/90">{row.status}</dd>
                </div>
                <div>
                  <dt className="text-white/55">Runner</dt>
                  <dd className="font-mono text-white/90">{runnerLabel(row.runner)}</dd>
                </div>
                <div>
                  <dt className="text-white/55">{runnerLabel(row.runner)} name</dt>
                  <dd className="font-mono text-white/90">{row.runtimeName ?? row.pm2Name}</dd>
                </div>
                <div>
                  <dt className="text-white/55">Port</dt>
                  <dd className="text-white/90">{row.port ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-white/55">Branch slug (path)</dt>
                  <dd className="font-mono text-white/90">{row.branchSlug}</dd>
                </div>
                <div>
                  <dt className="text-white/55">{runnerLabel(row.runner)} online</dt>
                  <dd className="text-white/90">
                    {(row.runtimeOnline ?? row.pm2Online) ? (
                      <span className="text-emerald-200/90">yes</span>
                    ) : (
                      <span className="text-amber-200/90">no</span>
                    )}{' '}
                    <span className="text-white/55">
                      ({row.runtimeStatus ?? row.pm2Status ?? '—'})
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-white/55">Project public URL</dt>
                  <dd className="break-all text-white/80">
                    {row.projectServerUrl ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/55">Preview</dt>
                  <dd>
                    {row.previewUrl ? (
                      <Link
                        className="text-sky-200/90 underline-offset-2 hover:underline"
                        href={row.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {row.previewUrl}
                      </Link>
                    ) : (
                      <span className="text-white/45">—</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/55">CPU / memory ({runnerLabel(row.runner)})</dt>
                  <dd className="text-white/80">
                    {row.runner === 'docker' ? (
                      <span className="text-white/55">n/d (docker)</span>
                    ) : (
                      <>
                        {typeof row.monit?.cpu === 'number' ? `${row.monit.cpu}%` : '—'} ·{' '}
                        {typeof row.monit?.memory === 'number'
                          ? `${Math.round(row.monit.memory / (1024 * 1024))} MB`
                          : '—'}
                      </>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/55">Updated</dt>
                  <dd className="text-white/80">
                    {new Date(row.updatedAt).toLocaleString('en-US')}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/55">Auto-pause at</dt>
                  <dd className="text-white/80">
                    {(() => {
                      const hint = activeLifetimePausedHint(
                        row.status,
                        row.hasActiveLifetimeLimit,
                        row.activeExpiresAt,
                      );
                      if (hint) {
                        return <span className="text-white/55">{hint}</span>;
                      }
                      const d = lifetimeExpiryDisplay(row.activeExpiresAt);
                      return (
                        <span className={d.expired ? 'text-rose-300/90' : undefined}>
                          {row.activeExpiresAt ? (
                            <>
                              {d.title}
                              {!d.expired ? (
                                <span className="ml-1 text-xs text-white/50">({d.text})</span>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-white/45">No limit</span>
                          )}
                        </span>
                      );
                    })()}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/55">Auto-remove at</dt>
                  <dd className="text-white/80">
                    {(() => {
                      const d = lifetimeExpiryDisplay(row.existenceExpiresAt);
                      return (
                        <span className={d.expired ? 'text-rose-300/90' : undefined}>
                          {row.existenceExpiresAt ? (
                            <>
                              {d.title}
                              {!d.expired ? (
                                <span className="ml-1 text-xs text-white/50">({d.text})</span>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-white/45">No limit</span>
                          )}
                        </span>
                      );
                    })()}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="card p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold">Logs ({runnerLabel(row.runner)})</h2>
                  <p className="mt-0.5 text-xs text-white/55">
                    Last lines from {row.runner === 'docker' ? 'container' : 'process'}{' '}
                    <span className="font-mono">{row.runtimeName ?? row.pm2Name}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-white/60">
                    Lines
                    <select
                      className="ml-2 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white"
                      value={logLines}
                      onChange={(e) => setLogLines(Number(e.target.value))}
                    >
                      {[100, 200, 400, 800].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn btn-primary text-sm"
                    disabled={logsLoading}
                    onClick={() => void loadLogs()}
                  >
                    {logsLoading ? 'Loading…' : 'Refresh logs'}
                  </button>
                </div>
              </div>
              <pre className="mt-4 max-h-[min(480px,55vh)] overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs leading-relaxed text-white/85">
                {logs || (logsLoading ? 'Loading…' : '(empty)')}
              </pre>
            </div>
          </div>
        ) : null}
      </PageContainer>
    </RequireAuth>
  );
}
