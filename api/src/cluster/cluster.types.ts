import type { DashboardSummary } from '../dashboard/dashboard.service';
import type { InstanceListItem } from '../preview-instances/preview-instances.service';

export const LOCAL_NODE_ID = 'local';

export type NodeRef = {
  nodeId: string;
  nodeLabel: string;
  nodeBaseUrl: string | null;
  isLocal: boolean;
  online?: boolean;
  /** Se ações de escrita (pause/activate/remove) são permitidas neste nó. */
  canWrite: boolean;
};

export type WithNode<T> = T & NodeRef;

export type ClusterNodeInfo = {
  nodeId: string;
  nodeLabel: string;
  baseUrl: string | null;
};

export type AggregatedDashboardSummary = DashboardSummary & {
  hosts: Array<
    NodeRef & {
      host: DashboardSummary['host'];
    }
  >;
  nodes: NodeRef[];
};

export type RemoteInstancePayload = InstanceListItem & {
  remoteId: string;
};

export function encodeRemoteId(nodeId: string, remoteId: string): string {
  return `r:${nodeId}:${remoteId}`;
}

export function parseRemoteId(
  id: string,
): { nodeId: string; remoteId: string } | null {
  const m = /^r:([^:]+):(.+)$/.exec(id);
  if (!m) return null;
  return { nodeId: m[1], remoteId: m[2] };
}
