// apps/backend/src/modules/terminal/dto/transaction.dto.ts
import {
  IsString, IsOptional, IsNumber, IsUUID,
  IsEnum, IsArray, ValidateNested, IsInt,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaymentMethod } from '../../../common/enums';

// Converts null → undefined so @IsOptional() correctly skips validation.
// Without this, sending null for variant_id fails @IsUUID() every time.
const nullToUndefined = ({ value }: { value: any }) =>
  value === null ? undefined : value;

export class TransactionItemDto {
  @IsUUID()
  product_id: string;

  @IsOptional()
  @IsUUID()
  @Transform(nullToUndefined)            // ← fix: null sent from offline payload → undefined
  variant_id?: string;

  @IsString()
  product_name: string;

  @IsOptional()
  @IsString()
  @Transform(nullToUndefined)            // ← same fix for variant_name
  variant_name?: string;

  @IsInt()
  @Transform(({ value }) => Math.round(Number(value)))  // ensure integer, not 1.0
  quantity: number;

  @IsNumber()
  @Transform(({ value }) => Number(value))
  unit_price: number;

  @IsOptional()
  @Transform(nullToUndefined)
  modifiers_json?: Record<string, any>;

  @IsNumber()
  @Transform(({ value }) => Number(value))
  line_total: number;
}

export class CreateTransactionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionItemDto)
  items: TransactionItemDto[];

  @IsNumber()
  @Transform(({ value }) => Number(value))
  subtotal: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value != null ? Number(value) : undefined)
  tax_amount?: number;

  @IsNumber()
  @Transform(({ value }) => Number(value))
  total: number;

  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  @Transform(nullToUndefined)
  terminal_id?: string;

  @IsOptional()
  @IsUUID()
  @Transform(nullToUndefined)
  location_id?: string;

  @IsOptional()
  @IsUUID()
  @Transform(nullToUndefined)
  customer_id?: string;
}

export class QuickAddCustomerDto {
  @IsString()
  phone: string;

  @IsString()
  first_name: string;

  @IsString()
  last_name: string;
}

export class VoidTransactionDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  manager_pin?: string;
}