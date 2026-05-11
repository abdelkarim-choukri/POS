import {
  IsString, IsUUID, IsOptional, IsInt, IsBoolean, MinLength, Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

// ── Dining Area ───────────────────────────────────────────────────────────────

export class CreateDiningAreaDto {
  @IsUUID()
  location_id: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}

export class UpdateDiningAreaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class ListDiningAreasQueryDto {
  @IsOptional()
  @IsUUID()
  location_id?: string;

  @IsOptional()
  @Transform(({ value }) => (value === 'false' ? false : value === 'true' ? true : value))
  @IsBoolean()
  is_active?: boolean;
}

// ── Table Type ────────────────────────────────────────────────────────────────

export class CreateTableTypeDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  default_capacity?: number;
}

export class UpdateTableTypeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  default_capacity?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

// ── Table ─────────────────────────────────────────────────────────────────────

export class CreateTableDto {
  @IsUUID()
  location_id: string;

  @IsUUID()
  area_id: string;

  @IsOptional()
  @IsUUID()
  table_type_id?: string;

  @IsString()
  @MinLength(1)
  table_number: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsInt()
  position_x?: number;

  @IsOptional()
  @IsInt()
  position_y?: number;
}

export class UpdateTableDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  table_number?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsUUID()
  area_id?: string;

  @IsOptional()
  @IsUUID()
  table_type_id?: string;

  @IsOptional()
  @IsInt()
  position_x?: number;

  @IsOptional()
  @IsInt()
  position_y?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class ListTablesQueryDto {
  @IsOptional()
  @IsUUID()
  location_id?: string;

  @IsOptional()
  @IsUUID()
  area_id?: string;

  @IsOptional()
  @IsUUID()
  table_type_id?: string;

  @IsOptional()
  @Transform(({ value }) => (value === 'false' ? false : value === 'true' ? true : value))
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  with_session_status?: boolean;
}
