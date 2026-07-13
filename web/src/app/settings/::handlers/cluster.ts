import { apiBaseClient, httpJson } from '@/lib/http';
import { getTokenClient } from '@/lib/client-auth';

export type ClusterKeyScope = 'read' | 'write';

export type ClusterKeyRow = {
  id: string;
  label: string;
  scope: ClusterKeyScope;
  createdAt: string;
};

export type ClusterNodeRow = {
  id: string;
  label: string;
  baseUrl: string;
  scope: ClusterKeyScope;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function listClusterKeys(): Promise<ClusterKeyRow[]> {
  const token = getTokenClient();
  return httpJson(`${apiBaseClient()}/cluster-keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createClusterKey(
  label?: string,
  scope: ClusterKeyScope = 'read',
): Promise<{ plainKey: string; scope: ClusterKeyScope }> {
  const token = getTokenClient();
  return httpJson(`${apiBaseClient()}/cluster-keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ label, scope }),
  });
}

export async function deleteClusterKey(id: string): Promise<void> {
  const token = getTokenClient();
  await httpJson(`${apiBaseClient()}/cluster-keys/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function listClusterNodes(): Promise<ClusterNodeRow[]> {
  const token = getTokenClient();
  return httpJson(`${apiBaseClient()}/cluster-nodes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createClusterNode(body: {
  label: string;
  baseUrl: string;
  apiKey: string;
}): Promise<ClusterNodeRow> {
  const token = getTokenClient();
  return httpJson(`${apiBaseClient()}/cluster-nodes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

export async function deleteClusterNode(id: string): Promise<void> {
  const token = getTokenClient();
  await httpJson(`${apiBaseClient()}/cluster-nodes/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function testClusterNode(id: string): Promise<{
  ok: boolean;
  nodeLabel?: string;
  baseUrl?: string | null;
  scope?: ClusterKeyScope;
  error?: string;
}> {
  const token = getTokenClient();
  return httpJson(`${apiBaseClient()}/cluster-nodes/${id}/test`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}
