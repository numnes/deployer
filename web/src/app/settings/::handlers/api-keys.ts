import { apiBaseClient, httpJson } from '@/lib/http';
import { getTokenClient } from '@/lib/client-auth';

export type ApiKeyRow = { id: string; label: string; createdAt: string };

export async function listApiKeys(): Promise<ApiKeyRow[]> {
  const token = getTokenClient();
  return await httpJson<ApiKeyRow[]>(`${apiBaseClient()}/api-keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createApiKey(label?: string): Promise<{ apiKey: string }> {
  const token = getTokenClient();
  return await httpJson<{ apiKey: string }>(`${apiBaseClient()}/api-keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ label }),
  });
}
