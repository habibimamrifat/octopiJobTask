import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Stripe from 'stripe';
import { BcryptAbstract } from '../../helpers/bcrypt/bcrypt.abstract';
import { BillingInterval } from '@prisma/client';
import { MailService } from '../../helpers/mail/mail.service';

@Injectable()
export class PaymentService {
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly bcrypt: BcryptAbstract,
    private readonly email: MailService,
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

  // send email to the organization creator.........................
  async sendOrganizationCreationConfirmation(data: {
    to: string;
    organizationName: string;
    userName: string;
    userEmail: string;

    packageName: string;
    packagePrice: any;
    billingInterval: string;

    subscriptionStartDate: Date | null;
    subscriptionEndDate: Date | null;

    paymentAmount: any;
    paymentCurrency: string;
    paymentStatus: string;
    paidAt: Date | null;

    stripeCheckoutId: string | null;
    transactionId: string;
  }) {
    const formatDate = (date: Date | null) => {
      if (!date) return 'N/A';

      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    };

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Organization Created Successfully</title>
      </head>

      <body style="
        margin: 0;
        padding: 0;
        background-color: #f5f7fa;
        font-family: Arial, Helvetica, sans-serif;
        color: #333;
      ">

        <div style="
          max-width: 650px;
          margin: 40px auto;
          background: #ffffff;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
        ">

          <div style="
            background: #111827;
            padding: 30px;
            text-align: center;
            color: #ffffff;
          ">
            <h1 style="margin: 0;">
              Organization Created Successfully
            </h1>

            <p style="margin: 10px 0 0;">
              Welcome to our platform, ${data.userName}
            </p>
          </div>

          <div style="padding: 30px;">

            <p>
              Your payment has been successfully processed and your
              organization has been created.
            </p>

            <h2>Organization Details</h2>

            <table width="100%" cellpadding="8" cellspacing="0">
              <tr>
                <td><strong>Organization</strong></td>
                <td>${data.organizationName}</td>
              </tr>

              <tr>
                <td><strong>Administrator</strong></td>
                <td>${data.userName}</td>
              </tr>

              <tr>
                <td><strong>Email</strong></td>
                <td>${data.userEmail}</td>
              </tr>
            </table>

            <h2>Subscription Details</h2>

            <table width="100%" cellpadding="8" cellspacing="0">
              <tr>
                <td><strong>Package</strong></td>
                <td>${data.packageName}</td>
              </tr>

              <tr>
                <td><strong>Price</strong></td>
                <td>
                  ${data.packagePrice} ${data.paymentCurrency.toUpperCase()}
                </td>
              </tr>

              <tr>
                <td><strong>Billing Interval</strong></td>
                <td>${data.billingInterval}</td>
              </tr>

              <tr>
                <td><strong>Subscription Start</strong></td>
                <td>${formatDate(data.subscriptionStartDate)}</td>
              </tr>

              <tr>
                <td><strong>Subscription End</strong></td>
                <td>${formatDate(data.subscriptionEndDate)}</td>
              </tr>
            </table>

            <h2>Payment Confirmation</h2>

            <table width="100%" cellpadding="8" cellspacing="0">
              <tr>
                <td><strong>Payment Status</strong></td>
                <td>${data.paymentStatus}</td>
              </tr>

              <tr>
                <td><strong>Amount Paid</strong></td>
                <td>
                  ${data.paymentAmount}
                  ${data.paymentCurrency.toUpperCase()}
                </td>
              </tr>

              <tr>
                <td><strong>Paid At</strong></td>
                <td>${formatDate(data.paidAt)}</td>
              </tr>

              <tr>
                <td><strong>Transaction ID</strong></td>
                <td>${data.transactionId}</td>
              </tr>

              <tr>
                <td><strong>Stripe Checkout ID</strong></td>
                <td>${data.stripeCheckoutId}</td>
              </tr>
            </table>

            <p style="
              margin-top: 30px;
              padding: 15px;
              background: #f3f4f6;
              border-radius: 6px;
            ">
              Please keep this email for your records as confirmation
              of your organization creation and payment.
            </p>

          </div>

          <div style="
            padding: 20px;
            text-align: center;
            background: #f9fafb;
            color: #6b7280;
            font-size: 13px;
          ">
            This is an automated email. Please do not reply to this message.
          </div>

        </div>

      </body>
    </html>
  `;

    await this.email.sendMail(
      data.to,
      `Organization Created Successfully - ${data.organizationName}`,
      html,
    );
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

      const packageData = await this.prisma.subscriptionPackage.findUnique({
        where: {
          id: registration.packageId,
        },
      });

      console.log('Package found:', !!packageData);

      if (!packageData) {
        throw new NotFoundException('Subscription package not found');
      }

      const result = await this.prisma.$transaction(async (tx) => {
        console.log('[3.1] Creating organization...');

        const organization = await tx.organization.create({
          data: {
            name: registration.name,
            contactEmail: registration.contactEmail,
            billingEmail: registration.billingEmail,
          },
        });

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

        const subscription = await tx.organizationSubscription.create({
          data: {
            organizationId: organization.id,
            packageId: packageData.id,
            status: 'ACTIVE',
            startDate: new Date(),
            endDate: this.calculateEndDate(packageData.billingInterval),
          },
        });

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

        await tx.pendingOrganizationRegistration.delete({
          where: {
            id: registration.id,
          },
        });

        return {
          organization,
          user,
          subscription,
          payment,
          transaction,
        };
      });

      await this.sendOrganizationCreationConfirmation({
        to: result.user.email,
        organizationName: result.organization.name,
        userName: result.user.name,
        userEmail: result.user.email,

        packageName: packageData.name,
        packagePrice: packageData.price,
        billingInterval: packageData.billingInterval,

        subscriptionStartDate: result.subscription.startDate,
        subscriptionEndDate: result.subscription.endDate,

        paymentAmount: result.payment.amount,
        paymentCurrency: result.payment.currency,
        paymentStatus: result.payment.status,
        paidAt: result.payment.paidAt,

        stripeCheckoutId: result.payment.stripeCheckoutId,
        transactionId: result.transaction.id,
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
    try {
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
      } catch (error) {
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
