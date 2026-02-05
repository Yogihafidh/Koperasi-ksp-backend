import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserFromJwt } from '../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      'permissions',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: UserFromJwt }>();
    const user = request.user;

    if (!user?.permissions) {
      throw new ForbiddenException(
        'Anda tidak memiliki permission untuk mengakses endpoint ini',
      );
    }

    const hasPermissions = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );

    if (!hasPermissions) {
      throw new ForbiddenException(
        'Anda tidak memiliki permission untuk mengakses endpoint ini',
      );
    }

    return true;
  }
}
