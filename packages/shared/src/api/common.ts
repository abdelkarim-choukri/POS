// Enums matching backend's common/enums/index.ts
export enum SubscriptionStatus { ACTIVE='active', SUSPENDED='suspended', CANCELLED='cancelled', TRIAL='trial' }
export enum UserRole { OWNER='owner', MANAGER='manager', EMPLOYEE='employee' }
export enum TransactionStatus { COMPLETED='completed', VOIDED='voided', REFUNDED='refunded', PARTIAL_REFUND='partial_refund' }
export enum OrderStatus { NEW='new', PREPARING='preparing', READY='ready', SERVED='served' }
export enum PaymentMethod { CASH='cash', CARD_CMI='card_cmi', CARD_PAYZONE='card_payzone', OTHER='other' }
export enum RefundMethod { CASH='cash', CARD_REVERSAL='card_reversal' }
export enum CustomerGender { MALE='male', FEMALE='female', UNSPECIFIED='unspecified' }
export enum AttributeDataType { TEXT='text', NUMBER='number', DATE='date', BOOLEAN='boolean', ENUM='enum' }

export interface PaginatedResponse<T> { data: T[]; total: number; page: number; limit: number; totalPages: number; }
export interface ErrorResponse { error: string; message?: string; statusCode?: number; }
export interface SuccessResponse { success: boolean; message?: string; }
export interface PaginationParams { page?: number; limit?: number; }
