import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClusterKeysService } from '../../cluster-keys/cluster-keys.service';
import { CLUSTER_WRITE_KEY } from './cluster-write.decorator';

type ClusterRequest = {
  headers: Record<string, string | string[] | undefined>;
  clusterScope?: 'read' | 'write';
};

@Injectable()
export class ClusterKeyGuard implements CanActivate {
  constructor(
    private readonly keys: ClusterKeysService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<ClusterRequest>();
    const raw = req.headers['x-deployer-cluster-key'];
    const key = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
    if (!key) {
      throw new UnauthorizedException('Cabeçalho X-Deployer-Cluster-Key obrigatório');
    }
    const row = await this.keys.resolveKey(key);
    if (!row) {
      throw new UnauthorizedException('Chave cluster inválida');
    }
    req.clusterScope = row.scope;

    const requiresWrite = this.reflector.getAllAndOverride<boolean>(
      CLUSTER_WRITE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requiresWrite && row.scope !== 'write') {
      throw new ForbiddenException(
        'Esta chave cluster é somente leitura; ações de escrita não são permitidas',
      );
    }
    return true;
  }
}
