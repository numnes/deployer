'use client';

import { PageContainer } from '@/components/PageContainer';
import { RequireAuth } from '@/components/RequireAuth';

const SECRETS = [
  {
    name: 'DEPLOYER_API_URL',
    where: 'Secrets do repositório (GitHub)',
    description: 'URL base da API do deployer, sem barra final.',
    example: 'https://deployer.seudominio.com',
  },
  {
    name: 'DEPLOYER_API_KEY',
    where: 'Secrets do repositório (GitHub)',
    description:
      'Chave de API criada em Usuários → Chaves API. Enviada no header X-Deployer-Api-Key.',
    example: '(valor exibido uma vez ao criar a chave)',
  },
];

const VARS = [
  {
    name: 'DEPLOYER_PROJECT_SLUG',
    where: 'Variables do repositório (GitHub)',
    description: 'Slug do projeto cadastrado na ferramenta (mesmo valor da coluna Slug em Projetos).',
    example: 'meu-app',
  },
];

export default function SetupSecretsPage() {
  return (
    <RequireAuth>
      <PageContainer>
        <div className="card p-5">
          <h1 className="page-title">Secrets e variáveis</h1>
          <p className="page-subtitle">
            Configure no repositório da aplicação que dispara os workflows de preview.
          </p>

          <div className="mt-6">
            <h2 className="text-sm font-medium text-[#e8eaed]">Secrets (Settings → Secrets and variables → Actions)</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#3d4048] text-left text-[#8b919a]">
                    <th className="px-3 py-2 font-medium">Nome</th>
                    <th className="px-3 py-2 font-medium">Onde</th>
                    <th className="px-3 py-2 font-medium">Descrição</th>
                    <th className="px-3 py-2 font-medium">Exemplo</th>
                  </tr>
                </thead>
                <tbody>
                  {SECRETS.map((s) => (
                    <tr key={s.name} className="border-b border-[#3d4048]">
                      <td className="px-3 py-2 font-mono text-xs text-[#e8eaed]">{s.name}</td>
                      <td className="px-3 py-2 text-[#b8bcc4]">{s.where}</td>
                      <td className="px-3 py-2 text-[#b8bcc4]">{s.description}</td>
                      <td className="px-3 py-2 font-mono text-xs text-[#8b919a]">{s.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-medium text-[#e8eaed]">Variables</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#3d4048] text-left text-[#8b919a]">
                    <th className="px-3 py-2 font-medium">Nome</th>
                    <th className="px-3 py-2 font-medium">Onde</th>
                    <th className="px-3 py-2 font-medium">Descrição</th>
                    <th className="px-3 py-2 font-medium">Exemplo</th>
                  </tr>
                </thead>
                <tbody>
                  {VARS.map((v) => (
                    <tr key={v.name} className="border-b border-[#3d4048]">
                      <td className="px-3 py-2 font-mono text-xs text-[#e8eaed]">{v.name}</td>
                      <td className="px-3 py-2 text-[#b8bcc4]">{v.where}</td>
                      <td className="px-3 py-2 text-[#b8bcc4]">{v.description}</td>
                      <td className="px-3 py-2 font-mono text-xs text-[#8b919a]">{v.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-6 text-sm text-[#8b919a]">
            Crie a chave de API em <strong className="text-[#b8bcc4]">Usuários → Chaves API</strong>{' '}
            antes de configurar o workflow. Guarde o valor — ele só é mostrado na criação.
          </p>
        </div>
      </PageContainer>
    </RequireAuth>
  );
}
