'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTokenClient } from '@/lib/client-auth';
import { AppShell } from './AppShell';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getTokenClient();
    if (!token) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;
  return <AppShell>{children}</AppShell>;
}

