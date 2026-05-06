'use client';

import { Nav } from '@/components/Nav';
import { PageContainer } from '@/components/PageContainer';
import { RequireAuth } from '@/components/RequireAuth';
import { ClientTable } from '@/components/ClientTable';
import { useEffect, useState } from 'react';
import { listUsers, type UserRow } from './::handlers/users';

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listUsers();
        if (!alive) return;
        setUsers(data);
      } catch {
        if (!alive) return;
        setError('Não foi possível carregar os usuários.');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <RequireAuth>
      <PageContainer>
        <Nav />
        <div className="h-5" />
        <div className="card p-5">
          <div className="text-lg font-bold">Usuários</div>
          <div className="mt-1.5 text-sm text-white/70">
            Contas cadastradas no Postgres.
          </div>
          <div className="h-4" />
          {error ? (
            <div className="rounded-xl border border-rose-200/30 bg-rose-200/10 px-3 py-2 text-sm text-white/85">
              {error}
            </div>
          ) : null}
          <ClientTable
            head={
              <tr>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                  E-mail
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                  Criado
                </th>
              </tr>
            }
          >
            {(users ?? []).map((u) => (
              <tr key={u.id}>
                <td className="border-b border-white/10 px-3 py-2 font-semibold">
                  {u.email}
                </td>
                <td className="border-b border-white/10 px-3 py-2 text-white/70">
                  {new Date(u.createdAt).toLocaleString('pt-BR')}
                </td>
              </tr>
            ))}
            {users && users.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-3 py-3 text-white/70">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : null}
            {!users && !error ? (
              <tr>
                <td colSpan={2} className="px-3 py-3 text-white/70">
                  Carregando…
                </td>
              </tr>
            ) : null}
          </ClientTable>
        </div>
      </PageContainer>
    </RequireAuth>
  );
}

