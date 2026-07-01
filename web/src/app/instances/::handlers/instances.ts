import { apiBaseClient, httpJson } from '@/lib/http';
import { getTokenClient } from '@/lib/client-auth';

export type InstanceRow = {
  id: string;
  projectId: string;
  projectSlug: string;
  projectServerUrl: string | null;
  branch: string;
  branchSlug: string;
  pm2Name: string;
  port: number | null;
  status: string;
  pm2Online: boolean;
  active: boolean;
  pm2Status: string | null;
  monit?: { memory?: number; cpu?: number } | null;
  previewUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function listInstances(): Promise<InstanceRow[]> {
  const token = getTokenClient();
  return await httpJson<InstanceRow[]>(`${apiBaseClient()}/instances`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
