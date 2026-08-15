import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import { RouteFor } from '../../decorators/route-for.decorator';
import { OrganizationId } from '../../decorators/org-Id.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';

import type { JwtPayload } from '../../types/jwt-payload.type';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Create user for organization
  @Post()
  @RouteFor([UserRole.ORGANIZATION_ADMIN])
  create(@OrganizationId() organizationId: string, @Body() dto: CreateUserDto) {
    return this.usersService.create(organizationId, dto);
  }

  // Platform Admin -> all users
  // Organization Admin -> users from their organization
  @Get()
  @RouteFor([UserRole.ORGANIZATION_ADMIN, UserRole.PLATFORM_ADMIN])
  findAll(@CurrentUser() user: JwtPayload) {
    return this.usersService.findAll(user);
  }

  // Platform Admin -> any user
  // Organization Admin -> user from their organization
  @Get(':id')
  @RouteFor([UserRole.ORGANIZATION_ADMIN, UserRole.PLATFORM_ADMIN])
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.usersService.findOne(user, id);
  }

  // Update user
  @Patch(':id')
  @RouteFor([UserRole.ORGANIZATION_ADMIN])
  update(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(organizationId, id, dto);
  }

  // Change member role
  @Patch(':id/role')
  @RouteFor([UserRole.ORGANIZATION_ADMIN])
  updateRole(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.usersService.updateRole(organizationId, id, dto);
  }

  // Remove organization member
  @Delete(':id')
  @RouteFor([UserRole.ORGANIZATION_ADMIN])
  remove(@OrganizationId() organizationId: string, @Param('id') id: string) {
    return this.usersService.remove(organizationId, id);
  }
}
