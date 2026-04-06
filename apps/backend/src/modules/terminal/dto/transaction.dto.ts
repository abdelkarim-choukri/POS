import { IsString, IsOptional, IsNumber, IsUUID, IsEnum, IsArray, ValidateNested, IsInt } from 'class-validator';
import { Type, Transform } from 'class-transformer';
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
  @Transform(({ value }) => Number(value))
  quantity: number;

  @IsNumber()
  @Transform(({ value }) => Number(value))
  unit_price: number;

  @IsOptional()
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
  terminal_id?: string;

  @IsOptional()
  @IsUUID()
  location_id?: string;
}

export class VoidTransactionDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  manager_pin?: string;
}
