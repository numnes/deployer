import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeysService } from '../../api-keys/api-keys.service';

@Injectable()
export class DeployApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeys: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const raw = req.headers['x-deployer-api-key'];
    const key = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
    if (!key) {
      throw new UnauthorizedException('Cabeçalho X-Deployer-Api-Key obrigatório');
    }
    const ok = await this.apiKeys.validateDeployKey(key);
    if (!ok) {
      throw new UnauthorizedException('Chave de API inválida');
    }
    return true;
  }
}
