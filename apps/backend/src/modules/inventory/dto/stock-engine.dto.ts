import {
  IsString, IsOptional, IsBoolean, IsInt, IsNumber, IsUUID,
  IsIn, Min, IsNotEmpty, ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// ── INV-040: List Batches ─────────────────────────────────────────────────────

export class ListBatchesQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @IsUUID() warehouse_id?: string;
  @IsOptional() @IsUUID() product_id?: string;
  @IsOptional() @IsString() expires_before?: string;
  @IsOptional() @Type(() => Number) @IsNumber() min_quantity?: number;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() is_active?: boolean;
}

// ── INV-041: Receive Batch ────────────────────────────────────────────────────

export class CreateBatchDto {
  @IsUUID() @IsNotEmpty() warehouse_id: string;
  @IsUUID() @IsNotEmpty() product_id: string;
  @IsOptional() @IsUUID() variant_id?: string;
  @IsString() @IsNotEmpty() batch_code: string;
  @IsNumber() @Min(0.0001) quantity_initial: number;
  @IsNumber() @Min(0) unit_cost: number;
  @IsOptional() @IsNumber() @Min(0) unit_cost_tva_rate?: number;
  @IsOptional() @IsString() unit_of_measure?: string;
  @IsOptional() @IsString() expires_at?: string;
  @IsOptional() @IsUUID() vendor_id?: string;
  @IsOptional() @IsUUID() purchase_order_id?: string;
}

// ── INV-042: Adjust Batch ─────────────────────────────────────────────────────

export class AdjustBatchDto {
  @IsNumber() delta: number;
  @IsString() @IsNotEmpty() reason: string;
}

// ── INV-043: Dispose Batch ────────────────────────────────────────────────────

export class DisposeBatchDto {
  @IsNumber() @Min(0.0001) quantity: number;
  @IsString() @IsIn(['expired', 'damaged', 'other']) reason: string;
  @IsOptional() @IsString() notes?: string;
}

// ── INV-044: Transfer Batch ───────────────────────────────────────────────────

export class TransferBatchDto {
  @IsUUID() target_warehouse_id: string;
  @IsNumber() @Min(0.0001) quantity: number;
  @IsOptional() @IsString() notes?: string;
}

// ── INV-060–065: Stock Templates ──────────────────────────────────────────────

export class CreateStockTemplateItemDto {
  @IsUUID() product_id: string;
  @IsOptional() @IsUUID() variant_id?: string;
  @IsNumber() @Min(0.0001) default_quantity: number;
}

export class CreateStockTemplateDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsUUID() default_vendor_id?: string;
  @IsOptional() @IsUUID() default_warehouse_id?: string;
  @ValidateNested({ each: true })
  @Type(() => CreateStockTemplateItemDto)
  items: CreateStockTemplateItemDto[];
}

export class UpdateStockTemplateDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsUUID() default_vendor_id?: string;
  @IsOptional() @IsUUID() default_warehouse_id?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateStockTemplateItemDto)
  items?: CreateStockTemplateItemDto[];
}

export class GeneratePurchaseOrderDto {
  @IsOptional() @IsUUID() vendor_id?: string;
  @IsOptional() @IsUUID() warehouse_id?: string;
  @IsOptional() @IsString() expected_delivery_date?: string;
}

// ── INV-070–077: Purchase Orders ──────────────────────────────────────────────

export class ListPurchaseOrdersQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsUUID() vendor_id?: string;
  @IsOptional() @IsUUID() warehouse_id?: string;
  @IsOptional() @IsString() from_date?: string;
  @IsOptional() @IsString() to_date?: string;
  @IsOptional() @IsString() search?: string;
}

export class CreatePurchaseOrderItemDto {
  @IsUUID() product_id: string;
  @IsOptional() @IsUUID() variant_id?: string;
  @IsNumber() @Min(0.0001) quantity_ordered: number;
  @IsOptional() @IsString() unit_of_measure?: string;
  @IsNumber() @Min(0) unit_cost_ht: number;
  @IsOptional() @IsNumber() @Min(0) tva_rate?: number;
}

export class CreatePurchaseOrderDto {
  @IsOptional() @IsUUID() vendor_id?: string;
  @IsUUID() @IsNotEmpty() warehouse_id: string;
  @IsOptional() @IsString() expected_delivery_date?: string;
  @IsOptional() @IsString() notes?: string;
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[];
}

export class UpdatePurchaseOrderDto {
  @IsOptional() @IsUUID() vendor_id?: string;
  @IsOptional() @IsUUID() warehouse_id?: string;
  @IsOptional() @IsString() expected_delivery_date?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items?: CreatePurchaseOrderItemDto[];
}

export class ReceivePurchaseOrderItemDto {
  @IsUUID() po_item_id: string;
  @IsNumber() @Min(0.0001) quantity_received: number;
  @IsString() @IsNotEmpty() batch_code: string;
  @IsOptional() @IsString() expires_at?: string;
}

export class ReceivePurchaseOrderDto {
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseOrderItemDto)
  received_items: ReceivePurchaseOrderItemDto[];
}

// ── INV-081–082: Expiration Alerts ────────────────────────────────────────────

export class ListExpirationAlertsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() is_resolved?: boolean;
  @IsOptional() @IsIn(['expired', 'expires_soon']) severity?: string;
}

export class ResolveExpirationAlertDto {
  @IsString() @IsIn(['disposed', 'sold', 'extended', 'other']) action: string;
  @IsOptional() @IsString() notes?: string;
}

// ── INV-094, INV-096: Discrepancy Alerts ─────────────────────────────────────

export class ListDiscrepancyAlertsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() is_resolved?: boolean;
  @IsOptional() @IsIn(['offline_sync', 'manual_count', 'system_detected']) source?: string;
  @IsOptional() @IsUUID() warehouse_id?: string;
  @IsOptional() @IsUUID() product_id?: string;
}

export class ResolveDiscrepancyAlertDto {
  @IsString() @IsIn(['manual_recount', 'accept_loss', 'adjust_batch']) action: string;
  @IsOptional() @IsNumber() adjustment_quantity?: number;
  @IsOptional() @IsString() notes?: string;
}
