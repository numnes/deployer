import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { promisify } from 'util';
import type { DeployMeta } from './deploy-meta';
import { pm2AppName } from './pm2-name.util';

const execFileAsync = promisify(execFile);

export async function runCoreDeployScript(
  config: ConfigService,
  projectSlug: string,
  gitUrl: string,
  branch: string,
  image?: string,
): Promise<DeployMeta> {
  const coreDir =
    config.get<string>('DEPLOYER_CORE_DIR') ||
    join(__dirname, '..', '..', '..', 'core');
  const workRoot = config.get<string>('DEPLOYER_WORK_ROOT');
  if (!workRoot) {
    throw new Error('DEPLOYER_WORK_ROOT não configurado');
  }
  const binDir = join(coreDir, 'bin');
  const env: NodeJS.ProcessEnv = { ...process.env, DEPLOYER_WORK_ROOT: workRoot };
  if (image) {
    env.DEPLOYER_IMAGE = image;
  }
  const script = join(binDir, 'deploy.sh');
  await execFileAsync(script, [projectSlug, gitUrl, branch], {
    env,
    maxBuffer: 10 * 1024 * 1024,
  });
  const pm2Name = pm2AppName(projectSlug, branch);
  const metaPath = join(workRoot, '.deployer-state', `${pm2Name}.deploy-result.json`);
  const raw = await readFile(metaPath, 'utf8');
  const meta = JSON.parse(raw) as DeployMeta;
  await unlink(metaPath).catch(() => undefined);
  return meta;
}

export async function runCorePauseScript(
  config: ConfigService,
  projectSlug: string,
  branch: string,
): Promise<void> {
  const coreDir =
    config.get<string>('DEPLOYER_CORE_DIR') ||
    join(__dirname, '..', '..', '..', 'core');
  const workRoot = config.get<string>('DEPLOYER_WORK_ROOT');
  if (!workRoot) {
    throw new Error('DEPLOYER_WORK_ROOT não configurado');
  }
  const binDir = join(coreDir, 'bin');
  const env = { ...process.env, DEPLOYER_WORK_ROOT: workRoot };
  const script = join(binDir, 'pause.sh');
  await execFileAsync(script, [projectSlug, branch], { env });
}
