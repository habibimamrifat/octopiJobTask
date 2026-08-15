import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-org.dto';
import { UpdateOrganizationDto } from './dto/update-org.dto';
import { RouteFor } from '../../decorators/route-for.decorator';
import { OrganizationId } from '../../decorators/org-Id.decorator';
import { UpdateOrganizationStatusDto } from './dto/update-org-status.dto';

@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @RouteFor(['all'])
  create(@Body() dto: CreateOrganizationDto) {
    return this.organizationService.create(dto);
  }

  @Get('me')
  @RouteFor([UserRole.ORGANIZATION_ADMIN, UserRole.ORGANIZATION_MEMBER])
  getMyOrganization(@OrganizationId() organizationId: string) {
    return this.organizationService.getMyOrganization(organizationId);
  }

  @Patch('me')
  @RouteFor([UserRole.ORGANIZATION_ADMIN])
  updateMyOrganization(
    @OrganizationId() organizationId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationService.updateMyOrganization(organizationId, dto);
  }

  @Get()
  @RouteFor([UserRole.PLATFORM_ADMIN])
  findAll() {
    return this.organizationService.findAll();
  }

  @Get(':id')
  @RouteFor([UserRole.PLATFORM_ADMIN])
  findOne(@Param('id') id: string) {
    return this.organizationService.findOne(id);
  }

  @Patch(':id')
  @RouteFor([UserRole.PLATFORM_ADMIN])
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.organizationService.update(id, dto);
  }

  @Patch(':id/status')
  @RouteFor([UserRole.PLATFORM_ADMIN])
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationStatusDto,
  ) {
    return this.organizationService.updateStatus(id, dto);
  }
}
