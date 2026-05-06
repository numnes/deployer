'use client';

import { Nav } from '@/components/Nav';
import { PageContainer } from '@/components/PageContainer';
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
import type { InstanceRow } from '../::handlers/instances';

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
      setLogs('Não foi possível carregar os logs.');
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
        if (alive) setError('Instância não encontrada.');
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

  return (
    <RequireAuth>
      <PageContainer>
        <Nav />
        <div className="h-5" />
        <div className="mb-3 text-sm text-white/70">
          <Link className="text-sky-200/90 hover:underline" href="/instances">
            ← Voltar às instâncias
          </Link>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200/30 bg-rose-200/10 px-4 py-3 text-sm text-white/85">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-white/70">Carregando…</div>
        ) : row ? (
          <div className="space-y-5">
            <div className="card p-5">
              <h1 className="text-lg font-bold">Instância</h1>
              <p className="mt-1 text-sm text-white/70">
                Projeto <span className="font-semibold text-white/90">{row.projectSlug}</span>{' '}
                · branch <span className="font-mono text-white/85">{row.branch}</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-primary text-sm"
                  disabled={actionLoading || row.status !== 'active'}
                  title={row.status !== 'active' ? 'Só pausa instâncias ativas' : undefined}
                  onClick={async () => {
                    setActionMsg(null);
                    setActionLoading(true);
                    try {
                      const r = await pauseInstance(id);
                      setRow(r);
                      await loadLogs();
                      setActionMsg('Instância pausada; fila pode avançar.');
                    } catch {
                      setActionMsg('Não foi possível pausar.');
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                >
                  Pausar
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
                          ? 'Sem vaga no limite; continua em espera.'
                          : 'Deploy acionado.',
                      );
                    } catch {
                      setActionMsg('Não foi possível ativar / redeploy.');
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                >
                  Ativar / redeploy
                </button>
                <button
                  type="button"
                  className="btn text-sm border-rose-200/30 bg-rose-200/10 text-rose-100 hover:bg-rose-200/15"
                  disabled={actionLoading}
                  onClick={async () => {
                    if (
                      !confirm(
                        `Remover esta instância?\n\nProjeto: ${row.projectSlug}\nBranch: ${row.branch}\n\nIsso vai derrubar o runtime (PM2/nginx) e apagar o registro do banco.`,
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
                      setActionMsg('Não foi possível remover a instância.');
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                >
                  Remover
                </button>
              </div>
              {actionMsg ? (
                <p className="mt-2 text-sm text-white/70">{actionMsg}</p>
              ) : null}
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-white/55">Status (banco)</dt>
                  <dd className="font-mono text-white/90">{row.status}</dd>
                </div>
                <div>
                  <dt className="text-white/55">PM2</dt>
                  <dd className="font-mono text-white/90">{row.pm2Name}</dd>
                </div>
                <div>
                  <dt className="text-white/55">Porta</dt>
                  <dd className="text-white/90">{row.port ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-white/55">Branch slug (path)</dt>
                  <dd className="font-mono text-white/90">{row.branchSlug}</dd>
                </div>
                <div>
                  <dt className="text-white/55">PM2 online</dt>
                  <dd className="text-white/90">
                    {row.pm2Online ? (
                      <span className="text-emerald-200/90">sim</span>
                    ) : (
                      <span className="text-amber-200/90">não</span>
                    )}{' '}
                    <span className="text-white/55">({row.pm2Status ?? '—'})</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-white/55">URL pública do projeto</dt>
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
                  <dt className="text-white/55">CPU / memória (PM2)</dt>
                  <dd className="text-white/80">
                    {typeof row.monit?.cpu === 'number' ? `${row.monit.cpu}%` : '—'} ·{' '}
                    {typeof row.monit?.memory === 'number'
                      ? `${Math.round(row.monit.memory / (1024 * 1024))} MB`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/55">Atualizado</dt>
                  <dd className="text-white/80">
                    {new Date(row.updatedAt).toLocaleString('pt-BR')}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="card p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold">Logs (PM2)</h2>
                  <p className="mt-0.5 text-xs text-white/55">
                    Últimas linhas do processo <span className="font-mono">{row.pm2Name}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-white/60">
                    Linhas
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
                    {logsLoading ? 'Carregando…' : 'Atualizar logs'}
                  </button>
                </div>
              </div>
              <pre className="mt-4 max-h-[min(480px,55vh)] overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs leading-relaxed text-white/85">
                {logs || (logsLoading ? 'Carregando…' : '(vazio)')}
              </pre>
            </div>
          </div>
        ) : null}
      </PageContainer>
    </RequireAuth>
  );
}
