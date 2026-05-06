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
    <div className="mx-auto max-w-md p-6">
      <div className="h-10" />
      <div className="card p-5">
        <div className="text-xl font-bold">Entrar</div>
        <div className="mt-1.5 text-sm text-white/70">
          Faça login para gerenciar instâncias de preview.
        </div>
        <div className="h-4" />
        {error ? (
          <div className="mb-3 rounded-xl border border-rose-200/30 bg-rose-200/10 px-3 py-2 text-sm text-white/85">
            {error}
          </div>
        ) : null}
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
            } catch (err) {
              setError('Não foi possível fazer login.');
            } finally {
              setLoading(false);
            }
          }}
        >
          <label className="mb-1.5 block text-sm text-white/70">
            E-mail
          </label>
          <input className="input" name="email" type="email" required />
          <div className="h-3" />
          <label className="mb-1.5 block text-sm text-white/70">
            Senha
          </label>
          <input className="input" name="password" type="password" required />
          <div className="h-4" />
          <button className="btn btn-primary w-full" type="submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

