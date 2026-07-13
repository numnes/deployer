'use client';

import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { RequireAuth } from '@/components/RequireAuth';
import { RequireRole } from '@/components/RequireRole';
import { ClientTable } from '@/components/ClientTable';
import { useAuth } from '@/components/AuthProvider';
import { useCallback, useEffect, useState } from 'react';
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
  type UserRow,
} from './::handlers/users';
import type { UserRole } from '@/lib/client-auth';

function UsersAdminContent() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('operator');

  const load = useCallback(async () => {
    const data = await listUsers();
    setUsers(data);
  }, []);

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
    <PageContainer>
      <PageHeader title="Users" subtitle="Manage dashboard accounts and roles." />

      <div className="card mb-5 p-5">
        <h2 className="text-sm font-medium text-[#e8eaed]">Add user</h2>
        <p className="mt-1 text-xs text-[#8b919a]">
          <strong>Operator</strong> — view instances and pause, activate, or remove them.{' '}
          <strong>Admin</strong> — full access including settings, cluster, and API keys.
        </p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setBusy('create');
            try {
              await createUser({ email: email.trim(), password, role });
              setEmail('');
              setPassword('');
              setRole('operator');
              await load();
            } catch {
              setError('Could not create user.');
            } finally {
              setBusy(null);
            }
          }}
        >
          <label className="text-sm text-white/70 sm:col-span-2">
            Email
            <input
              className="input mt-1"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="text-sm text-white/70">
            Password
            <input
              className="input mt-1"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="text-sm text-white/70">
            Role
            <select
              className="input mt-1"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="btn btn-primary" disabled={busy === 'create'}>
              {busy === 'create' ? 'Creating…' : 'Create user'}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-5">
        {error ? <div className="alert-error mb-4">{error}</div> : null}
        <ClientTable
          head={
            <tr>
              <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                Email
              </th>
              <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                Role
              </th>
              <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                Created
              </th>
              <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                Actions
              </th>
            </tr>
          }
        >
          {(users ?? []).map((u) => (
            <tr key={u.id}>
              <td className="border-b border-white/10 px-3 py-2 font-semibold">
                {u.email}
                {u.id === currentUser?.id ? (
                  <span className="ml-2 text-xs text-white/45">(you)</span>
                ) : null}
              </td>
              <td className="border-b border-white/10 px-3 py-2">
                <select
                  className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm"
                  value={u.role}
                  disabled={busy === u.id}
                  onChange={async (e) => {
                    const nextRole = e.target.value as UserRole;
                    if (nextRole === u.role) return;
                    setBusy(u.id);
                    setError(null);
                    try {
                      await updateUser(u.id, { role: nextRole });
                      await load();
                    } catch {
                      setError('Could not update role.');
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td className="border-b border-white/10 px-3 py-2 text-white/70">
                {new Date(u.createdAt).toLocaleString('en-US')}
              </td>
              <td className="border-b border-white/10 px-3 py-2">
                <button
                  type="button"
                  className="btn text-xs"
                  disabled={busy === `del-${u.id}` || u.id === currentUser?.id}
                  onClick={async () => {
                    if (!confirm(`Remove user ${u.email}?`)) return;
                    setBusy(`del-${u.id}`);
                    setError(null);
                    try {
                      await deleteUser(u.id);
                      await load();
                    } catch {
                      setError('Could not remove user.');
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {users && users.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-3 py-3 text-white/70">
                No users found.
              </td>
            </tr>
          ) : null}
          {!users && !error ? (
            <tr>
              <td colSpan={4} className="px-3 py-3 text-white/70">
                Loading…
              </td>
            </tr>
          ) : null}
        </ClientTable>
      </div>
    </PageContainer>
  );
}

export default function UsersPage() {
  return (
    <RequireAuth>
      <RequireRole roles={['admin']}>
        <UsersAdminContent />
      </RequireRole>
    </RequireAuth>
  );
}
