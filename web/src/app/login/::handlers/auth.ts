import { apiBaseClient, httpJson } from '@/lib/http';
import type { AuthUser } from '@/lib/client-auth';

export async function login(email: string, password: string) {
  return await httpJson<{ access_token: string; user: AuthUser }>(
    `${apiBaseClient()}/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    },
  );
}

export async function fetchMe(): Promise<AuthUser> {
  const { getTokenClient } = await import('@/lib/client-auth');
  const token = getTokenClient();
  return httpJson<AuthUser>(`${apiBaseClient()}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

