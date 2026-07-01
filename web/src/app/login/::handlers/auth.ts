import { apiBaseClient, httpJson } from '@/lib/http';

export async function login(email: string, password: string) {
  return await httpJson<{ access_token: string }>(`${apiBaseClient()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

