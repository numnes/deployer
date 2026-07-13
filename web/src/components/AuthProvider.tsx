'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiBaseClient, httpJson } from '@/lib/http';
import {
  getTokenClient,
  getUserClient,
  setUserClient,
  type AuthUser,
} from '@/lib/client-auth';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getTokenClient();
    if (!token) {
      setUser(null);
      return;
    }
    const me = await httpJson<AuthUser>(`${apiBaseClient()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUserClient(me);
    setUser(me);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const cached = getUserClient();
      if (cached) setUser(cached);
      try {
        await refresh();
      } catch {
        if (alive) setUser(cached);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ user, loading, refresh }),
    [user, loading, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
