import { IsString, IsOptional, IsNumber, IsBoolean, IsInt, IsUUID, MaxLength, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateModifierGroupDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsBoolean()
  is_required?: boolean;

  @IsOptional()
  @IsInt()
  max_selections?: number;

  @IsOptional()
  @IsInt()
  sort_order?: number;
}

export class UpdateModifierGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  is_required?: boolean;

  @IsOptional()
  @IsInt()
  max_selections?: number;

  @IsOptional()
  @IsInt()
  sort_order?: number;
}

export class CreateModifierDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsNumber()
  price?: number;
}

export class LinkModifierGroupDto {
  @IsUUID()
  modifier_group_id: string;
}
