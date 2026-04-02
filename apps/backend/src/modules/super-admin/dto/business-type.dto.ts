import { IsString, IsOptional, IsBoolean, MaxLength, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBusinessTypeDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsString()
  @MaxLength(100)
  label: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class FeatureToggleDto {
  @IsString()
  feature_key: string;

  @IsBoolean()
  is_enabled: boolean;

  @IsOptional()
  config_json?: Record<string, any>;
}

export class UpdateFeaturesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeatureToggleDto)
  features: FeatureToggleDto[];
}
