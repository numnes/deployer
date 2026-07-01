"use client";

import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { RequireAuth } from "@/components/RequireAuth";
import { ClientTable } from "@/components/ClientTable";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createProject, listProjects, type Project } from "./::handlers/projects";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [slug, setSlug] = useState("");
  const [gitUrl, setGitUrl] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listProjects();
        if (!alive) return;
        setProjects(data);
      } catch {
        if (!alive) return;
        setError("Could not load projects.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <RequireAuth>
      <PageContainer>
        <PageHeader
          title="Projects"
          subtitle="Slugs are used by the GitHub Action when calling deploy."
          action={
            <button
              type="button"
              className="btn btn-success"
              onClick={() => {
                setShowForm((v) => !v);
                setFormError(null);
              }}
            >
              {showForm ? "Cancel" : "Add project"}
            </button>
          }
        />

        {showForm ? (
          <div className="card mb-5 p-5">
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setFormError(null);
                setCreating(true);
                try {
                  const trimmedSlug = slug.trim();
                  const trimmedGit = gitUrl.trim();
                  const trimmedServer = serverUrl.trim();
                  const created = await createProject({
                    slug: trimmedSlug,
                    gitUrl: trimmedGit,
                    serverUrl: trimmedServer === "" ? null : trimmedServer,
                  });
                  setProjects((prev) =>
                    [...(prev ?? []), created].sort((a, b) =>
                      a.slug.localeCompare(b.slug),
                    ),
                  );
                  setSlug("");
                  setGitUrl("");
                  setServerUrl("");
                  setShowForm(false);
                } catch {
                  setFormError(
                    "Could not create project. Check slug (lowercase, hyphens) and git URL.",
                  );
                } finally {
                  setCreating(false);
                }
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm text-[#b8bcc4]">Slug</label>
                  <input
                    className="input"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="my-app"
                    pattern="[a-z0-9][a-z0-9-]*"
                    required
                  />
                  <p className="mt-1 text-xs text-[#8b919a]">
                    Must match DEPLOYER_PROJECT_SLUG in GitHub.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-[#b8bcc4]">Git URL</label>
                  <input
                    className="input"
                    value={gitUrl}
                    onChange={(e) => setGitUrl(e.target.value)}
                    placeholder="https://github.com/org/repo.git"
                    type="url"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm text-[#b8bcc4]">
                    Public URL (optional)
                  </label>
                  <input
                    className="input"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="https://preview.example.com"
                    type="url"
                  />
                </div>
              </div>
              {formError ? <div className="alert-error">{formError}</div> : null}
              <button className="btn btn-success" type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create project"}
              </button>
            </form>
          </div>
        ) : null}

        <div className="card p-5">
          {error ? <div className="alert-error mb-4">{error}</div> : null}
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
                  Public URL
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-white/85">
                  Created
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
                  {new Date(p.createdAt).toLocaleString("en-US")}
                </td>
              </tr>
            ))}
            {projects && projects.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-white/70">
                  No projects yet. Click Add project to register one.
                </td>
              </tr>
            ) : null}
            {!projects && !error ? (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-white/70">
                  Loading…
                </td>
              </tr>
            ) : null}
          </ClientTable>
        </div>
      </PageContainer>
    </RequireAuth>
  );
}
