import { SetMetadata } from '@nestjs/common';

export const CLUSTER_WRITE_KEY = 'clusterWrite';

/** Exige que a chave cluster tenha escopo `write` para acessar a rota. */
export const RequireClusterWrite = () => SetMetadata(CLUSTER_WRITE_KEY, true);
