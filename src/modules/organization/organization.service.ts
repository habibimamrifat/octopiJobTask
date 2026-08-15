import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-org.dto';
import { UpdateOrganizationDto } from './dto/update-org.dto';
import { SubscriptionStatus } from '@prisma/client';
import { UpdateOrganizationStatusDto } from './dto/update-org-status.dto';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrganizationDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: dto.userEmail,
      },
    });

    if (existingUser) {
      throw new ConflictException('User email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.userPassword, 12);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: dto.name,
            contactEmail: dto.contactEmail,
            billingEmail: dto.billingEmail,
          },
        });

        const user = await tx.user.create({
          data: {
            name: dto.userName,
            email: dto.userEmail,
            password: hashedPassword,
            role: 'ORGANIZATION_ADMIN',
            organizationId: organization.id,
          },
        });

        return {
          organization,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('User email already exists');
      }

      throw error;
    }
  }

  async getMyOrganization(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      include: {
        subscription: {
          include: {
            package: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (!organization.subscription) {
      throw new BadRequestException('You need to subscribe to continue');
    }

    if (!organization.subscription.package) {
      throw new BadRequestException(
        'Your subscription package is no longer available',
      );
    }

    if (organization.subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException(
        'You need an active subscription to continue',
      );
    }

    if (
      !organization.subscription.endDate ||
      organization.subscription.endDate <= new Date()
    ) {
      throw new BadRequestException(
        'Your subscription has expired. Please renew your subscription to continue',
      );
    }

    return organization;
  }

  async updateMyOrganization(
    organizationId: string,
    dto: UpdateOrganizationDto,
  ) {
    await this.getActiveOrganization(organizationId);

    return this.prisma.organization.update({
      where: {
        id: organizationId,
      },
      data: {
        name: dto.name,
        contactEmail: dto.contactEmail,
        billingEmail: dto.billingEmail,
      },
    });
  }

  async findAll() {
    return this.prisma.organization.findMany({
      include: {
        _count: {
          select: {
            users: true,
          },
        },
        subscription: {
          include: {
            package: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: {
        id,
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        subscription: {
          include: {
            package: true,
          },
        },
        _count: {
          select: {
            users: true,
            payments: true,
            transactions: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    const organization = await this.prisma.organization.findUnique({
      where: {
        id,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.prisma.organization.update({
      where: {
        id,
      },
      data: {
        name: dto.name,
        contactEmail: dto.contactEmail,
        billingEmail: dto.billingEmail,
      },
    });
  }

  async updateStatus(id: string, dto: UpdateOrganizationStatusDto) {
    const organization = await this.prisma.organization.findUnique({
      where: {
        id,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.prisma.organization.update({
      where: {
        id,
      },
      data: {
        status: dto.status,
      },
    });
  }

  private async getActiveOrganization(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      include: {
        subscription: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    this.validateSubscription(organization.subscription);

    return organization;
  }

  private validateSubscription(
    subscription: {
      status: string;
      endDate: Date | null;
    } | null,
  ) {
    if (!subscription) {
      throw new BadRequestException('You need to subscribe to continue');
    }

    if (subscription.status !== 'ACTIVE') {
      throw new BadRequestException(
        'You need an active subscription to continue',
      );
    }

    if (subscription.endDate && subscription.endDate <= new Date()) {
      throw new BadRequestException(
        'Your subscription has expired. Please renew your subscription to continue',
      );
    }
  }
}
