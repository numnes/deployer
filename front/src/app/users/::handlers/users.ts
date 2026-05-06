import { apiBaseClient, httpJson } from '@/lib/http';
import { getTokenClient } from '@/lib/client-auth';

export type UserRow = { id: string; email: string; createdAt: string };

export async function listUsers(): Promise<UserRow[]> {
  const token = getTokenClient();
  return await httpJson<UserRow[]>(`${apiBaseClient()}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

