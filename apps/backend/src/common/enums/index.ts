export enum SubscriptionStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  TRIAL = 'trial',
}

export enum UserRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  EMPLOYEE = 'employee',
}

export enum TransactionStatus {
  COMPLETED = 'completed',
  VOIDED = 'voided',
  REFUNDED = 'refunded',
  PARTIAL_REFUND = 'partial_refund',
}

export enum OrderStatus {
  NEW = 'new',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD_CMI = 'card_cmi',
  CARD_PAYZONE = 'card_payzone',
  OTHER = 'other',
}

export enum RefundMethod {
  CASH = 'cash',
  CARD_REVERSAL = 'card_reversal',
}

export enum SyncOperationType {
  TRANSACTION = 'transaction',
  CLOCK_IN = 'clock_in',
  CLOCK_OUT = 'clock_out',
  VOID = 'void',
}

export enum SyncStatus {
  PENDING = 'pending',
  SYNCED = 'synced',
  FAILED = 'failed',
}
