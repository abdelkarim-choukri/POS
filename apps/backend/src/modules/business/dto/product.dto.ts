import { IsString, IsOptional, IsNumber, IsUUID, IsBoolean, IsInt, MaxLength, Min, Max } from 'class-validator';

export class CreateProductDto {
  @IsUUID()
  category_id: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost_price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsInt()
  sort_order?: number;

  // Real Product columns previously missing validators (rejected by forbidNonWhitelisted).
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  tva_rate?: number;

  @IsOptional()
  @IsBoolean()
  track_stock?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  reorder_point?: number;

  @IsOptional()
  @IsUUID()
  brand_id?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost_price?: number;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsInt()
  sort_order?: number;

  // Real Product columns previously missing validators (rejected by forbidNonWhitelisted).
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  tva_rate?: number;

  @IsOptional()
  @IsBoolean()
  track_stock?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  reorder_point?: number;

  @IsOptional()
  @IsUUID()
  brand_id?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CreateVariantDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price_override?: number;

  @IsOptional()
  @IsString()
  sku?: string;
}

export class UpdateVariantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price_override?: number;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
