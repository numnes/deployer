/** Versão do deployer exibida na UI (injetada no build do web). */
export function deployerVersionLabel(): string {
  const raw = process.env.NEXT_PUBLIC_DEPLOYER_VERSION?.trim();
  if (!raw) return 'dev';
  return raw.startsWith('v') ? raw : raw.match(/^\d/) ? `v${raw}` : raw;
}
