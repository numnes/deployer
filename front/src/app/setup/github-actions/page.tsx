'use client';

import { useEffect, useState } from 'react';
import { CodeBlock } from '@/components/CodeBlock';
import { PageContainer } from '@/components/PageContainer';
import { RequireAuth } from '@/components/RequireAuth';
import {
  fetchProjectTemplates,
  type ProjectTemplatesResult,
} from '../::handlers/setup';

export default function SetupGithubActionsPage() {
  const [templates, setTemplates] = useState<ProjectTemplatesResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchProjectTemplates()
      .then((data) => {
        if (!cancelled) setTemplates(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Falha ao carregar templates');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const workflowFiles =
    templates?.files.filter((f) => f.path.startsWith('.github/workflows/')) ?? [];
  const deployerYaml = templates?.files.find((f) => f.path === 'deployer.yaml');

  return (
    <RequireAuth>
      <PageContainer>
        <div className="card p-5">
          <h1 className="page-title">GitHub Actions</h1>
          <p className="page-subtitle">
            Workflows para deploy automático ao abrir/atualizar PR e teardown ao fechar.
          </p>

          <div className="mt-6 space-y-8 text-sm text-[#b8bcc4]">
            <section>
              <h2 className="font-medium text-[#e8eaed]">1. Setup automático (recomendado)</h2>
              <p className="mt-2">
                Na raiz do repositório da aplicação, rode o comando abaixo. Ele cria{' '}
                <code className="rounded bg-[#2b2e33] px-1.5 py-0.5 text-xs">.github/workflows/</code>{' '}
                com os dois workflows e copia o{' '}
                <code className="rounded bg-[#2b2e33] px-1.5 py-0.5 text-xs">deployer.yaml</code>{' '}
                para a raiz do projeto.
              </p>
              <div className="mt-3">
                <CodeBlock
                  title="Terminal — na pasta do seu app"
                  content={`# diretório atual\n${templates?.cliCommand ?? 'deployer project init'}\n\n# ou caminho explícito\n${templates?.cliCommand ?? 'deployer project init'} ../meu-app\n\n# branches alvo do PR (padrão: master,homologation)\n${templates?.cliCommand ?? 'deployer project init'} --branches main,develop\n\n# sobrescrever arquivos existentes\n${templates?.cliCommand ?? 'deployer project init'} --force`}
                />
              </div>
              <p className="mt-3 text-[#8b919a]">
                Arquivos criados:{' '}
                <code className="text-xs">.github/workflows/deploy-preview.yml</code>,{' '}
                <code className="text-xs">.github/workflows/teardown-preview.yml</code>,{' '}
                <code className="text-xs">deployer.yaml</code>. Depois, ajuste o{' '}
                <code className="text-xs">deployer.yaml</code> (build e target do PM2) e faça commit.
              </p>
            </section>

            <section>
              <h2 className="font-medium text-[#e8eaed]">2. Conteúdo dos workflows</h2>
              <p className="mt-2">
                Se preferir copiar manualmente, use os arquivos abaixo em{' '}
                <code className="rounded bg-[#2b2e33] px-1.5 py-0.5 text-xs">.github/workflows/</code>{' '}
                do repositório da aplicação.
              </p>
              {loading ? (
                <p className="mt-4 text-[#8b919a]">Carregando templates…</p>
              ) : error ? (
                <p className="mt-4 text-red-400">{error}</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {workflowFiles.map((file) => (
                    <CodeBlock
                      key={file.path}
                      title={file.path.split('/').pop() ?? file.path}
                      path={file.path}
                      content={file.content}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="font-medium text-[#e8eaed]">3. deployer.yaml</h2>
              <p className="mt-2">
                Na raiz do repositório da aplicação (mesmo nível do clone). Define os comandos de
                build e o entrypoint do PM2.
              </p>
              {deployerYaml ? (
                <div className="mt-4">
                  <CodeBlock
                    title="deployer.yaml"
                    path={deployerYaml.path}
                    content={deployerYaml.content}
                  />
                </div>
              ) : null}
            </section>

            <section>
              <h2 className="font-medium text-[#e8eaed]">4. Cadastre o projeto na API</h2>
              <p className="mt-2">
                O slug em <strong className="text-[#e8eaed]">Projetos</strong> deve coincidir com a
                variável <code className="text-xs">DEPLOYER_PROJECT_SLUG</code> no GitHub. Veja{' '}
                <strong className="text-[#e8eaed]">Setup → Secrets</strong> para secrets e variáveis.
              </p>
            </section>

            <section>
              <h2 className="font-medium text-[#e8eaed]">5. Fluxo do deploy</h2>
              <ol className="mt-2 list-inside list-decimal space-y-1">
                <li>PR aberto/atualizado dispara o workflow</li>
                <li>
                  <code className="text-xs">POST /deploy</code> com project + branch
                </li>
                <li>A API enfileira o job; o core clona, builda e sobe no PM2</li>
                <li>
                  Preview em {'{URL do projeto}'}/{'{branch-slug}'}/
                </li>
                <li>
                  Ao fechar o PR, <code className="text-xs">POST /deploy/destroy</code> remove a
                  instância
                </li>
              </ol>
            </section>
          </div>
        </div>
      </PageContainer>
    </RequireAuth>
  );
}
