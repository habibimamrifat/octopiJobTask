import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationStatus, Prisma, SubscriptionStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-org.dto';
import { UpdateOrganizationDto } from './dto/update-org.dto';
import { UpdateOrganizationStatusDto } from './dto/update-org-status.dto';
import { BcryptAbstract } from '../../helpers/bcrypt/bcrypt.abstract';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService,
    private readonly bcrypt :BcryptAbstract
  ) {}

async create(dto: CreateOrganizationDto) {
  const existingUser = await this.prisma.user.findUnique({
    where: {
      email: dto.userEmail,
    },
  });

  if (existingUser) {
    throw new ConflictException('User email already exists');
  }

  const packageData =
    await this.prisma.subscriptionPackage.findUnique({
      where: {
        id: dto.packageId,
      },
    });

  if (!packageData) {
    throw new NotFoundException('Subscription package not found');
  }

  if (!packageData.isActive) {
    throw new BadRequestException(
      'This subscription package is no longer available',
    );
  }

  if (!packageData.stripePriceId) {
    throw new BadRequestException(
      'This subscription package is not configured for payment',
    );
  }

 const hashedPassword = await this.bcrypt.createHash(dto.userPassword)

  try {
    return await this.prisma.$transaction(async (tx) => {
      const registration =
        await tx.pendingOrganizationRegistration.create({
          data: {
            name: dto.name,
            contactEmail: dto.contactEmail,
            billingEmail: dto.billingEmail,

            userName: dto.userName,
            userEmail: dto.userEmail,
            userPassword: hashedPassword,

            packageId: dto.packageId,
          },
        });

      return {
        registrationId: registration.id,
        packageId: registration.packageId,
        packageName: packageData.name,
        amount: packageData.price,
        billingInterval: packageData.billingInterval,
      };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'User email already exists',
      );
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
        subscriptions: {
          include: {
            package: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const subscription = organization.subscriptions[0] ?? null;

    if (subscription) {
      if (subscription.status !== SubscriptionStatus.ACTIVE) {
        throw new BadRequestException(
          'You need an active subscription to continue',
        );
      }

      if (!subscription.endDate || subscription.endDate <= new Date()) {
        throw new BadRequestException(
          'Your subscription has expired. Please renew your subscription to continue',
        );
      }
    }

    return {
      ...organization,
      subscription,
    };
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
        subscriptions: {
          include: {
            package: true,
          },
          orderBy: {
            createdAt: 'desc',
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
        subscriptions: {
          include: {
            package: true,
          },
          orderBy: {
            createdAt: 'desc',
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
        subscriptions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const subscription = organization.subscriptions[0];

    if (!subscription) {
      throw new BadRequestException(
        'You need to subscribe to continue',
      );
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException(
        'You need an active subscription to continue',
      );
    }

    if (!subscription.endDate || subscription.endDate <= new Date()) {
      throw new BadRequestException(
        'Your subscription has expired. Please renew your subscription to continue',
      );
    }

    return organization;
  }

  private validateSubscription(
    subscription: {
      status: string;
      endDate: Date | null;
    } | null,
  ) {
    if (!subscription) {
      throw new BadRequestException(
        'You need to subscribe to continue',
      );
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