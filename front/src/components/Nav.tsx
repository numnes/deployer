'use client';

import Link from 'next/link';
import { clearTokenClient } from '@/lib/client-auth';
import { useRouter } from 'next/navigation';

export function Nav() {
  const router = useRouter();
  return (
    <div className="card flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3">
        <Link href="/" className="font-bold tracking-tight">
          deployer
        </Link>
        <span className="text-sm text-white/70">preview environments</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <Link className="text-white/80 hover:text-white" href="/">
          Dashboard
        </Link>
        <Link className="text-white/80 hover:text-white" href="/settings">
          Config
        </Link>
        <Link className="text-white/80 hover:text-white" href="/projects">
          Projetos
        </Link>
        <Link className="text-white/80 hover:text-white" href="/instances">
          Instâncias
        </Link>
        <Link className="text-white/80 hover:text-white" href="/users">
          Usuários
        </Link>
        <Link className="text-white/80 hover:text-white" href="/me/api-keys">
          Chaves
        </Link>
        <button
          className="btn"
          type="button"
          onClick={() => {
            clearTokenClient();
            router.push('/login');
          }}
        >
          Sair
        </button>
      </div>
    </div>
  );
}

