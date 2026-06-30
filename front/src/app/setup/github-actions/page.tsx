'use client';

import { PageContainer } from '@/components/PageContainer';
import { RequireAuth } from '@/components/RequireAuth';

export default function SetupGithubActionsPage() {
  return (
    <RequireAuth>
      <PageContainer>
        <div className="card p-5">
          <h1 className="page-title">GitHub Actions</h1>
          <p className="page-subtitle">
            Workflows para deploy automático ao abrir/atualizar PR e teardown ao fechar.
          </p>

          <div className="mt-6 space-y-6 text-sm text-[#b8bcc4]">
            <section>
              <h2 className="font-medium text-[#e8eaed]">1. Copie os workflows</h2>
              <p className="mt-2">
                No repositório da aplicação, crie os arquivos em{' '}
                <code className="rounded bg-[#2b2e33] px-1.5 py-0.5 text-xs">.github/workflows/</code>:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>
                  <code className="text-xs">deploy-preview.yml</code> — copie de{' '}
                  <code className="text-xs">actions/deploy-preview.yml</code>
                </li>
                <li>
                  <code className="text-xs">teardown-preview.yml</code> — copie de{' '}
                  <code className="text-xs">actions/teardown-preview.yml</code>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-medium text-[#e8eaed]">2. Cadastre o projeto na API</h2>
              <p className="mt-2">
                O slug do projeto em <strong className="text-[#e8eaed]">Projetos</strong> deve
                coincidir com a variável <code className="text-xs">DEPLOYER_PROJECT_SLUG</code> no
                GitHub.
              </p>
            </section>

            <section>
              <h2 className="font-medium text-[#e8eaed]">3. deployer.yaml no repo</h2>
              <p className="mt-2">
                Na raiz do repositório da aplicação, inclua um{' '}
                <code className="text-xs">deployer.yaml</code> (veja{' '}
                <code className="text-xs">examples/deployer.yaml</code>):
              </p>
              <pre className="mt-3 overflow-x-auto rounded border border-[#3d4048] bg-[#2b2e33] p-3 text-xs leading-relaxed text-[#d1d5db]">
{`runner: pm2
build:
  - npm ci
  - npm run build
target: dist/main.js`}
              </pre>
            </section>

            <section>
              <h2 className="font-medium text-[#e8eaed]">4. Fluxo do deploy</h2>
              <ol className="mt-2 list-inside list-decimal space-y-1">
                <li>PR aberto/atualizado dispara o workflow</li>
                <li>
                  <code className="text-xs">POST /deploy</code> com project + branch
                </li>
                <li>A API enfileira o job; o core clona, builda e sobe no PM2</li>
                <li>Preview em {'{URL do projeto}'}/{'{branch-slug}'}/</li>
                <li>Ao fechar o PR, <code className="text-xs">POST /deploy/destroy</code> remove a instância</li>
              </ol>
            </section>
          </div>
        </div>
      </PageContainer>
    </RequireAuth>
  );
}
