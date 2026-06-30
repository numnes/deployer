"use client";

import { PageContainer } from "@/components/PageContainer";
import { RequireAuth } from "@/components/RequireAuth";
import { ClientTable } from "@/components/ClientTable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { listProjects, type Project } from "./::handlers/projects";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listProjects();
        if (!alive) return;
        setProjects(data);
      } catch {
        if (!alive) return;
        setError("Não foi possível carregar os projetos.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <RequireAuth>
      <PageContainer>
        <div className="card p-5">
          <div className="text-lg font-bold">Projetos</div>
          <div className="mt-1.5 text-sm text-white/70">
            Estes slugs são usados pela action do GitHub ao chamar o deploy.
          </div>
          <div className="h-4" />
          {error ? (
            <div className="rounded-xl border border-rose-200/30 bg-rose-200/10 px-3 py-2 text-sm text-white/85">
              {error}
            </div>
          ) : null}
          <ClientTable
            head={
              <tr>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                  Slug
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                  Git URL
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                  URL pública
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                  Criado
                </th>
              </tr>
            }
          >
            {(projects ?? []).map((p) => (
              <tr
                key={p.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-sky-200/30"
                onClick={() => router.push(`/projects/${p.id}/settings`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/projects/${p.id}/settings`);
                  }
                }}
              >
                <td className="border-b border-white/10 px-3 py-2 font-semibold">
                  {p.slug}
                </td>
                <td className="border-b border-white/10 px-3 py-2 text-white/70">
                  {p.gitUrl}
                </td>
                <td className="border-b border-white/10 px-3 py-2 text-white/70">
                  {p.serverUrl ? (
                    <span className="break-all">{p.serverUrl}</span>
                  ) : (
                    <span className="text-white/50">—</span>
                  )}
                </td>
                <td className="border-b border-white/10 px-3 py-2 text-white/70">
                  {new Date(p.createdAt).toLocaleString("pt-BR")}
                </td>
              </tr>
            ))}
            {projects && projects.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-3 text-white/70">
                  Nenhum projeto cadastrado.
                </td>
              </tr>
            ) : null}
            {!projects && !error ? (
              <tr>
                <td colSpan={5} className="px-3 py-3 text-white/70">
                  Carregando…
                </td>
              </tr>
            ) : null}
          </ClientTable>
        </div>
      </PageContainer>
    </RequireAuth>
  );
}
