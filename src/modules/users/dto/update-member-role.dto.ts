import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateMemberRoleDto {
  @ApiProperty({
    enum: [UserRole.ORGANIZATION_ADMIN, UserRole.ORGANIZATION_MEMBER],
    example: UserRole.ORGANIZATION_MEMBER,
  })
  @IsEnum(UserRole)
  role!: UserRole;
}
