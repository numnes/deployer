import type { NodeRef } from '@/lib/node-ref';

export function NodeBadge({ node }: { node: Pick<NodeRef, 'nodeLabel' | 'isLocal' | 'online'> }) {
  const offline = node.online === false;
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
        offline
          ? 'bg-rose-500/15 text-rose-200/90'
          : node.isLocal
            ? 'bg-sky-500/15 text-sky-200/90'
            : 'bg-violet-500/15 text-violet-200/90'
      }`}
      title={offline ? 'Node unreachable' : node.isLocal ? 'This machine' : 'Remote node'}
    >
      {node.nodeLabel}
      {offline ? ' (offline)' : ''}
    </span>
  );
}
