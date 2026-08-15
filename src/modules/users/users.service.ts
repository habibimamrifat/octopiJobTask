import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

import type { JwtPayload } from '../../types/jwt-payload.type';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    // private readonly emailService: EmailService,
  ) {}

  async create(organizationId: string, dto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const organization = await this.prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password: hashedPassword,
          role: UserRole.ORGANIZATION_MEMBER,
          organizationId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          organizationId: true,
          createdAt: true,
        },
      });

      // Send creation/invitation email here.
      // await this.emailService.sendMemberCreationEmail(...);

      return user;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A user with this email already exists');
      }

      throw error;
    }
  }

  async findAll(user: JwtPayload) {
    const where: Prisma.UserWhereInput = {};

    if (user.role === UserRole.ORGANIZATION_ADMIN) {
      if (!user.organizationId) {
        throw new ForbiddenException('Organization context is required');
      }

      where.organizationId = user.organizationId;
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(user: JwtPayload, userId: string) {
    const where: Prisma.UserWhereInput = {
      id: userId,
    };

    if (user.role === UserRole.ORGANIZATION_ADMIN) {
      if (!user.organizationId) {
        throw new ForbiddenException('Organization context is required');
      }

      where.organizationId = user.organizationId;
    }

    const targetUser = await this.prisma.user.findFirst({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    return targetUser;
  }

  async update(organizationId: string, userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found in your organization');
    }

    if (user.role === UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Platform admin cannot be modified');
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.email !== undefined) {
      data.email = dto.email;
    }

    if (dto.password !== undefined) {
      data.password = await bcrypt.hash(dto.password, 12);
    }

    try {
      return await this.prisma.user.update({
        where: {
          id: userId,
        },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          organizationId: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A user with this email already exists');
      }

      throw error;
    }
  }

  async updateRole(
    organizationId: string,
    userId: string,
    dto: UpdateMemberRoleDto,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found in your organization');
    }

    if (user.role === UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Platform admin role cannot be changed');
    }

    if (
      dto.role !== UserRole.ORGANIZATION_ADMIN &&
      dto.role !== UserRole.ORGANIZATION_MEMBER
    ) {
      throw new ForbiddenException('Invalid organization role');
    }

    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        role: dto.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        updatedAt: true,
      },
    });
  }

  async remove(organizationId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found in your organization');
    }

    if (user.role === UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Platform admin cannot be removed');
    }

    await this.prisma.user.delete({
      where: {
        id: userId,
      },
    });

    return {
      message: 'User removed successfully',
    };
  }
}
