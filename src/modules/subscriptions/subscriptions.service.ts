import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import Stripe from 'stripe';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subcription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionsService {
  private readonly stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    this.stripe = new Stripe(stripeSecretKey);
  }

  async create(dto: CreateSubscriptionDto) {
    const existing = await this.prisma.subscriptionPackage.findUnique({
      where: {
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException('Subscription plan already exists');
    }

    // Create Stripe Product
    const product = await this.stripe.products.create({
      name: dto.name,
      description: dto.description,
    });

    if (!product.id) {
      throw new BadRequestException('Failed to create Stripe product');
    }

    // Create Stripe recurring Price
    const stripePrice = await this.stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(dto.price * 100),
      currency: 'usd',
      recurring: {
        interval: dto.billingInterval === 'MONTHLY' ? 'month' : 'year',
      },
    });

    if (!stripePrice.id) {
      await this.stripe.products.del(product.id);

      throw new BadRequestException('Failed to create Stripe price');
    }

    try {
      return await this.prisma.subscriptionPackage.create({
        data: {
          name: dto.name,
          description: dto.description,
          price: dto.price,
          billingInterval: dto.billingInterval,
          features: dto.features,
          stripePriceId: stripePrice.id,
        },
      });
    } catch (error) {
      // Database creation failed, clean up Stripe Product.
      // Deleting the Product also removes its associated Price.
      await this.stripe.products.del(product.id);

      throw error;
    }
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
    const subscription = await this.findOne(id);

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

    const priceChanged =
      dto.price !== undefined &&
      Number(dto.price) !== Number(subscription.price);

    const billingIntervalChanged =
      dto.billingInterval !== undefined &&
      dto.billingInterval !== subscription.billingInterval;

    const stripePriceNeedsUpdate = priceChanged || billingIntervalChanged;

    // Only local information changed.
    if (!stripePriceNeedsUpdate) {
      return this.prisma.subscriptionPackage.update({
        where: {
          id,
        },
        data: dto,
      });
    }

    if (!subscription.stripePriceId) {
      throw new BadRequestException(
        'Subscription plan is not configured with Stripe',
      );
    }

    // Get the existing Stripe Price.
    const oldStripePrice = await this.stripe.prices.retrieve(
      subscription.stripePriceId,
    );

    if (!oldStripePrice.product) {
      throw new BadRequestException(
        'Stripe product not found for subscription plan',
      );
    }

    const productId =
      typeof oldStripePrice.product === 'string'
        ? oldStripePrice.product
        : oldStripePrice.product.id;

    const newPrice =
      dto.price !== undefined ? Number(dto.price) : Number(subscription.price);

    const newBillingInterval =
      dto.billingInterval ?? subscription.billingInterval;

    // Stripe Prices are immutable.
    // Create a new Price instead of modifying the old one.
    const newStripePrice = await this.stripe.prices.create({
      product: productId,
      unit_amount: Math.round(newPrice * 100),
      currency: 'usd',
      recurring: {
        interval: newBillingInterval === 'MONTHLY' ? 'month' : 'year',
      },
    });

    if (!newStripePrice.id) {
      throw new BadRequestException('Failed to create new Stripe price');
    }

    try {
      // Deactivate the old Stripe Price.
      await this.stripe.prices.update(subscription.stripePriceId, {
        active: false,
      });

      // Save the new Stripe Price ID locally.
      return await this.prisma.subscriptionPackage.update({
        where: {
          id,
        },
        data: {
          ...dto,
          stripePriceId: newStripePrice.id,
        },
      });
    } catch (error) {
      // Local update failed.
      // Deactivate the newly created Stripe Price.
      await this.stripe.prices.update(newStripePrice.id, {
        active: false,
      });

      throw error;
    }
  }

  async remove(id: string) {
    const subscription = await this.findOne(id);

    if (subscription.stripePriceId) {
      await this.stripe.prices.update(subscription.stripePriceId, {
        active: false,
      });
    }

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
