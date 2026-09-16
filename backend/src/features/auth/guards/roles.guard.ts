import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApplicationError } from '../../../common/errors/application.error';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser, RoleCode } from '../types/auth-user.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleCode[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredRoles?.length) return true;
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!request.user || !requiredRoles.includes(request.user.role)) {
      throw new ApplicationError('FORBIDDEN', 'You do not have permission to perform this action.', 403);
    }
    return true;
  }
}
