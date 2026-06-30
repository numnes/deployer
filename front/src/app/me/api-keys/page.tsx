'use client';

import { PageContainer } from '@/components/PageContainer';
import { RequireAuth } from '@/components/RequireAuth';
import { ClientTable } from '@/components/ClientTable';
import { useEffect, useMemo, useState } from 'react';
import { createApiKey, listApiKeys, type ApiKeyRow } from './::handlers/api-keys';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [label, setLabel] = useState('');

  const canCreate = useMemo(() => !creating, [creating]);

  async function refresh() {
    const data = await listApiKeys();
    setKeys(data);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listApiKeys();
        if (!alive) return;
        setKeys(data);
      } catch {
        if (!alive) return;
        setError('Não foi possível carregar as chaves.');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <RequireAuth>
      <PageContainer>
        <div className="card p-5">
          <div className="text-lg font-bold">Chaves de API</div>
          <div className="mt-1.5 text-sm text-white/70">
            Você pode gerar uma chave para autenticar a action do GitHub (header
            <span className="font-mono"> X-Deployer-Api-Key</span>).
          </div>
          <div className="h-4" />

          {newKey ? (
            <>
              <div className="rounded-2xl border border-sky-200/30 bg-sky-200/10 p-4">
                <div className="font-bold">Nova chave gerada</div>
                <div className="mt-1.5 text-sm text-white/70">
                  Copie agora e salve no GitHub Secrets.
                </div>
                <div className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-3 font-mono text-sm">
                  {newKey}
                </div>
              </div>
              <div className="h-4" />
            </>
          ) : null}

          {error ? (
            <div className="mb-3 rounded-xl border border-rose-200/30 bg-rose-200/10 px-3 py-2 text-sm text-white/85">
              {error}
            </div>
          ) : null}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setNewKey(null);
              if (!canCreate) return;
              setCreating(true);
              try {
                const data = await createApiKey(label.trim() || undefined);
                setNewKey(data.apiKey);
                setLabel('');
                await refresh();
              } catch {
                setError('Não foi possível gerar a chave.');
              } finally {
                setCreating(false);
              }
            }}
          >
            <div className="flex items-center gap-3">
              <input
                className="input flex-1"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="label (opcional) — ex: github-actions"
              />
              <button
                className="btn btn-primary whitespace-nowrap"
                type="submit"
                disabled={!canCreate}
              >
                {creating ? 'Gerando…' : 'Gerar chave'}
              </button>
            </div>
          </form>

          <div className="h-4" />
          <ClientTable
            head={
              <tr>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                  Label
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                  Criado
                </th>
              </tr>
            }
          >
            {(keys ?? []).map((k) => (
              <tr key={k.id}>
                <td className="border-b border-white/10 px-3 py-2 font-semibold">
                  {k.label}
                </td>
                <td className="border-b border-white/10 px-3 py-2 text-white/70">
                  {new Date(k.createdAt).toLocaleString('pt-BR')}
                </td>
              </tr>
            ))}
            {keys && keys.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-3 py-3 text-white/70">
                  Nenhuma chave registrada.
                </td>
              </tr>
            ) : null}
            {!keys && !error ? (
              <tr>
                <td colSpan={2} className="px-3 py-3 text-white/70">
                  Carregando…
                </td>
              </tr>
            ) : null}
          </ClientTable>
          <div className="h-3" />
          <div className="text-sm text-white/70">
            A chave em texto puro só é retornada no momento da criação; guarde-a no
            GitHub Secrets.
          </div>
        </div>
      </PageContainer>
    </RequireAuth>
  );
}

