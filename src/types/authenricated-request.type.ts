import { Request } from 'express';
import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  organizationId?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
