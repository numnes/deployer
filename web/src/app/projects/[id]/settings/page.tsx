'use client';

import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
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
        setError('Project not found or access denied.');
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
        <div className="mb-3 text-sm text-[#b8bcc4]">
          <Link className="link-muted" href="/projects">
            ← Back to projects
          </Link>
        </div>
        <PageHeader
          title="Project settings"
          subtitle={
            project ? (
              <>
                Slug: <span className="font-semibold text-[#e8eaed]">{project.slug}</span>
              </>
            ) : undefined
          }
        />
        <div className="card p-5">
          {loading ? (
            <div className="text-sm text-white/70">Loading…</div>
          ) : null}
          {error ? <div className="alert-error">{error}</div> : null}
          {saved ? (
            <div className="alert-success mb-3">Saved.</div>
          ) : null}
          {project && !error ? (
            <form
              className="space-y-4"
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
                  setError('Could not save. Check the URL (https://…).');
                } finally {
                  setSaving(false);
                }
              }}
            >
              <div>
                <label className="mb-1.5 block text-sm text-white/70">
                  Public server URL (nginx base)
                </label>
                <input
                  className="input"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="https://preview.example.com"
                  type="url"
                />
                <p className="mt-2 text-xs text-white/55">
                  Branch preview lives at{' '}
                  <span className="font-mono text-white/75">
                    {'{URL}'}/{'{branch-slug}'}/{' '}
                  </span>
                  , aligned with PM2{' '}
                  <span className="font-mono text-white/75">
                    {project.slug}-…
                  </span>
                  .
                </p>
              </div>
              <div className="flex gap-3">
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </PageContainer>
    </RequireAuth>
  );
}
