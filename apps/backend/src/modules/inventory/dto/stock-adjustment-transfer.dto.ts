import {
  IsString, IsOptional, IsNumber, IsUUID, IsInt, IsIn,
  IsNotEmpty, ValidateNested, MinLength, Min, Max, ArrayMinSize, IsNotIn,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Stock Adjustment DTOs ──────────────────────────────────────────────────────

export class StockAdjustmentItemDto {
  @IsUUID() product_id: string;
  @IsOptional() @IsUUID() variant_id?: string;
  @IsUUID() batch_id: string;
  @IsNumber() @IsNotIn([0]) proposed_delta: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateAdjustmentDto {
  @IsUUID() warehouse_id: string;
  @IsString() @MinLength(10) reason: string;
  @IsOptional() @IsString() notes?: string;
  @ValidateNested({ each: true })
  @Type(() => StockAdjustmentItemDto)
  @ArrayMinSize(1)
  items: StockAdjustmentItemDto[];
}

export class RejectAdjustmentDto {
  @IsString() @IsNotEmpty() reason: string;
}

export class ListAdjustmentsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['draft', 'pending_approval', 'approved', 'posted', 'rejected']) status?: string;
  @IsOptional() @IsUUID() warehouse_id?: string;
  @IsOptional() @IsString() from_date?: string;
  @IsOptional() @IsString() to_date?: string;
}

// ── Stock Transfer DTOs ────────────────────────────────────────────────────────

export class StockTransferItemDto {
  @IsUUID() product_id: string;
  @IsOptional() @IsUUID() variant_id?: string;
  @IsUUID() batch_id: string;
  @IsNumber() @Min(0.001) quantity: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateTransferDto {
  @IsUUID() source_warehouse_id: string;
  @IsUUID() target_warehouse_id: string;
  @IsOptional() @IsString() notes?: string;
  @ValidateNested({ each: true })
  @Type(() => StockTransferItemDto)
  @ArrayMinSize(1)
  items: StockTransferItemDto[];
}

export class ListTransfersQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['draft', 'posted', 'cancelled']) status?: string;
  @IsOptional() @IsUUID() warehouse_id?: string;
  @IsOptional() @IsString() from_date?: string;
  @IsOptional() @IsString() to_date?: string;
}
