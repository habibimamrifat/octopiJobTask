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
    console.log('Registration ID:', registrationId);

    try {
      const registration =
        await this.prisma.pendingOrganizationRegistration.findUnique({
          where: {
            id: registrationId,
          },
        });

      console.log('Registration found:', !!registration);

      if (!registration) {
        throw new NotFoundException(
          'Pending organization registration not found',
        );
      }

      console.log('Registration data:', {
        id: registration.id,
        packageId: registration.packageId,
        expiresAt: registration.expiresAt,
        stripeCheckoutId: registration.stripeCheckoutId,
      });

      const { expiresAt, packageId } = registration;

      if (expiresAt && expiresAt <= new Date()) {
        throw new BadRequestException(
          'Registration session has expired. Please register again',
        );
      }

      console.log('Searching package:', packageId);

      const packageData = await this.prisma.subscriptionPackage.findUnique({
        where: {
          id: packageId,
        },
      });

      console.log('Package found:', !!packageData);

      if (!packageData) {
        throw new NotFoundException('Subscription package not found');
      }

      console.log('Package data:', {
        id: packageData.id,
        name: packageData.name,
        price: packageData.price,
        billingInterval: packageData.billingInterval,
        isActive: packageData.isActive,
        stripePriceId: packageData.stripePriceId,
      });

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

      console.log('Stripe configuration:', {
        hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
        successUrl: process.env.STRIPE_SUCCESS_URL,
        cancelUrl: process.env.STRIPE_CANCEL_URL,
        stripePriceId,
      });

      if (!process.env.STRIPE_SECRET_KEY) {
        throw new BadRequestException('Stripe secret key is not configured');
      }

      if (!process.env.STRIPE_SUCCESS_URL) {
        throw new BadRequestException('Stripe success URL is not configured');
      }

      if (!process.env.STRIPE_CANCEL_URL) {
        throw new BadRequestException('Stripe cancel URL is not configured');
      }

      console.log('Creating Stripe subscription checkout...');

      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',

        line_items: [
          {
            price: stripePriceId,
            quantity: 1,
          },
        ],

        success_url:
          `${process.env.STRIPE_SUCCESS_URL}` +
          '?session_id={CHECKOUT_SESSION_ID}',

        cancel_url: process.env.STRIPE_CANCEL_URL,

        // Metadata on Checkout Session
        metadata: {
          registrationId: registration.id,
        },

        // Metadata on Stripe Subscription
        subscription_data: {
          metadata: {
            registrationId: registration.id,
          },
        },
      });

      console.log('Stripe checkout session created:', {
        id: session.id,
        url: session.url,
        status: session.status,
        paymentStatus: session.payment_status,
        mode: session.mode,
      });

      console.log('Saving Stripe checkout ID to pending registration...');

      await this.prisma.pendingOrganizationRegistration.update({
        where: {
          id: registration.id,
        },
        data: {
          stripeCheckoutId: session.id,
        },
      });

      console.log('Stripe checkout ID saved successfully:', session.id);

      const result = {
        registrationId: registration.id,
        sessionId: session.id,
        checkoutUrl: session.url,
      };

      console.log('Checkout result:', result);

      return result;
    } catch (error) {
      console.error('Registration ID:', registrationId);
      console.error('Error:', error);

      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }

      throw error;
    }
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

  // private async createOrganizationFromRegistration(
  //   registrationId: string,
  //   session: Stripe.Checkout.Session,
  //   eventId: string,
  // ) {
  //   const registration =
  //     await this.prisma.pendingOrganizationRegistration.findUnique({
  //       where: {
  //         id: registrationId,
  //       },
  //     });

  //   if (!registration) {
  //     throw new NotFoundException(
  //       'Pending organization registration not found',
  //     );
  //   }

  //   const packageData = await this.prisma.subscriptionPackage.findUnique({
  //     where: {
  //       id: registration.packageId,
  //     },
  //   });

  //   if (!packageData) {
  //     throw new NotFoundException('Subscription package not found');
  //   }

  //   return this.prisma.$transaction(async (tx) => {
  //     // 1. Create Organization
  //     const organization = await tx.organization.create({
  //       data: {
  //         name: registration.name,
  //         contactEmail: registration.contactEmail,
  //         billingEmail: registration.billingEmail,
  //       },
  //     });

  //     // 2. Create Organization Admin
  //     // Password is already hashed in PendingOrganizationRegistration
  //     const user = await tx.user.create({
  //       data: {
  //         name: registration.userName,
  //         email: registration.userEmail,
  //         password: registration.userPassword,
  //         role: 'ORGANIZATION_ADMIN',
  //         organizationId: organization.id,
  //       },
  //     });

  //     // 3. Create Subscription
  //     const subscription = await tx.organizationSubscription.create({
  //       data: {
  //         organizationId: organization.id,
  //         packageId: packageData.id,
  //         status: 'ACTIVE',
  //         startDate: new Date(),
  //         endDate: this.calculateEndDate(packageData.billingInterval),
  //       },
  //     });

  //     // 4. Create Payment
  //     const payment = await tx.payment.create({
  //       data: {
  //         organizationId: organization.id,
  //         amount: packageData.price,
  //         currency: 'usd',
  //         status: 'SUCCESS',
  //         stripeCheckoutId: session.id,
  //         paidAt: new Date(),
  //       },
  //     });

  //     // 5. Create Transaction
  //     const transaction = await tx.transaction.create({
  //       data: {
  //         organizationId: organization.id,
  //         paymentId: payment.id,
  //         amount: packageData.price,
  //         currency: 'usd',
  //         status: 'SUCCESS',
  //         stripeEventId: eventId,
  //       },
  //     });

  //     // 6. Remove pending registration
  //     await tx.pendingOrganizationRegistration.delete({
  //       where: {
  //         id: registration.id,
  //       },
  //     });

  //     return {
  //       organization,
  //       user: {
  //         id: user.id,
  //         name: user.name,
  //         email: user.email,
  //         role: user.role,
  //       },
  //       subscription,
  //       payment,
  //       transaction,
  //     };
  //   });
  // }

  // //create organization ............................

  // async handleWebhook(rawBody: Buffer, signature: string) {
  //   const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  //   if (!webhookSecret) {
  //     throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  //   }

  //   let event: Stripe.Event;

  //   try {
  //     event = this.stripe.webhooks.constructEvent(
  //       rawBody,
  //       signature,
  //       webhookSecret,
  //     );
  //   } catch {
  //     throw new BadRequestException('Invalid Stripe webhook signature');
  //   }

  //   switch (event.type) {
  //     case 'checkout.session.completed': {
  //       const session = event.data.object;

  //       const registrationId = session.metadata?.registrationId;

  //       if (!registrationId) {
  //         throw new BadRequestException(
  //           'Registration ID missing from Stripe checkout session',
  //         );
  //       }

  //       await this.createOrganizationFromRegistration(
  //         registrationId,
  //         session,
  //         event.id,
  //       );

  //       break;
  //     }

  //     case 'checkout.session.expired': {
  //       const session = event.data.object;

  //       console.log('Checkout expired:', session.id);

  //       break;
  //     }

  //     default:
  //       console.log(`Unhandled Stripe event: ${event.type}`);
  //   }

  //   return {
  //     received: true,
  //   };
  // }

  private async createOrganizationFromRegistration(
    registrationId: string,
    session: Stripe.Checkout.Session,
    eventId: string,
  ) {
    // console.log('Registration ID:', registrationId);
    // console.log('Stripe Session ID:', session.id);
    // console.log('Stripe Event ID:', eventId);

    try {
      // console.log('\n[1] Finding pending registration...');

      const registration =
        await this.prisma.pendingOrganizationRegistration.findUnique({
          where: {
            id: registrationId,
          },
        });

      console.log('Registration found:', !!registration);

      if (!registration) {
        throw new NotFoundException(
          'Pending organization registration not found',
        );
      }

      console.log('Registration data:', {
        id: registration.id,
        name: registration.name,
        contactEmail: registration.contactEmail,
        billingEmail: registration.billingEmail,
        userName: registration.userName,
        userEmail: registration.userEmail,
        packageId: registration.packageId,

        // NEVER print the actual password
        hasPassword: !!registration.userPassword,
        passwordLength: registration.userPassword?.length ?? 0,
      });

      console.log('\n[2] Finding subscription package...');

      const packageData = await this.prisma.subscriptionPackage.findUnique({
        where: {
          id: registration.packageId,
        },
      });

      console.log('Package found:', !!packageData);

      if (!packageData) {
        throw new NotFoundException('Subscription package not found');
      }

      console.log('Package:', {
        id: packageData.id,
        name: packageData.name,
        price: packageData.price,
        billingInterval: packageData.billingInterval,
        isActive: packageData.isActive,
        stripePriceId: packageData.stripePriceId,
      });

      console.log('\n[3] Starting database transaction...');

      const result = await this.prisma.$transaction(async (tx) => {
        console.log('[3.1] Creating organization...');

        const organization = await tx.organization.create({
          data: {
            name: registration.name,
            contactEmail: registration.contactEmail,
            billingEmail: registration.billingEmail,
          },
        });

        console.log('[3.1] Organization created:', {
          id: organization.id,
          name: organization.name,
        });

        console.log('[3.2] Creating organization admin...');

        const user = await tx.user.create({
          data: {
            name: registration.userName,
            email: registration.userEmail,

            // Already hashed during registration
            password: registration.userPassword,

            role: 'ORGANIZATION_ADMIN',

            organizationId: organization.id,
          },
        });

        console.log('[3.2] Organization admin created:', {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          passwordExists: !!user.password,
          passwordLength: user.password?.length ?? 0,
        });

        console.log('[3.3] Creating organization subscription...');

        const subscription = await tx.organizationSubscription.create({
          data: {
            organizationId: organization.id,
            packageId: packageData.id,
            status: 'ACTIVE',
            startDate: new Date(),
            endDate: this.calculateEndDate(packageData.billingInterval),
          },
        });

        console.log('[3.3] Subscription created:', {
          id: subscription.id,
          organizationId: subscription.organizationId,
          packageId: subscription.packageId,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
        });

        console.log('[3.4] Creating payment...');

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

        console.log('[3.4] Payment created:', {
          id: payment.id,
          organizationId: payment.organizationId,
          amount: payment.amount,
          status: payment.status,
          stripeCheckoutId: payment.stripeCheckoutId,
        });

        console.log('[3.5] Creating transaction...');

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

        console.log('[3.5] Transaction created:', {
          id: transaction.id,
          organizationId: transaction.organizationId,
          paymentId: transaction.paymentId,
          amount: transaction.amount,
          status: transaction.status,
          stripeEventId: transaction.stripeEventId,
        });

        console.log('[3.6] Removing pending registration...');

        await tx.pendingOrganizationRegistration.delete({
          where: {
            id: registration.id,
          },
        });

        console.log('[3.6] Pending registration removed.');

        return {
          organization,
          user,
          subscription,
          payment,
          transaction,
        };
      });

      console.log('\nDATABASE TRANSACTION COMPLETED SUCCESSFULLY');

      console.log('Created organization:', {
        id: result.organization.id,
        name: result.organization.name,
      });

      console.log('Created user:', {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        organizationId: result.user.organizationId,
      });

      console.log('Created subscription:', {
        id: result.subscription.id,
        status: result.subscription.status,
      });

      console.log('Created payment:', {
        id: result.payment.id,
        status: result.payment.status,
      });

      console.log('Created transaction:', {
        id: result.transaction.id,
        status: result.transaction.status,
      });

      return {
        organization: result.organization,

        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        },

        subscription: result.subscription,
        payment: result.payment,
        transaction: result.transaction,
      };
    } catch (error) {
      console.error('Registration ID:', registrationId);

      console.error('Stripe Session ID:', session.id);

      console.error('Stripe Event ID:', eventId);

      if (error instanceof Error) {
        console.error('Error message:', error.message);

        console.error('Error stack:', error.stack);
      } else {
        console.error('Unknown error:', error);
      }

      throw error;
    }
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    console.log('Raw body exists:', !!rawBody);

    console.log('Raw body length:', rawBody?.length ?? 0);

    console.log('Stripe signature exists:', !!signature);

    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      console.log('Webhook secret configured:', !!webhookSecret);

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
      } catch (error) {
        console.error('Stripe webhook signature verification failed:');

        if (error instanceof Error) {
          console.error(error.message);
        }

        throw new BadRequestException('Invalid Stripe webhook signature');
      }

      console.log('Stripe webhook verified successfully.');

      console.log('Event:', {
        id: event.id,
        type: event.type,
      });

      switch (event.type) {
        case 'checkout.session.completed': {
          console.log('\n[WEBHOOK] checkout.session.completed');

          const session = event.data.object;

          console.log('Checkout session:', {
            id: session.id,
            mode: session.mode,
            status: session.status,
            paymentStatus: session.payment_status,
            customer: session.customer,
            subscription: session.subscription,
          });

          const registrationId = session.metadata?.registrationId;

          console.log('Registration ID from metadata:', registrationId);

          if (!registrationId) {
            console.error(
              'Registration ID missing from Stripe checkout session.',
            );

            throw new BadRequestException(
              'Registration ID missing from Stripe checkout session',
            );
          }

          console.log('Creating organization from registration...');

          const result = await this.createOrganizationFromRegistration(
            registrationId,
            session,
            event.id,
          );

          console.log('Organization creation completed successfully.');

          console.log('Created organization:', result.organization.id);

          console.log('Created user:', result.user.email);

          break;
        }

        case 'checkout.session.expired': {
          const session = event.data.object;

          console.log('[WEBHOOK] Checkout expired:', session.id);

          break;
        }

        default:
          console.log('[WEBHOOK] Unhandled Stripe event:', event.type);
      }

      console.log('STRIPE WEBHOOK COMPLETED SUCCESSFULLY');

      return {
        received: true,
      };
    } catch (error) {
      console.error('STRIPE WEBHOOK ERROR');

      if (error instanceof Error) {
        console.error('Error message:', error.message);

        console.error('Error stack:', error.stack);
      } else {
        console.error('Unknown error:', error);
      }

      throw error;
    }
  }
}
