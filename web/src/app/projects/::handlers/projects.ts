import { apiBaseClient, httpJson } from '@/lib/http';
import { getTokenClient } from '@/lib/client-auth';

import type { NodeRef } from '@/lib/node-ref';

export type Project = {
  id: string;
  slug: string;
  gitUrl: string;
  serverUrl: string | null;
  maxActiveLifetimeDays: number | null;
  maxActiveLifetimeHours: number | null;
  maxExistenceLifetimeDays: number | null;
  maxExistenceLifetimeHours: number | null;
  createdAt: string;
} & NodeRef;

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
  body: {
    serverUrl?: string | null;
    maxActiveLifetimeDays?: number | null;
    maxActiveLifetimeHours?: number | null;
    maxExistenceLifetimeDays?: number | null;
    maxExistenceLifetimeHours?: number | null;
  },
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

export type ProjectBulkResult = {
  ok?: boolean;
  destroyed?: number;
  failed?: number;
  paused?: number;
  skipped?: number;
  restarted?: number;
  instances?: { destroyed: number; failed: number };
};

export async function deleteProject(id: string): Promise<ProjectBulkResult> {
  const token = getTokenClient();
  return await httpJson<ProjectBulkResult>(`${apiBaseClient()}/projects/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function teardownProjectInstances(id: string): Promise<ProjectBulkResult> {
  const token = getTokenClient();
  return await httpJson<ProjectBulkResult>(
    `${apiBaseClient()}/projects/${id}/instances/teardown`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}

export async function restartProjectInstances(id: string): Promise<ProjectBulkResult> {
  const token = getTokenClient();
  return await httpJson<ProjectBulkResult>(
    `${apiBaseClient()}/projects/${id}/instances/restart`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}

