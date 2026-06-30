'use client';

import { PageContainer } from '@/components/PageContainer';
import { RequireAuth } from '@/components/RequireAuth';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  getProject,
  patchProject,
  type Project,
} from '../../::handlers/projects';

export default function ProjectSettingsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await getProject(id);
        if (!alive) return;
        setProject(p);
        setServerUrl(p.serverUrl ?? '');
      } catch {
        if (!alive) return;
        setError('Projeto não encontrado ou sem permissão.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <RequireAuth>
      <PageContainer>
        <div className="mb-3 text-sm text-white/70">
          <Link className="text-sky-200/90 hover:underline" href="/projects">
            ← Voltar aos projetos
          </Link>
        </div>
        <div className="card p-5">
          <div className="text-lg font-bold">Configurações do projeto</div>
          {project ? (
            <div className="mt-1 text-sm text-white/70">
              Slug: <span className="font-semibold text-white/90">{project.slug}</span>
            </div>
          ) : null}
          <div className="h-4" />
          {loading ? (
            <div className="text-sm text-white/70">Carregando…</div>
          ) : null}
          {error ? (
            <div className="rounded-xl border border-rose-200/30 bg-rose-200/10 px-3 py-2 text-sm text-white/85">
              {error}
            </div>
          ) : null}
          {saved ? (
            <div className="mt-3 rounded-xl border border-emerald-200/30 bg-emerald-200/10 px-3 py-2 text-sm text-white/85">
              Salvo.
            </div>
          ) : null}
          {project && !error ? (
            <form
              className="mt-4 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setError(null);
                setSaved(false);
                setSaving(true);
                try {
                  const trimmed = serverUrl.trim();
                  const updated = await patchProject(id, {
                    serverUrl: trimmed === '' ? null : trimmed,
                  });
                  setProject(updated);
                  setSaved(true);
                  router.refresh();
                } catch {
                  setError('Não foi possível salvar. Verifique a URL (https://…).');
                } finally {
                  setSaving(false);
                }
              }}
            >
              <div>
                <label className="mb-1.5 block text-sm text-white/70">
                  URL pública no servidor (base do nginx)
                </label>
                <input
                  className="input"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="https://meuteste.com"
                  type="url"
                />
                <p className="mt-2 text-xs text-white/55">
                  O preview da branch fica em{' '}
                  <span className="font-mono text-white/75">
                    {'{URL}'}/{'{branch-slug}'}/{' '}
                  </span>
                  , alinhado ao PM2{' '}
                  <span className="font-mono text-white/75">
                    {project.slug}-…
                  </span>
                  .
                </p>
              </div>
              <div className="flex gap-3">
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </PageContainer>
    </RequireAuth>
  );
}
