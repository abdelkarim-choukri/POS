import {
  IsUUID, IsOptional, IsInt, Min, IsString, MinLength, IsBoolean,
  IsArray, ValidateNested, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// RST-030
export class FloorPlanQueryDto {
  @IsOptional()
  @IsUUID()
  location_id?: string;

  @IsOptional()
  @IsUUID()
  area_id?: string;
}

// RST-031
export class OpenTableDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  guest_count?: number;

  @IsOptional()
  @IsUUID()
  customer_id?: string;
}

// RST-032
export class AddSessionItemDto {
  @IsUUID()
  product_id: string;

  @IsOptional()
  @IsUUID()
  variant_id?: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsArray()
  modifiers?: any[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsUUID()
  customer_id?: string;
}

export class AddItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddSessionItemDto)
  items: AddSessionItemDto[];
}

// RST-033
export class ModifyItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  // null = detach customer; undefined = don't touch
  @IsOptional()
  @IsUUID()
  customer_id?: string | null;
}

// RST-037
export class TransferItemsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  item_ids: string[];

  @IsUUID()
  target_table_session_id: string;
}

// RST-038
export class CancelSessionDto {
  @IsString()
  @MinLength(10)
  reason: string;

  @IsOptional()
  @IsBoolean()
  force_close_partial?: boolean;
}
