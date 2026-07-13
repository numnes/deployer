import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { UserRole } from '../user-role';

type AuthedRequest = {
  user?: { userId: string; email: string; role: UserRole };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    if (!req.user?.role) {
      // Setup key ou outro guard sem usuário JWT — não aplicar roles aqui.
      return true;
    }
    if (!required.includes(req.user.role)) {
      throw new ForbiddenException('Permissão insuficiente para esta ação');
    }
    return true;
  }
}
