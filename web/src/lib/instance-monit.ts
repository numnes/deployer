export type InstanceMonit = {
  memory?: number;
  cpu?: number;
  cpuPerCore?: number;
  hostCores?: number;
};

/** Formata CPU do PM2 já normalizada (% do host). */
export function formatInstanceCpu(monit?: InstanceMonit | null): string {
  if (typeof monit?.cpu !== 'number' || !Number.isFinite(monit.cpu)) {
    return '—';
  }
  return `${monit.cpu}%`;
}

/** Tooltip explicando a métrica bruta do PM2 (100% = 1 core). */
export function instanceCpuTitle(monit?: InstanceMonit | null): string | undefined {
  if (typeof monit?.cpuPerCore !== 'number' || !Number.isFinite(monit.cpuPerCore)) {
    return undefined;
  }
  const cores = monit.hostCores ?? '?';
  return `PM2: ${monit.cpuPerCore}% (100% = 1 core) · host: ${cores} cores · exibido: % do host`;
}
