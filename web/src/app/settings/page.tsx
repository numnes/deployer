'use client';

import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { RequireAuth } from '@/components/RequireAuth';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchSettings, patchSettings } from './::handlers/settings';

export default function SettingsPage() {
  const [max, setMax] = useState<number>(10);
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await fetchSettings();
        if (!alive) return;
        setRaw(s as Record<string, unknown>);
        if (typeof s.maxActiveInstancesParsed === 'number') {
          setMax(s.maxActiveInstancesParsed);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <RequireAuth>
      <PageContainer>
        <div className="mb-3 text-sm text-[#b8bcc4]">
          <Link className="link-muted" href="/">
            ← Dashboard
          </Link>
        </div>
        <PageHeader
          title="Settings"
          subtitle={
            <>
              Global limit for instances in <span className="font-semibold text-[#e8eaed]">active</span>{' '}
              state (running on PM2). Additional deploys are queued as{' '}
              <span className="font-semibold text-[#e8eaed]">waiting</span>.
            </>
          }
        />
        <div className="card p-5">
          {loading ? (
            <p className="text-sm text-white/60">Loading…</p>
          ) : (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setMsg(null);
                setSaving(true);
                try {
                  const s = await patchSettings({ maxActiveInstances: max });
                  setRaw(s as Record<string, unknown>);
                  if (typeof s.maxActiveInstancesParsed === 'number') {
                    setMax(s.maxActiveInstancesParsed);
                  }
                  setMsg('Saved.');
                } catch {
                  setMsg('Could not save.');
                } finally {
                  setSaving(false);
                }
              }}
            >
              <label className="block text-sm text-white/70">
                Max active instances
                <input
                  type="number"
                  min={1}
                  max={1000}
                  className="input mt-1.5"
                  value={max}
                  onChange={(e) => setMax(Number(e.target.value))}
                />
              </label>
              {msg ? (
                <p className="text-sm text-emerald-200/90">{msg}</p>
              ) : null}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </form>
          )}
          {raw && !loading ? (
            <details className="mt-6 text-xs text-white/50">
              <summary className="cursor-pointer text-white/60">Raw keys</summary>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-black/30 p-2">
                {JSON.stringify(raw, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      </PageContainer>
    </RequireAuth>
  );
}
