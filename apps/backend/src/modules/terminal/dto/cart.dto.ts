import {
  IsArray, IsUUID, IsInt, IsNumber, IsOptional, Min, ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CartItemDto {
  @IsUUID()
  product_id: string;

  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsInt()
  @Min(1)
  @Transform(({ value }) => Number(value))
  quantity: number;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  unit_price_ttc: number;
}

export class EvaluateCartDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];

  @IsOptional()
  @IsUUID()
  customer_id?: string;
}
