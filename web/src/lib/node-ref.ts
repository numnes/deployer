export type NodeRef = {
  nodeId: string;
  nodeLabel: string;
  nodeBaseUrl?: string | null;
  isLocal: boolean;
  online?: boolean;
  canWrite?: boolean;
};
