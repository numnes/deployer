'use client';

import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { RequireAuth } from '@/components/RequireAuth';

const SECRETS = [
  {
    name: 'DEPLOYER_API_URL',
    where: 'Repository secrets (GitHub)',
    description: 'Deployer API base URL, no trailing slash.',
    example: 'https://deployer.example.com',
  },
  {
    name: 'DEPLOYER_API_KEY',
    where: 'Repository secrets (GitHub)',
    description:
      'API key from Users → API Keys. Sent in the X-Deployer-Api-Key header.',
    example: '(shown once when the key is created)',
  },
];

const VARS = [
  {
    name: 'DEPLOYER_PROJECT_SLUG',
    where: 'Repository variables (GitHub)',
    description: 'Project slug registered in deployer (same as the Slug column under Projects).',
    example: 'my-app',
  },
];

export default function SetupSecretsPage() {
  return (
    <RequireAuth>
      <PageContainer>
        <PageHeader
          title="Secrets & variables"
          subtitle="Configure these in the application repo that runs preview workflows."
        />
        <div className="card p-5">
          <div>
            <h2 className="text-sm font-medium text-[#e8eaed]">
              Secrets (Settings → Secrets and variables → Actions)
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#3d4048] text-left text-[#8b919a]">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Where</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium">Example</th>
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
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Where</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium">Example</th>
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
            Create the API key under <strong className="text-[#b8bcc4]">Users → API Keys</strong>{' '}
            before configuring the workflow. Save the value — it is only shown at creation.
          </p>
        </div>
      </PageContainer>
    </RequireAuth>
  );
}
