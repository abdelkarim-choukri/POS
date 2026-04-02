import { IsString, IsOptional, IsNumber, IsUUID, IsEnum, IsArray, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../../../common/enums';

export class TransactionItemDto {
  @IsUUID()
  product_id: string;

  @IsOptional()
  @IsUUID()
  variant_id?: string;

  @IsString()
  product_name: string;

  @IsOptional()
  @IsString()
  variant_name?: string;

  @IsInt()
  quantity: number;

  @IsNumber()
  unit_price: number;

  @IsOptional()
  modifiers_json?: Record<string, any>;

  @IsNumber()
  line_total: number;
}

export class CreateTransactionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionItemDto)
  items: TransactionItemDto[];

  @IsNumber()
  subtotal: number;

  @IsOptional()
  @IsNumber()
  tax_amount?: number;

  @IsNumber()
  total: number;

  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class VoidTransactionDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  manager_pin?: string;
}
