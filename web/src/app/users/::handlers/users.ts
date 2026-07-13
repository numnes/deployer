import { apiBaseClient, httpJson } from '@/lib/http';
import { getTokenClient } from '@/lib/client-auth';
import type { UserRole } from '@/lib/client-auth';

export type UserRow = {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

export async function listUsers(): Promise<UserRow[]> {
  const token = getTokenClient();
  return await httpJson<UserRow[]>(`${apiBaseClient()}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createUser(body: {
  email: string;
  password: string;
  role: UserRole;
}): Promise<UserRow> {
  const token = getTokenClient();
  return httpJson<UserRow>(`${apiBaseClient()}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

export async function updateUser(
  id: string,
  body: { role?: UserRole; password?: string },
): Promise<UserRow> {
  const token = getTokenClient();
  return httpJson<UserRow>(`${apiBaseClient()}/users/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

export async function deleteUser(id: string): Promise<void> {
  const token = getTokenClient();
  await httpJson(`${apiBaseClient()}/users/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
