import { Controller, Get, Query, Req } from '@nestjs/common';

import {
  BillingInterval,
  OrganizationStatus,
  PaymentStatus,
  SubscriptionStatus,
  TransactionStatus,
  UserRole,
} from '@prisma/client';

import { AnalyticsService } from './analytics.service';
import { RouteFor } from '../../decorators/route-for.decorator';
import type { AuthenticatedRequest } from '../../types/authenricated-request.type';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // =========================================================
  // OVERVIEW
  // =========================================================

  @Get('overview')
  @RouteFor([UserRole.PLATFORM_ADMIN, UserRole.ORGANIZATION_ADMIN])
  getOverview(
    @Req() req: AuthenticatedRequest,

    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,

    @Query('organizationStatus')
    organizationStatus?: OrganizationStatus,

    @Query('subscriptionStatus')
    subscriptionStatus?: SubscriptionStatus,

    @Query('paymentStatus')
    paymentStatus?: PaymentStatus,

    @Query('transactionStatus')
    transactionStatus?: TransactionStatus,

    @Query('packageId')
    packageId?: string,

    @Query('billingInterval')
    billingInterval?: BillingInterval,

    @Query('currency')
    currency?: string,
  ) {
    return this.analyticsService.getOverview(
      {
        startDate,
        endDate,
        organizationStatus,
        subscriptionStatus,
        paymentStatus,
        transactionStatus,
        packageId,
        billingInterval,
        currency,
      },
      req.user,
    );
  }

  // =========================================================
  // USERS
  // =========================================================

  @Get('users')
  @RouteFor([UserRole.PLATFORM_ADMIN, UserRole.ORGANIZATION_ADMIN])
  getUsersAnalytics(
    @Req() req: AuthenticatedRequest,

    @Query('startDate')
    startDate?: string,

    @Query('endDate')
    endDate?: string,

    @Query('role')
    role?: UserRole,

    @Query('organizationId')
    organizationId?: string,
  ) {
    return this.analyticsService.getUsersAnalytics(
      {
        startDate,
        endDate,
        role,
        organizationId,
      },
      req.user,
    );
  }

  // =========================================================
  // ORGANIZATIONS
  // =========================================================

  @Get('organizations')
  @RouteFor([UserRole.PLATFORM_ADMIN, UserRole.ORGANIZATION_ADMIN])
  getOrganizationsAnalytics(
    @Req() req: AuthenticatedRequest,

    @Query('startDate')
    startDate?: string,

    @Query('endDate')
    endDate?: string,

    @Query('status')
    status?: OrganizationStatus,
  ) {
    return this.analyticsService.getOrganizationsAnalytics(
      {
        startDate,
        endDate,
        status,
      },
      req.user,
    );
  }

  // =========================================================
  // ORGANIZATION PERFORMANCE
  // =========================================================

  @Get('organizations/performance')
  @RouteFor([UserRole.PLATFORM_ADMIN, UserRole.ORGANIZATION_ADMIN])
  getOrganizationPerformance(
    @Req() req: AuthenticatedRequest,

    @Query('organizationId')
    organizationId?: string,

    @Query('startDate')
    startDate?: string,

    @Query('endDate')
    endDate?: string,

    @Query('status')
    status?: OrganizationStatus,

    @Query('packageId')
    packageId?: string,

    @Query('subscriptionStatus')
    subscriptionStatus?: SubscriptionStatus,

    @Query('paymentStatus')
    paymentStatus?: PaymentStatus,

    @Query('transactionStatus')
    transactionStatus?: TransactionStatus,
  ) {
    return this.analyticsService.getOrganizationPerformance(
      {
        organizationId,
        startDate,
        endDate,
        status,
        packageId,
        subscriptionStatus,
        paymentStatus,
        transactionStatus,
      },
      req.user,
    );
  }

  // =========================================================
  // PACKAGES
  // =========================================================

  @Get('packages')
  @RouteFor([UserRole.PLATFORM_ADMIN, UserRole.ORGANIZATION_ADMIN])
  getPackagesAnalytics(
    @Req() req: AuthenticatedRequest,

    @Query('startDate')
    startDate?: string,

    @Query('endDate')
    endDate?: string,

    @Query('packageId')
    packageId?: string,

    @Query('billingInterval')
    billingInterval?: BillingInterval,

    @Query('isActive')
    isActive?: string,
  ) {
    return this.analyticsService.getPackagesAnalytics(
      {
        startDate,
        endDate,
        packageId,
        billingInterval,
        isActive: isActive === undefined ? undefined : isActive === 'true',
      },
      req.user,
    );
  }

  // =========================================================
  // SUBSCRIPTIONS
  // =========================================================

  @Get('subscriptions')
  @RouteFor([UserRole.PLATFORM_ADMIN, UserRole.ORGANIZATION_ADMIN])
  getSubscriptionsAnalytics(
    @Req() req: AuthenticatedRequest,

    @Query('startDate')
    startDate?: string,

    @Query('endDate')
    endDate?: string,

    @Query('status')
    status?: SubscriptionStatus,

    @Query('organizationId')
    organizationId?: string,

    @Query('packageId')
    packageId?: string,

    @Query('billingInterval')
    billingInterval?: BillingInterval,
  ) {
    return this.analyticsService.getSubscriptionsAnalytics(
      {
        startDate,
        endDate,
        status,
        organizationId,
        packageId,
        billingInterval,
      },
      req.user,
    );
  }

  // =========================================================
  // SUBSCRIPTION REVENUE
  // =========================================================

  @Get('subscriptions/revenue')
  @RouteFor([UserRole.PLATFORM_ADMIN, UserRole.ORGANIZATION_ADMIN])
  getSubscriptionRevenue(
    @Req() req: AuthenticatedRequest,

    @Query('startDate')
    startDate?: string,

    @Query('endDate')
    endDate?: string,

    @Query('packageId')
    packageId?: string,

    @Query('organizationId')
    organizationId?: string,

    @Query('billingInterval')
    billingInterval?: BillingInterval,

    @Query('status')
    status?: SubscriptionStatus,
  ) {
    return this.analyticsService.getSubscriptionRevenue(
      {
        startDate,
        endDate,
        packageId,
        organizationId,
        billingInterval,
        status,
      },
      req.user,
    );
  }

  // =========================================================
  // PAYMENTS
  // =========================================================

  @Get('payments')
  @RouteFor([UserRole.PLATFORM_ADMIN, UserRole.ORGANIZATION_ADMIN])
  getPaymentsAnalytics(
    @Req() req: AuthenticatedRequest,

    @Query('startDate')
    startDate?: string,

    @Query('endDate')
    endDate?: string,

    @Query('status')
    status?: PaymentStatus,

    @Query('organizationId')
    organizationId?: string,

    @Query('currency')
    currency?: string,

    @Query('packageId')
    packageId?: string,
  ) {
    return this.analyticsService.getPaymentsAnalytics(
      {
        startDate,
        endDate,
        status,
        organizationId,
        currency,
        packageId,
      },
      req.user,
    );
  }

  // =========================================================
  // PAYMENT REVENUE
  // =========================================================

  @Get('payments/revenue')
  @RouteFor([UserRole.PLATFORM_ADMIN, UserRole.ORGANIZATION_ADMIN])
  getPaymentRevenue(
    @Req() req: AuthenticatedRequest,

    @Query('startDate')
    startDate?: string,

    @Query('endDate')
    endDate?: string,

    @Query('organizationId')
    organizationId?: string,

    @Query('status')
    status?: PaymentStatus,

    @Query('currency')
    currency?: string,

    @Query('packageId')
    packageId?: string,
  ) {
    return this.analyticsService.getPaymentRevenue(
      {
        startDate,
        endDate,
        organizationId,
        status,
        currency,
        packageId,
      },
      req.user,
    );
  }

  // =========================================================
  // TRANSACTIONS
  // =========================================================

  @Get('transactions')
  @RouteFor([UserRole.PLATFORM_ADMIN, UserRole.ORGANIZATION_ADMIN])
  getTransactionsAnalytics(
    @Req() req: AuthenticatedRequest,

    @Query('startDate')
    startDate?: string,

    @Query('endDate')
    endDate?: string,

    @Query('status')
    status?: TransactionStatus,

    @Query('organizationId')
    organizationId?: string,

    @Query('currency')
    currency?: string,
  ) {
    return this.analyticsService.getTransactionsAnalytics(
      {
        startDate,
        endDate,
        status,
        organizationId,
        currency,
      },
      req.user,
    );
  }

  // =========================================================
  // TRANSACTION REVENUE
  // =========================================================

  @Get('transactions/revenue')
  @RouteFor([UserRole.PLATFORM_ADMIN, UserRole.ORGANIZATION_ADMIN])
  getTransactionRevenue(
    @Req() req: AuthenticatedRequest,

    @Query('startDate')
    startDate?: string,

    @Query('endDate')
    endDate?: string,

    @Query('organizationId')
    organizationId?: string,

    @Query('status')
    status?: TransactionStatus,

    @Query('currency')
    currency?: string,
  ) {
    return this.analyticsService.getTransactionRevenue(
      {
        startDate,
        endDate,
        organizationId,
        status,
        currency,
      },
      req.user,
    );
  }

  // =========================================================
  // GROWTH
  // =========================================================

  @Get('growth')
  @RouteFor([UserRole.PLATFORM_ADMIN, UserRole.ORGANIZATION_ADMIN])
  getGrowthAnalytics(
    @Req() req: AuthenticatedRequest,

    @Query('startDate')
    startDate?: string,

    @Query('endDate')
    endDate?: string,

    @Query('organizationStatus')
    organizationStatus?: OrganizationStatus,

    @Query('userRole')
    userRole?: UserRole,

    @Query('packageId')
    packageId?: string,

    @Query('billingInterval')
    billingInterval?: BillingInterval,
  ) {
    return this.analyticsService.getGrowthAnalytics(
      {
        startDate,
        endDate,
        organizationStatus,
        userRole,
        packageId,
        billingInterval,
      },
      req.user,
    );
  }
}
