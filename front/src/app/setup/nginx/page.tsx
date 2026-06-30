'use client';

import { PageContainer } from '@/components/PageContainer';
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
        <div className="card p-5">
          <h1 className="page-title">Nginx</h1>
          <p className="page-subtitle">
            O core grava arquivos <code className="text-xs">*.location</code> e faz reload do nginx
            a cada deploy.
          </p>

          <div className="mt-6 space-y-6 text-sm text-[#b8bcc4]">
            <section>
              <h2 className="font-medium text-[#e8eaed]">1. Diretório de locations</h2>
              <p className="mt-2">
                Por padrão: <code className="text-xs">~/deployer/locations</code> (variável{' '}
                <code className="text-xs">DEPLOYER_LOCATIONS_DIR</code> no host da API).
              </p>
            </section>

            <section>
              <h2 className="font-medium text-[#e8eaed]">2. Gerar snippet do server</h2>
              <p className="mt-2">No host onde roda o deployer:</p>
              <pre className="mt-2 overflow-x-auto rounded border border-[#3d4048] bg-[#2b2e33] p-3 text-xs text-[#d1d5db]">
{`export DEPLOYER_WORK_ROOT=/caminho/do/deployer
./core/bin/setup-nginx.sh seu-dominio.com`}
              </pre>
              <p className="mt-2">
                Isso cria <code className="text-xs">nginx-server-snippet.conf</code> com{' '}
                <code className="text-xs">include .../*.location;</code>. Inclua o bloco{' '}
                <code className="text-xs">server {'{}'}</code> no nginx do sistema (ex.{' '}
                <code className="text-xs">sites-enabled</code>).
              </p>
            </section>

            <section>
              <h2 className="font-medium text-[#e8eaed]">3. URL pública do projeto</h2>
              <p className="mt-2">
                Em <strong className="text-[#e8eaed]">Projetos → configurações</strong>, defina a URL
                base (ex. <code className="text-xs">https://preview.seudominio.com</code>). O path da
                branch fica em <code className="text-xs">{'{URL}'}/{'{branch-slug}'}/</code>.
              </p>
            </section>

            <section>
              <h2 className="font-medium text-[#e8eaed]">4. Verificar configuração</h2>
              <p className="mt-2">
                A API executa checagens no host (diretório, <code className="text-xs">nginx -t</code>,
                processo nginx).
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
                    setError('Não foi possível executar a verificação.');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {loading ? 'Verificando…' : 'Verificar nginx'}
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
                      ? 'Configuração crítica OK'
                      : 'Há problemas na configuração'}
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
