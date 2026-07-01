import { apiBaseClient, httpJson } from '@/lib/http';
import { getTokenClient } from '@/lib/client-auth';

export type DashboardSummary = {
  maxActiveInstances: number;
  instancesByStatus: Record<string, number>;
  recentProjects: { slug: string; lastActivityAt: string }[];
  host: {
    cpu: { cores: number; loadavg1: number; loadavg5: number; loadavg15: number };
    memory: { totalBytes: number; freeBytes: number; usedBytes: number; usedPct: number };
    disk: { path: string; totalBytes: number; freeBytes: number; usedBytes: number; usedPct: number };
  };
  recentStatusChanges: {
    at: string;
    instanceId: string;
    projectSlug: string;
    branch: string;
    from: string | null;
    to: string;
  }[];
};

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const token = getTokenClient();
  return await httpJson<DashboardSummary>(
    `${apiBaseClient()}/dashboard/summary`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
}
