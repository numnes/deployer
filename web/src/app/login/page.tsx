'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from './::handlers/auth';
import { setTokenClient } from '@/lib/client-auth';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#2b2e33] p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-lg font-semibold text-[#e8eaed]">deployer</div>
          <div className="text-xs text-[#8b919a]">preview environments</div>
        </div>
        <div className="card p-5">
          <div className="page-title">Sign in</div>
          <p className="page-subtitle">Log in to manage preview instances.</p>
          <div className="h-4" />
          {error ? <div className="alert-error mb-3">{error}</div> : null}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setLoading(true);
              try {
                const fd = new FormData(e.currentTarget);
                const email = String(fd.get('email') ?? '');
                const password = String(fd.get('password') ?? '');
                const data = await login(email, password);
                setTokenClient(data.access_token);
                router.push('/');
              } catch {
                setError('Could not sign in.');
              } finally {
                setLoading(false);
              }
            }}
          >
            <label className="mb-1.5 block text-sm text-[#b8bcc4]">Email</label>
            <input className="input" name="email" type="email" required />
            <div className="h-3" />
            <label className="mb-1.5 block text-sm text-[#b8bcc4]">Password</label>
            <input className="input" name="password" type="password" required />
            <div className="h-4" />
            <button className="btn btn-primary w-full" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
