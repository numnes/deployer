export const TOKEN_KEY = 'deployer_token';

export function getTokenClient(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setTokenClient(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearTokenClient() {
  window.localStorage.removeItem(TOKEN_KEY);
}

