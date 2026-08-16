import { BadRequestException, Injectable } from '@nestjs/common';

import {
  OrganizationStatus,
  PaymentStatus,
  Prisma,
  SubscriptionStatus,
  TransactionStatus,
  UserRole,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import {
  AnalyticsUser,
  OverviewFilters,
  UsersFilters,
  OrganizationsFilters,
  OrganizationPerformanceFilters,
  PackagesFilters,
  SubscriptionsFilters,
  SubscriptionRevenueFilters,
  PaymentsFilters,
  PaymentRevenueFilters,
  TransactionsFilters,
  TransactionRevenueFilters,
  GrowthFilters,
} from './types';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // ACCESS CONTROL
  // =========================================================

  /**
   * PLATFORM_ADMIN
   *   -> Can access all organizations.
   *   -> Can optionally filter by organizationId.
   *
   * ORGANIZATION_ADMIN
   *   -> Can ONLY access their own organization.
   *   -> Any organizationId sent from frontend is ignored.
   */
  private getOrganizationScope(
    user: AnalyticsUser,
    requestedOrganizationId?: string,
  ): string | undefined {
    if (user.role === UserRole.PLATFORM_ADMIN) {
      return requestedOrganizationId;
    }

    if (user.role === UserRole.ORGANIZATION_ADMIN) {
      return user.organizationId ?? undefined;
    }

    return undefined;
  }

  /**
   * Creates a Prisma date filter.
   */
  private getDateRange(
    startDate?: string,
    endDate?: string,
  ): Prisma.DateTimeFilter | undefined {
    if (!startDate && !endDate) {
      return undefined;
    }

    const createdAt: Prisma.DateTimeFilter = {};

    if (startDate) {
      const start = new Date(startDate);

      if (Number.isNaN(start.getTime())) {
        throw new BadRequestException('Invalid startDate');
      }

      createdAt.gte = start;
    }

    if (endDate) {
      const end = new Date(endDate);

      if (Number.isNaN(end.getTime())) {
        throw new BadRequestException('Invalid endDate');
      }

      end.setHours(23, 59, 59, 999);

      createdAt.lte = end;
    }

    return createdAt;
  }

  /**
   * Converts dates into:
   *
   * [
   *   { month: '2026-01', count: 10 },
   *   { month: '2026-02', count: 15 }
   * ]
   */
  private buildMonthlyGrowth(dates: Date[]) {
    const growth = new Map<string, number>();

    for (const date of dates) {
      const month = `${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, '0')}`;

      growth.set(month, (growth.get(month) ?? 0) + 1);
    }

    return Array.from(growth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        month,
        count,
      }));
  }

  // =========================================================
  // OVERVIEW
  // =========================================================

  async getOverview(filters: OverviewFilters, user: AnalyticsUser) {
    const organizationId = this.getOrganizationScope(user);

    const {
      startDate,
      endDate,
      organizationStatus,
      subscriptionStatus,
      paymentStatus,
      transactionStatus,
      packageId,
      billingInterval,
      currency,
    } = filters;

    const organizationCreatedAt = this.getDateRange(startDate, endDate);

    const subscriptionCreatedAt = this.getDateRange(startDate, endDate);

    const paymentCreatedAt = this.getDateRange(startDate, endDate);

    const transactionCreatedAt = this.getDateRange(startDate, endDate);

    const userCreatedAt = this.getDateRange(startDate, endDate);

    const organizationWhere: Prisma.OrganizationWhereInput = {
      ...(organizationCreatedAt && {
        createdAt: organizationCreatedAt,
      }),

      ...(organizationStatus && {
        status: organizationStatus,
      }),

      ...(organizationId && {
        id: organizationId,
      }),
    };

    const subscriptionWhere: Prisma.OrganizationSubscriptionWhereInput = {
      ...(subscriptionCreatedAt && {
        createdAt: subscriptionCreatedAt,
      }),

      ...(subscriptionStatus && {
        status: subscriptionStatus,
      }),

      ...(packageId && {
        packageId,
      }),

      ...(billingInterval && {
        package: {
          billingInterval,
        },
      }),

      ...(organizationId && {
        organizationId,
      }),
    };

    const paymentWhere: Prisma.PaymentWhereInput = {
      ...(paymentCreatedAt && {
        createdAt: paymentCreatedAt,
      }),

      ...(paymentStatus && {
        status: paymentStatus,
      }),

      ...(currency && {
        currency,
      }),

      ...(organizationId && {
        organizationId,
      }),

      ...(packageId && {
        organization: {
          subscriptions: {
            some: {
              packageId,
              ...(organizationId && {
                organizationId,
              }),
            },
          },
        },
      }),
    };

    const transactionWhere: Prisma.TransactionWhereInput = {
      ...(transactionCreatedAt && {
        createdAt: transactionCreatedAt,
      }),

      ...(transactionStatus && {
        status: transactionStatus,
      }),

      ...(currency && {
        currency,
      }),

      ...(organizationId && {
        organizationId,
      }),

      ...(packageId && {
        organization: {
          subscriptions: {
            some: {
              packageId,
              ...(organizationId && {
                organizationId,
              }),
            },
          },
        },
      }),
    };

    const userWhere: Prisma.UserWhereInput = {
      ...(userCreatedAt && {
        createdAt: userCreatedAt,
      }),

      ...(organizationId && {
        organizationId,
      }),
    };

    const [organizations, users, subscriptions, payments, transactions] =
      await Promise.all([
        this.prisma.organization.count({
          where: organizationWhere,
        }),

        this.prisma.user.count({
          where: userWhere,
        }),

        this.prisma.organizationSubscription.count({
          where: subscriptionWhere,
        }),

        this.prisma.payment.aggregate({
          where: paymentWhere,

          _count: {
            id: true,
          },

          _sum: {
            amount: true,
          },
        }),

        this.prisma.transaction.aggregate({
          where: transactionWhere,

          _count: {
            id: true,
          },

          _sum: {
            amount: true,
          },
        }),
      ]);

    return {
      filters,

      scope: {
        role: user.role,
        organizationId: organizationId ?? null,
      },

      totals: {
        organizations,
        users,
        subscriptions,
        payments: payments._count.id,
        transactions: transactions._count.id,
      },

      revenue: {
        payments: payments._sum.amount ?? 0,

        transactions: transactions._sum.amount ?? 0,
      },
    };
  }

  // =========================================================
  // USERS
  // =========================================================

  async getUsersAnalytics(filters: UsersFilters, user: AnalyticsUser) {
    const organizationId = this.getOrganizationScope(
      user,
      filters.organizationId,
    );

    const { startDate, endDate, role } = filters;

    const createdAt = this.getDateRange(startDate, endDate);

    const where: Prisma.UserWhereInput = {
      ...(createdAt && {
        createdAt,
      }),

      ...(role && {
        role,
      }),

      ...(organizationId && {
        organizationId,
      }),
    };

    const users = await this.prisma.user.findMany({
      where,

      select: {
        id: true,
        role: true,
        organizationId: true,
        createdAt: true,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

    const distribution = {
      PLATFORM_ADMIN: 0,
      ORGANIZATION_ADMIN: 0,
      ORGANIZATION_MEMBER: 0,
    };

    for (const currentUser of users) {
      distribution[currentUser.role]++;
    }

    return {
      filters,

      scope: {
        role: user.role,
        organizationId: organizationId ?? null,
      },

      totals: {
        total: users.length,

        platformAdmins: distribution.PLATFORM_ADMIN,

        organizationAdmins: distribution.ORGANIZATION_ADMIN,

        organizationMembers: distribution.ORGANIZATION_MEMBER,
      },

      distribution,

      growth: this.buildMonthlyGrowth(
        users.map((currentUser) => currentUser.createdAt),
      ),
    };
  }

  // =========================================================
  // ORGANIZATIONS
  // =========================================================

  async getOrganizationsAnalytics(
    filters: OrganizationsFilters,
    user: AnalyticsUser,
  ) {
    const organizationId = this.getOrganizationScope(user);

    const { startDate, endDate, status } = filters;

    const createdAt = this.getDateRange(startDate, endDate);

    const where: Prisma.OrganizationWhereInput = {
      ...(createdAt && {
        createdAt,
      }),

      ...(status && {
        status,
      }),

      ...(organizationId && {
        id: organizationId,
      }),
    };

    const organizations = await this.prisma.organization.findMany({
      where,

      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

    const distribution = {
      ACTIVE: 0,
      TRIAL: 0,
      SUSPENDED: 0,
      CANCELLED: 0,
    };

    for (const organization of organizations) {
      distribution[organization.status]++;
    }

    return {
      filters,

      scope: {
        role: user.role,
        organizationId: organizationId ?? null,
      },

      totals: {
        total: organizations.length,
        active: distribution.ACTIVE,
        trial: distribution.TRIAL,
        suspended: distribution.SUSPENDED,
        cancelled: distribution.CANCELLED,
      },

      distribution,

      organizations,

      growth: this.buildMonthlyGrowth(
        organizations.map((organization) => organization.createdAt),
      ),
    };
  }

  // =========================================================
  // ORGANIZATION PERFORMANCE
  // =========================================================

  async getOrganizationPerformance(
    filters: OrganizationPerformanceFilters,
    user: AnalyticsUser,
  ) {
    const organizationId = this.getOrganizationScope(
      user,
      filters.organizationId,
    );

    const {
      startDate,
      endDate,
      status,
      packageId,
      subscriptionStatus,
      paymentStatus,
      transactionStatus,
    } = filters;

    const organizationCreatedAt = this.getDateRange(startDate, endDate);

    const organizationWhere: Prisma.OrganizationWhereInput = {
      ...(organizationCreatedAt && {
        createdAt: organizationCreatedAt,
      }),

      ...(organizationId && {
        id: organizationId,
      }),

      ...(status && {
        status,
      }),
    };

    const organizations = await this.prisma.organization.findMany({
      where: organizationWhere,

      include: {
        users: {
          select: {
            id: true,
            role: true,
          },
        },

        subscriptions: {
          where: {
            ...(subscriptionStatus && {
              status: subscriptionStatus,
            }),

            ...(packageId && {
              packageId,
            }),
          },

          include: {
            package: true,
          },
        },

        payments: {
          where: {
            ...(paymentStatus && {
              status: paymentStatus,
            }),
          },
        },

        transactions: {
          where: {
            ...(transactionStatus && {
              status: transactionStatus,
            }),
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      filters,

      scope: {
        role: user.role,
        organizationId: organizationId ?? null,
      },

      totalOrganizations: organizations.length,

      organizations: organizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
        status: organization.status,

        users: {
          total: organization.users.length,

          admins: organization.users.filter(
            (currentUser) => currentUser.role === UserRole.ORGANIZATION_ADMIN,
          ).length,

          members: organization.users.filter(
            (currentUser) => currentUser.role === UserRole.ORGANIZATION_MEMBER,
          ).length,
        },

        subscriptions: organization.subscriptions.map((subscription) => ({
          id: subscription.id,

          status: subscription.status,

          package: {
            id: subscription.package.id,
            name: subscription.package.name,

            price: subscription.package.price,

            billingInterval: subscription.package.billingInterval,
          },

          startDate: subscription.startDate,

          endDate: subscription.endDate,
        })),

        payments: {
          count: organization.payments.length,

          successful: organization.payments.filter(
            (payment) => payment.status === PaymentStatus.SUCCESS,
          ).length,

          total: organization.payments.reduce(
            (sum, payment) => sum + Number(payment.amount),
            0,
          ),
        },

        transactions: {
          count: organization.transactions.length,

          successful: organization.transactions.filter(
            (transaction) => transaction.status === TransactionStatus.SUCCESS,
          ).length,

          total: organization.transactions.reduce(
            (sum, transaction) => sum + Number(transaction.amount),
            0,
          ),
        },
      })),
    };
  }

  // =========================================================
  // PACKAGES
  // =========================================================

  async getPackagesAnalytics(filters: PackagesFilters, user: AnalyticsUser) {
    const organizationId = this.getOrganizationScope(user);

    const { startDate, endDate, packageId, billingInterval, isActive } =
      filters;

    const createdAt = this.getDateRange(startDate, endDate);

    const where: Prisma.SubscriptionPackageWhereInput = {
      ...(createdAt && {
        createdAt,
      }),

      ...(packageId && {
        id: packageId,
      }),

      ...(billingInterval && {
        billingInterval,
      }),

      ...(isActive !== undefined && {
        isActive,
      }),
    };

    const packages = await this.prisma.subscriptionPackage.findMany({
      where,

      include: {
        subscriptions: {
          where: {
            ...(organizationId && {
              organizationId,
            }),

            ...(createdAt && {
              createdAt,
            }),
          },

          select: {
            id: true,
            status: true,
            organizationId: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      filters,

      scope: {
        role: user.role,
        organizationId: organizationId ?? null,
      },

      totals: {
        packages: packages.length,

        active: packages.filter((pkg) => pkg.isActive).length,

        inactive: packages.filter((pkg) => !pkg.isActive).length,
      },

      packages: packages.map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        price: pkg.price,
        billingInterval: pkg.billingInterval,
        isActive: pkg.isActive,

        subscriptions: {
          total: pkg.subscriptions.length,

          active: pkg.subscriptions.filter(
            (subscription) => subscription.status === SubscriptionStatus.ACTIVE,
          ).length,

          pending: pkg.subscriptions.filter(
            (subscription) =>
              subscription.status === SubscriptionStatus.PENDING,
          ).length,

          failed: pkg.subscriptions.filter(
            (subscription) => subscription.status === SubscriptionStatus.FAILED,
          ).length,

          cancelled: pkg.subscriptions.filter(
            (subscription) =>
              subscription.status === SubscriptionStatus.CANCELLED,
          ).length,

          expired: pkg.subscriptions.filter(
            (subscription) =>
              subscription.status === SubscriptionStatus.EXPIRED,
          ).length,
        },
      })),
    };
  }

  // =========================================================
  // SUBSCRIPTIONS
  // =========================================================

  async getSubscriptionsAnalytics(
    filters: SubscriptionsFilters,
    user: AnalyticsUser,
  ) {
    const organizationId = this.getOrganizationScope(
      user,
      filters.organizationId,
    );

    const { startDate, endDate, status, packageId, billingInterval } = filters;

    const createdAt = this.getDateRange(startDate, endDate);

    const where: Prisma.OrganizationSubscriptionWhereInput = {
      ...(createdAt && {
        createdAt,
      }),

      ...(status && {
        status,
      }),

      ...(organizationId && {
        organizationId,
      }),

      ...(packageId && {
        packageId,
      }),

      ...(billingInterval && {
        package: {
          billingInterval,
        },
      }),
    };

    const subscriptions = await this.prisma.organizationSubscription.findMany({
      where,

      select: {
        id: true,
        status: true,
        createdAt: true,
        startDate: true,
        endDate: true,
        organizationId: true,
        packageId: true,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

    const distribution = {
      pending: 0,
      active: 0,
      failed: 0,
      cancelled: 0,
      expired: 0,
    };

    for (const subscription of subscriptions) {
      const key =
        subscription.status.toLowerCase() as keyof typeof distribution;

      distribution[key]++;
    }

    return {
      filters,

      scope: {
        role: user.role,
        organizationId: organizationId ?? null,
      },

      totals: {
        total: subscriptions.length,

        pending: distribution.pending,

        active: distribution.active,

        failed: distribution.failed,

        cancelled: distribution.cancelled,

        expired: distribution.expired,
      },

      distribution,

      subscriptions,

      growth: this.buildMonthlyGrowth(
        subscriptions.map((subscription) => subscription.createdAt),
      ),
    };
  }

  // =========================================================
  // SUBSCRIPTION REVENUE
  // =========================================================

  async getSubscriptionRevenue(
    filters: SubscriptionRevenueFilters,
    user: AnalyticsUser,
  ) {
    const organizationId = this.getOrganizationScope(
      user,
      filters.organizationId,
    );

    const { startDate, endDate, packageId, billingInterval, status } = filters;

    const createdAt = this.getDateRange(startDate, endDate);

    const where: Prisma.OrganizationSubscriptionWhereInput = {
      ...(createdAt && {
        createdAt,
      }),

      ...(packageId && {
        packageId,
      }),

      ...(organizationId && {
        organizationId,
      }),

      ...(status && {
        status,
      }),

      ...(billingInterval && {
        package: {
          billingInterval,
        },
      }),
    };

    const subscriptions = await this.prisma.organizationSubscription.findMany({
      where,

      include: {
        package: {
          select: {
            id: true,
            name: true,
            price: true,
            billingInterval: true,
          },
        },
      },
    });

    const totalRevenue = subscriptions.reduce(
      (sum, subscription) => sum + Number(subscription.package.price),
      0,
    );

    const byPackage = new Map<string, number>();

    for (const subscription of subscriptions) {
      const name = subscription.package.name;

      byPackage.set(
        name,
        (byPackage.get(name) ?? 0) + Number(subscription.package.price),
      );
    }

    return {
      filters,

      scope: {
        role: user.role,
        organizationId: organizationId ?? null,
      },

      totals: {
        subscriptions: subscriptions.length,

        revenue: totalRevenue,
      },

      byPackage: Array.from(byPackage.entries()).map(
        ([packageName, revenue]) => ({
          packageName,
          revenue,
        }),
      ),
    };
  }

  // =========================================================
  // PAYMENTS
  // =========================================================

  async getPaymentsAnalytics(filters: PaymentsFilters, user: AnalyticsUser) {
    const organizationId = this.getOrganizationScope(
      user,
      filters.organizationId,
    );

    const { startDate, endDate, status, currency, packageId } = filters;

    const createdAt = this.getDateRange(startDate, endDate);

    const where: Prisma.PaymentWhereInput = {
      ...(createdAt && {
        createdAt,
      }),

      ...(status && {
        status,
      }),

      ...(organizationId && {
        organizationId,
      }),

      ...(currency && {
        currency,
      }),

      ...(packageId && {
        organization: {
          subscriptions: {
            some: {
              packageId,

              ...(organizationId && {
                organizationId,
              }),
            },
          },
        },
      }),
    };

    const payments = await this.prisma.payment.findMany({
      where,

      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        paidAt: true,
        createdAt: true,
        organizationId: true,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

    const distribution = {
      pending: 0,
      success: 0,
      failed: 0,
      refunded: 0,
    };

    for (const payment of payments) {
      const key = payment.status.toLowerCase() as keyof typeof distribution;

      distribution[key]++;
    }

    return {
      filters,

      scope: {
        role: user.role,
        organizationId: organizationId ?? null,
      },

      totals: {
        total: payments.length,

        pending: distribution.pending,

        success: distribution.success,

        failed: distribution.failed,

        refunded: distribution.refunded,
      },

      distribution,

      totalAmount: payments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0,
      ),

      growth: this.buildMonthlyGrowth(
        payments.map((payment) => payment.createdAt),
      ),
    };
  }

  // =========================================================
  // PAYMENT REVENUE
  // =========================================================

  async getPaymentRevenue(filters: PaymentRevenueFilters, user: AnalyticsUser) {
    const organizationId = this.getOrganizationScope(
      user,
      filters.organizationId,
    );

    const { startDate, endDate, status, currency, packageId } = filters;

    const createdAt = this.getDateRange(startDate, endDate);

    const where: Prisma.PaymentWhereInput = {
      ...(createdAt && {
        createdAt,
      }),

      ...(organizationId && {
        organizationId,
      }),

      ...(status && {
        status,
      }),

      ...(currency && {
        currency,
      }),

      ...(packageId && {
        organization: {
          subscriptions: {
            some: {
              packageId,

              ...(organizationId && {
                organizationId,
              }),
            },
          },
        },
      }),
    };

    const payments = await this.prisma.payment.findMany({
      where,

      select: {
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

    const successfulPayments = payments.filter(
      (payment) => payment.status === PaymentStatus.SUCCESS,
    );

    const revenue = successfulPayments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );

    const currencyMap: Record<string, number> = {};

    for (const payment of successfulPayments) {
      currencyMap[payment.currency] =
        (currencyMap[payment.currency] ?? 0) + Number(payment.amount);
    }

    return {
      filters,

      scope: {
        role: user.role,
        organizationId: organizationId ?? null,
      },

      totals: {
        payments: payments.length,

        successfulPayments: successfulPayments.length,

        revenue,
      },

      byCurrency: Object.entries(currencyMap).map(([currency, amount]) => ({
        currency,
        amount,
      })),

      growth: this.buildMonthlyGrowth(
        successfulPayments.map((payment) => payment.createdAt),
      ),
    };
  }

  // =========================================================
  // TRANSACTIONS
  // =========================================================

  async getTransactionsAnalytics(
    filters: TransactionsFilters,
    user: AnalyticsUser,
  ) {
    const organizationId = this.getOrganizationScope(
      user,
      filters.organizationId,
    );

    const { startDate, endDate, status, currency } = filters;

    const createdAt = this.getDateRange(startDate, endDate);

    const where: Prisma.TransactionWhereInput = {
      ...(createdAt && {
        createdAt,
      }),

      ...(status && {
        status,
      }),

      ...(organizationId && {
        organizationId,
      }),

      ...(currency && {
        currency,
      }),
    };

    const transactions = await this.prisma.transaction.findMany({
      where,

      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
        organizationId: true,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

    const distribution = {
      pending: 0,
      success: 0,
      failed: 0,
      refunded: 0,
      rolled_back: 0,
    };

    for (const transaction of transactions) {
      const key = transaction.status.toLowerCase() as keyof typeof distribution;

      distribution[key]++;
    }

    return {
      filters,

      scope: {
        role: user.role,
        organizationId: organizationId ?? null,
      },

      totals: {
        total: transactions.length,

        pending: distribution.pending,

        success: distribution.success,

        failed: distribution.failed,

        refunded: distribution.refunded,

        rolledBack: distribution.rolled_back,
      },

      distribution,

      totalAmount: transactions.reduce(
        (sum, transaction) => sum + Number(transaction.amount),
        0,
      ),

      growth: this.buildMonthlyGrowth(
        transactions.map((transaction) => transaction.createdAt),
      ),
    };
  }

  // =========================================================
  // TRANSACTION REVENUE
  // =========================================================

  async getTransactionRevenue(
    filters: TransactionRevenueFilters,
    user: AnalyticsUser,
  ) {
    const organizationId = this.getOrganizationScope(
      user,
      filters.organizationId,
    );

    const { startDate, endDate, status, currency } = filters;

    const createdAt = this.getDateRange(startDate, endDate);

    const where: Prisma.TransactionWhereInput = {
      ...(createdAt && {
        createdAt,
      }),

      ...(organizationId && {
        organizationId,
      }),

      ...(status && {
        status,
      }),

      ...(currency && {
        currency,
      }),
    };

    const transactions = await this.prisma.transaction.findMany({
      where,

      select: {
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

    const successful = transactions.filter(
      (transaction) => transaction.status === TransactionStatus.SUCCESS,
    );

    const revenue = successful.reduce(
      (sum, transaction) => sum + Number(transaction.amount),
      0,
    );

    const currencyMap: Record<string, number> = {};

    for (const transaction of successful) {
      currencyMap[transaction.currency] =
        (currencyMap[transaction.currency] ?? 0) + Number(transaction.amount);
    }

    return {
      filters,

      scope: {
        role: user.role,
        organizationId: organizationId ?? null,
      },

      totals: {
        transactions: transactions.length,

        successfulTransactions: successful.length,

        revenue,
      },

      byCurrency: Object.entries(currencyMap).map(([currency, amount]) => ({
        currency,
        amount,
      })),

      growth: this.buildMonthlyGrowth(
        successful.map((transaction) => transaction.createdAt),
      ),
    };
  }

  // =========================================================
  // GROWTH
  // =========================================================

  async getGrowthAnalytics(filters: GrowthFilters, user: AnalyticsUser) {
    const organizationId = this.getOrganizationScope(user);

    const {
      startDate,
      endDate,
      organizationStatus,
      userRole,
      packageId,
      billingInterval,
    } = filters;

    const createdAt = this.getDateRange(startDate, endDate);

    const organizations = await this.prisma.organization.findMany({
      where: {
        ...(createdAt && {
          createdAt,
        }),

        ...(organizationStatus && {
          status: organizationStatus,
        }),

        ...(organizationId && {
          id: organizationId,
        }),
      },

      select: {
        createdAt: true,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

    const users = await this.prisma.user.findMany({
      where: {
        ...(createdAt && {
          createdAt,
        }),

        ...(userRole && {
          role: userRole,
        }),

        ...(organizationId && {
          organizationId,
        }),
      },

      select: {
        createdAt: true,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

    const subscriptions = await this.prisma.organizationSubscription.findMany({
      where: {
        ...(createdAt && {
          createdAt,
        }),

        ...(organizationId && {
          organizationId,
        }),

        ...(packageId && {
          packageId,
        }),

        ...(billingInterval && {
          package: {
            billingInterval,
          },
        }),
      },

      select: {
        createdAt: true,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      filters,

      scope: {
        role: user.role,
        organizationId: organizationId ?? null,
      },

      organizations: {
        total: organizations.length,

        growth: this.buildMonthlyGrowth(
          organizations.map((organization) => organization.createdAt),
        ),
      },

      users: {
        total: users.length,

        growth: this.buildMonthlyGrowth(
          users.map((currentUser) => currentUser.createdAt),
        ),
      },

      subscriptions: {
        total: subscriptions.length,

        growth: this.buildMonthlyGrowth(
          subscriptions.map((subscription) => subscription.createdAt),
        ),
      },
    };
  }
}
