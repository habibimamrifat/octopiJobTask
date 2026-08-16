import {
  BillingInterval,
  OrganizationStatus,
  PaymentStatus,
  SubscriptionStatus,
  TransactionStatus,
  UserRole,
} from '@prisma/client';

export interface AnalyticsUser {
  id: string;
  role: UserRole;
  organizationId?: string | null;
}

export interface DateFilter {
  startDate?: string;
  endDate?: string;
}

export interface OverviewFilters extends DateFilter {
  organizationStatus?: OrganizationStatus;
  subscriptionStatus?: SubscriptionStatus;
  paymentStatus?: PaymentStatus;
  transactionStatus?: TransactionStatus;
  packageId?: string;
  billingInterval?: BillingInterval;
  currency?: string;
}

export interface UsersFilters extends DateFilter {
  role?: UserRole;
  organizationId?: string;
}

export interface OrganizationsFilters extends DateFilter {
  status?: OrganizationStatus;
}

export interface OrganizationPerformanceFilters extends DateFilter {
  organizationId?: string;
  status?: OrganizationStatus;
  packageId?: string;
  subscriptionStatus?: SubscriptionStatus;
  paymentStatus?: PaymentStatus;
  transactionStatus?: TransactionStatus;
}

export interface PackagesFilters extends DateFilter {
  packageId?: string;
  billingInterval?: BillingInterval;
  isActive?: boolean;
}

export interface SubscriptionsFilters extends DateFilter {
  status?: SubscriptionStatus;
  organizationId?: string;
  packageId?: string;
  billingInterval?: BillingInterval;
}

export interface SubscriptionRevenueFilters extends DateFilter {
  packageId?: string;
  organizationId?: string;
  billingInterval?: BillingInterval;
  status?: SubscriptionStatus;
}

export interface PaymentsFilters extends DateFilter {
  status?: PaymentStatus;
  organizationId?: string;
  currency?: string;
  packageId?: string;
}

export interface PaymentRevenueFilters extends DateFilter {
  organizationId?: string;
  status?: PaymentStatus;
  currency?: string;
  packageId?: string;
}

export interface TransactionsFilters extends DateFilter {
  status?: TransactionStatus;
  organizationId?: string;
  currency?: string;
}

export interface TransactionRevenueFilters extends DateFilter {
  organizationId?: string;
  status?: TransactionStatus;
  currency?: string;
}

export interface GrowthFilters extends DateFilter {
  organizationStatus?: OrganizationStatus;
  userRole?: UserRole;
  packageId?: string;
  billingInterval?: BillingInterval;
}
