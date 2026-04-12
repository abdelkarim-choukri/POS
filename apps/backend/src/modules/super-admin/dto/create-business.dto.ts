import { IsString, IsEmail, IsUUID, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateBusinessDto {
  @IsUUID()
  business_type_id: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  legal_name?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  // Owner account (created alongside business)
  @IsEmail()
  owner_email: string;

  @IsString()
  @MinLength(6)
  owner_password: string;

  @IsString()
  @MaxLength(100)
  owner_first_name: string;

  @IsString()
  @MaxLength(100)
  owner_last_name: string;

  // Subscription
  @IsOptional()
  @IsString()
  plan_name?: string;
}

export class UpdateBusinessDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  legal_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  logo_url?: string;
}

export class UpdateBusinessStatusDto {
  is_active: boolean;
}
