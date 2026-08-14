import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { AuthGuard } from './auth.guard';
import {
  ROUTE_FOR_KEY,
  type RouteRole,
} from '../decorators/route-for.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authGuard: AuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<RouteRole[]>(ROUTE_FOR_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (roles?.includes('all')) {
      return true;
    }

    await this.authGuard.canActivate(context);

    if (!roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    if (!roles.includes(request.user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
