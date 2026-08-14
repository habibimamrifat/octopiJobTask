import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subcription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubscriptionDto) {
    const existing = await this.prisma.subscriptionPackage.findUnique({
      where: {
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException('Subscription plan already exists');
    }

    return this.prisma.subscriptionPackage.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.subscriptionPackage.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const subscription = await this.prisma.subscriptionPackage.findUnique({
      where: {
        id,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription plan not found');
    }

    return subscription;
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.subscriptionPackage.findFirst({
        where: {
          name: dto.name,
          NOT: {
            id,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Subscription plan already exists');
      }
    }

    return this.prisma.subscriptionPackage.update({
      where: {
        id,
      },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.subscriptionPackage.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });
  }
}
