import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Stripe from 'stripe';
import { BcryptAbstract } from '../../helpers/bcrypt/bcrypt.abstract';
import { BillingInterval } from '@prisma/client';

@Injectable()
export class PaymentService {
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly bcrypt: BcryptAbstract,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }

  async createCheckout(registrationId: string) {
    const registration =
      await this.prisma.pendingOrganizationRegistration.findUnique({
        where: {
          id: registrationId,
        },
      });

    if (!registration) {
      throw new NotFoundException(
        'Pending organization registration not found',
      );
    }

    const { expiresAt, packageId } = registration;

    if (expiresAt && expiresAt <= new Date()) {
      throw new BadRequestException(
        'Registration session has expired. Please register again',
      );
    }

    const packageData = await this.prisma.subscriptionPackage.findUnique({
      where: {
        id: packageId,
      },
    });

    if (!packageData) {
      throw new NotFoundException('Subscription package not found');
    }

    const { isActive, stripePriceId } = packageData;

    if (!isActive) {
      throw new BadRequestException(
        'This subscription package is no longer available',
      );
    }

    if (!stripePriceId) {
      throw new BadRequestException(
        'This subscription package is not configured for payment',
      );
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',

      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],

      success_url:
        `${process.env.STRIPE_SUCCESS_URL!}` +
        '?session_id={CHECKOUT_SESSION_ID}',

      cancel_url: process.env.STRIPE_CANCEL_URL!,

      metadata: {
        registrationId: registration.id,
      },
    });

    await this.prisma.pendingOrganizationRegistration.update({
      where: {
        id: registration.id,
      },
      data: {
        stripeCheckoutId: session.id,
      },
    });

    return {
      registrationId: registration.id,
      sessionId: session.id,
      checkoutUrl: session.url,
    };
  }

  //create organization ............................

  private calculateEndDate(billingInterval: BillingInterval): Date {
    const endDate = new Date();

    if (billingInterval === 'MONTHLY') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    return endDate;
  }

  private async createOrganizationFromRegistration(
    registrationId: string,
    session: Stripe.Checkout.Session,
    eventId: string,
  ) {
    const registration =
      await this.prisma.pendingOrganizationRegistration.findUnique({
        where: {
          id: registrationId,
        },
      });

    if (!registration) {
      throw new NotFoundException(
        'Pending organization registration not found',
      );
    }

    const packageData = await this.prisma.subscriptionPackage.findUnique({
      where: {
        id: registration.packageId,
      },
    });

    if (!packageData) {
      throw new NotFoundException('Subscription package not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Organization
      const organization = await tx.organization.create({
        data: {
          name: registration.name,
          contactEmail: registration.contactEmail,
          billingEmail: registration.billingEmail,
        },
      });

      // 2. Create Organization Admin
      // Password is already hashed in PendingOrganizationRegistration
      const user = await tx.user.create({
        data: {
          name: registration.userName,
          email: registration.userEmail,
          password: registration.userPassword,
          role: 'ORGANIZATION_ADMIN',
          organizationId: organization.id,
        },
      });

      // 3. Create Subscription
      const subscription = await tx.organizationSubscription.create({
        data: {
          organizationId: organization.id,
          packageId: packageData.id,
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: this.calculateEndDate(packageData.billingInterval),
        },
      });

      // 4. Create Payment
      const payment = await tx.payment.create({
        data: {
          organizationId: organization.id,
          amount: packageData.price,
          currency: 'usd',
          status: 'SUCCESS',
          stripeCheckoutId: session.id,
          paidAt: new Date(),
        },
      });

      // 5. Create Transaction
      const transaction = await tx.transaction.create({
        data: {
          organizationId: organization.id,
          paymentId: payment.id,
          amount: packageData.price,
          currency: 'usd',
          status: 'SUCCESS',
          stripeEventId: eventId,
        },
      });

      // 6. Remove pending registration
      await tx.pendingOrganizationRegistration.delete({
        where: {
          id: registration.id,
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
        subscription,
        payment,
        transaction,
      };
    });
  }

  //create organization ............................

  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        const registrationId = session.metadata?.registrationId;

        if (!registrationId) {
          throw new BadRequestException(
            'Registration ID missing from Stripe checkout session',
          );
        }

        await this.createOrganizationFromRegistration(
          registrationId,
          session,
          event.id,
        );

        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;

        console.log('Checkout expired:', session.id);

        break;
      }

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    return {
      received: true,
    };
  }
}
