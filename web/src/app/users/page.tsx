'use client';

import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
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
        setError('Could not load users.');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <RequireAuth>
      <PageContainer>
        <PageHeader title="Users" subtitle="Accounts stored in Postgres." />
        <div className="card p-5">
          {error ? <div className="alert-error mb-4">{error}</div> : null}
          <ClientTable
            head={
              <tr>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                  Email
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                  Created
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
                  {new Date(u.createdAt).toLocaleString('en-US')}
                </td>
              </tr>
            ))}
            {users && users.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-3 py-3 text-white/70">
                  No users found.
                </td>
              </tr>
            ) : null}
            {!users && !error ? (
              <tr>
                <td colSpan={2} className="px-3 py-3 text-white/70">
                  Loading…
                </td>
              </tr>
            ) : null}
          </ClientTable>
        </div>
      </PageContainer>
    </RequireAuth>
  );
}
