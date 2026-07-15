import { clearTokenClient } from './client-auth';
import { isDemoMode } from '@/demo/mode';
import { demoFetchJson, DemoHttpError } from '@/demo/router';

export function apiBaseClient(): string {
  if (isDemoMode()) {
    return 'https://demo.local';
  }
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
  const loginPath = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/login`;
  if (!window.location.pathname.endsWith('/login')) {
    window.location.assign(loginPath || '/login');
  }
}

export async function httpJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  if (isDemoMode()) {
    try {
      return await demoFetchJson<T>(url, init);
    } catch (e) {
      if (e instanceof Error && e.name === 'UnauthorizedError') {
        handleUnauthorized();
        throw new UnauthorizedError(e.message);
      }
      if (e instanceof DemoHttpError) {
        throw new Error(e.message || `HTTP error ${e.status}`);
      }
      throw e;
    }
  }

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
