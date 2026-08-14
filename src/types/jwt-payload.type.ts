export type UserRole =
  'PLATFORM_ADMIN' | 'ORGANIZATION_ADMIN' | 'ORGANIZATION_MEMBER';

export type JwtPayload = {
  id: string;
  role: UserRole;
  organizationId?: string;
};
