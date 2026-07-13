import { clearTokenClient } from './client-auth';

export function apiBaseClient(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }
  return url.replace(/\/+$/, '');
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/** Limpa a sessão e envia o usuário para o login (uma vez só). */
function handleUnauthorized() {
  if (typeof window === 'undefined') return;
  clearTokenClient();
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

export async function httpJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, { ...init, cache: 'no-store' });
  if (res.status === 401) {
    handleUnauthorized();
    throw new UnauthorizedError();
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP error ${res.status}`);
  }
  return (await res.json()) as T;
}
