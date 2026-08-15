import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrganizationStatus } from '@prisma/client';

export class UpdateOrganizationStatusDto {
  @ApiProperty({
    example: OrganizationStatus.SUSPENDED,
    enum: OrganizationStatus,
    description: 'Organization status',
  })
  @IsEnum(OrganizationStatus)
  status!: OrganizationStatus;
}
