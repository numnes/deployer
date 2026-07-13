'use client';

import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { ReloadButton } from '@/components/ReloadButton';
import { RequireAuth } from '@/components/RequireAuth';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { listInstances } from '../../../instances/::handlers/instances';
import {
  deleteProject,
  getProject,
  patchProject,
  restartProjectInstances,
  teardownProjectInstances,
  type Project,
} from '../../::handlers/projects';

export default function ProjectSettingsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [instanceCount, setInstanceCount] = useState(0);
  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [p, instances] = await Promise.all([getProject(id), listInstances()]);
      setProject(p);
      setServerUrl(p.serverUrl ?? '');
      setInstanceCount(instances.filter((i) => i.projectId === id).length);
    } catch {
      setError('Project not found or access denied.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

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
                {' · '}
                {instanceCount} instance{instanceCount === 1 ? '' : 's'}
              </>
            ) : undefined
          }
          action={<ReloadButton onReload={load} title="Reload project" />}
        />
        <div className="card p-5">
          {loading ? (
            <div className="text-sm text-white/70">Loading…</div>
          ) : null}
          {error ? <div className="alert-error">{error}</div> : null}
          {saved ? (
            <div className="alert-success mb-3">Saved.</div>
          ) : null}
          {actionMsg ? (
            <div className="alert-success mb-3">{actionMsg}</div>
          ) : null}
          {project && !error ? (
            <>
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError(null);
                  setSaved(false);
                  setActionMsg(null);
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
                    Public URL (nginx domain)
                  </label>
                  <input
                    className="input"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="https://preview.example.com"
                    type="url"
                  />
                  <p className="mt-2 text-xs text-white/55">
                    The public domain configured in nginx where preview instances are available.
                    Branch preview lives at{' '}
                    <span className="font-mono text-white/75">
                      {'{URL}'}/{'{branch-slug}'}/{' '}
                    </span>
                    (PM2 app{' '}
                    <span className="font-mono text-white/75">
                      {project.slug}-…
                    </span>
                    ).
                  </p>
                </div>
                <div className="flex gap-3">
                  <button className="btn btn-primary" type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </form>

              <div className="mt-8 border-t border-[#3d4048] pt-6">
                <h2 className="text-sm font-medium text-[#e8eaed]">Instances</h2>
                <p className="mt-1 text-xs text-[#8b919a]">
                  Bulk actions for all instances registered under this project.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn text-sm"
                    disabled={bulkLoading !== null || instanceCount === 0}
                    onClick={async () => {
                      if (
                        !confirm(
                          `Teardown all active instances for "${project.slug}"?\n\nThis pauses every active instance (stops PM2/nginx). Records stay in the database.`,
                        )
                      ) {
                        return;
                      }
                      setError(null);
                      setActionMsg(null);
                      setBulkLoading('teardown');
                      try {
                        const r = await teardownProjectInstances(id);
                        setActionMsg(
                          `Teardown done: ${r.paused ?? 0} paused, ${r.skipped ?? 0} skipped, ${r.failed ?? 0} failed.`,
                        );
                        router.refresh();
                      } catch {
                        setError('Could not teardown instances.');
                      } finally {
                        setBulkLoading(null);
                      }
                    }}
                  >
                    {bulkLoading === 'teardown' ? 'Working…' : 'Teardown all instances'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary text-sm"
                    disabled={bulkLoading !== null || instanceCount === 0}
                    onClick={async () => {
                      if (
                        !confirm(
                          `Restart all instances for "${project.slug}"?\n\nThis redeploys or activates every instance (active, paused, waiting, error).`,
                        )
                      ) {
                        return;
                      }
                      setError(null);
                      setActionMsg(null);
                      setBulkLoading('restart');
                      try {
                        const r = await restartProjectInstances(id);
                        setActionMsg(
                          `Restart done: ${r.restarted ?? 0} restarted, ${r.skipped ?? 0} skipped, ${r.failed ?? 0} failed.`,
                        );
                        router.refresh();
                      } catch {
                        setError('Could not restart instances.');
                      } finally {
                        setBulkLoading(null);
                      }
                    }}
                  >
                    {bulkLoading === 'restart' ? 'Working…' : 'Restart all instances'}
                  </button>
                </div>
              </div>

              <div className="mt-8 border-t border-[#3d4048] pt-6">
                <h2 className="text-sm font-medium text-[#e8eaed]">Delete project</h2>
                <p className="mt-1 text-xs text-[#8b919a]">
                  Destroys every instance (PM2, nginx, database record) and removes this project.
                  This cannot be undone.
                </p>
                <button
                  type="button"
                  className="btn mt-4 border-rose-200/30 bg-rose-200/10 text-sm text-rose-100 hover:bg-rose-200/15"
                  disabled={bulkLoading !== null}
                  onClick={async () => {
                    if (
                      !confirm(
                        `Delete project "${project.slug}"?\n\nAll ${instanceCount} instance(s) will be destroyed and removed. This cannot be undone.`,
                      )
                    ) {
                      return;
                    }
                    setError(null);
                    setActionMsg(null);
                    setBulkLoading('delete');
                    try {
                      await deleteProject(id);
                      router.push('/projects');
                      router.refresh();
                    } catch {
                      setError('Could not delete project.');
                      setBulkLoading(null);
                    }
                  }}
                >
                  {bulkLoading === 'delete' ? 'Deleting…' : 'Delete project'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </PageContainer>
    </RequireAuth>
  );
}
