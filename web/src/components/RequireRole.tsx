'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import type { UserRole } from '@/lib/client-auth';

export function RequireRole({
  roles,
  children,
  fallback,
}: {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (!roles.includes(user.role)) {
      router.replace('/');
    }
  }, [loading, user, roles, router]);

  if (loading) {
    return <p className="text-sm text-white/70">Loading…</p>;
  }
  if (!user || !roles.includes(user.role)) {
    return (
      fallback ?? (
        <p className="text-sm text-white/70">You do not have permission to view this page.</p>
      )
    );
  }
  return <>{children}</>;
}
