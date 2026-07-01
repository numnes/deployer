import { apiBaseClient, httpJson } from '@/lib/http';
import { getTokenClient } from '@/lib/client-auth';

export type Project = {
  id: string;
  slug: string;
  gitUrl: string;
  serverUrl: string | null;
  createdAt: string;
};

export async function listProjects(): Promise<Project[]> {
  const token = getTokenClient();
  return await httpJson<Project[]>(`${apiBaseClient()}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getProject(id: string): Promise<Project> {
  const token = getTokenClient();
  return await httpJson<Project>(`${apiBaseClient()}/projects/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createProject(body: {
  slug: string;
  gitUrl: string;
  serverUrl?: string | null;
}): Promise<Project> {
  const token = getTokenClient();
  return await httpJson<Project>(`${apiBaseClient()}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

export async function patchProject(
  id: string,
  body: { serverUrl?: string | null },
): Promise<Project> {
  const token = getTokenClient();
  return await httpJson<Project>(`${apiBaseClient()}/projects/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

