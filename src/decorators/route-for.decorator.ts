import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../types/jwt-payload.type';

export const ROUTE_FOR_KEY = 'route_for';

export type RouteRole = UserRole | 'all';

export const RouteFor = (roles: RouteRole[]) =>
  SetMetadata(ROUTE_FOR_KEY, roles);
