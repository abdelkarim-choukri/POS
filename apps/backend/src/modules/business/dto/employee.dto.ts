import { IsString, IsEmail, IsOptional, IsBoolean, IsEnum, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../../../common/enums';

export class CreateEmployeeDto {
  @IsString()
  @MaxLength(100)
  first_name: string;

  @IsString()
  @MaxLength(100)
  last_name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(6)
  pin?: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  can_void?: boolean;

  @IsOptional()
  @IsBoolean()
  can_refund?: boolean;

  @IsOptional()
  @IsBoolean()
  dashboard_access?: boolean;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  pin?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  can_void?: boolean;

  @IsOptional()
  @IsBoolean()
  can_refund?: boolean;

  @IsOptional()
  @IsBoolean()
  dashboard_access?: boolean;
}
