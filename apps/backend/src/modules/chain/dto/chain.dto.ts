import { IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class LinkParentDto {
  @IsUUID() @IsNotEmpty() parent_business_id: string;
}

export class SyncConfigDto {
  @IsBoolean() sync_categories: boolean;
  @IsBoolean() sync_products: boolean;
  @IsBoolean() sync_variants: boolean;
  @IsBoolean() sync_modifiers: boolean;
  @IsBoolean() sync_prices: boolean;
  @IsBoolean() auto_sync_on_change: boolean;
  @IsArray() @IsUUID(undefined, { each: true }) child_business_ids: string[];
}

export class TriggerSyncDto {
  @IsArray() @IsUUID(undefined, { each: true }) child_business_ids: string[];
  @IsArray() @IsString({ each: true }) @IsIn(['categories', 'products', 'variants', 'modifiers'], { each: true }) sync_what: string[];
}

export class PullProductDto {
  @IsUUID() @IsNotEmpty() parent_product_id: string;
}

export class RolloutPromotionDto {
  @IsArray() @IsUUID(undefined, { each: true }) child_business_ids: string[];
  @IsBoolean() skip_validation: boolean;
}

export class ValidateSubStoresDto {
  @IsArray() @IsUUID(undefined, { each: true }) child_business_ids: string[];
}

export class SwitchBusinessDto {
  @IsUUID() @IsNotEmpty() business_id: string;
}

export class GrantBusinessAccessDto {
  @IsArray() @IsUUID(undefined, { each: true }) business_ids: string[];
  @IsObject() role_per_business: Record<string, string>;
}

export class ChainDashboardQueryDto {
  @IsString() from_date: string;
  @IsString() to_date: string;
}

export class ChainTransactionsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @IsUUID() child_business_id?: string;
  @IsOptional() @IsString() from_date?: string;
  @IsOptional() @IsString() to_date?: string;
}

export class FulfillChildPoDto {
  @IsUUID() @IsNotEmpty() source_warehouse_id: string;
}
