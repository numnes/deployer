'use client';

import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { RequireAuth } from '@/components/RequireAuth';
import { useState } from 'react';
import { fetchNginxCheck, type NginxCheckResult } from '../::handlers/setup';

export default function SetupNginxPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NginxCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <RequireAuth>
      <PageContainer>
        <PageHeader
          title="Nginx"
          subtitle="The core writes *.location files and reloads nginx on each deploy."
        />
        <div className="card p-5">
          <div className="space-y-6 text-sm text-[#b8bcc4]">
            <section>
              <h2 className="font-medium text-[#e8eaed]">1. Locations directory</h2>
              <p className="mt-2">
                Default: <code className="text-xs">~/deployer/locations</code> (set{' '}
                <code className="text-xs">DEPLOYER_LOCATIONS_DIR</code> on the API host).
              </p>
            </section>

            <section>
              <h2 className="font-medium text-[#e8eaed]">2. Generate server snippet</h2>
              <p className="mt-2">On the deployer host:</p>
              <pre className="mt-2 overflow-x-auto rounded border border-[#3d4048] bg-[#2b2e33] p-3 text-xs text-[#d1d5db]">
{`export DEPLOYER_WORK_ROOT=/path/to/work
./core/bin/setup-nginx.sh your-domain.com`}
              </pre>
              <p className="mt-2">
                This creates <code className="text-xs">nginx-server-snippet.conf</code> with{' '}
                <code className="text-xs">include .../*.location;</code>. Add the{' '}
                <code className="text-xs">server {'{}'}</code> block to your system nginx (e.g.{' '}
                <code className="text-xs">sites-enabled</code>).
              </p>
            </section>

            <section>
              <h2 className="font-medium text-[#e8eaed]">3. Project public URL</h2>
              <p className="mt-2">
                Under <strong className="text-[#e8eaed]">Projects → settings</strong>, set the base
                URL (e.g. <code className="text-xs">https://preview.example.com</code>). Branch
                paths are at <code className="text-xs">{'{URL}'}/{'{branch-slug}'}/</code>.
              </p>
            </section>

            <section>
              <h2 className="font-medium text-[#e8eaed]">4. Verify configuration</h2>
              <p className="mt-2">
                The API runs checks on the host (directory, <code className="text-xs">nginx -t</code>,
                nginx process).
              </p>
              <button
                type="button"
                className="btn btn-primary mt-3"
                disabled={loading}
                onClick={async () => {
                  setError(null);
                  setResult(null);
                  setLoading(true);
                  try {
                    setResult(await fetchNginxCheck());
                  } catch {
                    setError('Could not run verification.');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {loading ? 'Checking…' : 'Check nginx'}
              </button>
              {error ? <p className="alert-error mt-3">{error}</p> : null}
              {result ? (
                <div className="mt-4">
                  <p
                    className={
                      result.ok ? 'alert-success' : 'alert-error'
                    }
                  >
                    {result.ok
                      ? 'Critical configuration OK'
                      : 'Configuration issues found'}
                    {' · '}
                    <span className="font-mono text-xs">{result.locationsDir}</span>
                  </p>
                  <ul className="mt-3 space-y-2">
                    {result.checks.map((c) => (
                      <li
                        key={c.id}
                        className="rounded border border-[#3d4048] bg-[#2b2e33] px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              c.ok ? 'bg-[#6b9e7a]' : 'bg-[#9e6b6b]'
                            }`}
                          />
                          <span className="font-medium text-[#e8eaed]">{c.label}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap pl-4 text-xs text-[#8b919a]">
                          {c.detail}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </PageContainer>
    </RequireAuth>
  );
}
