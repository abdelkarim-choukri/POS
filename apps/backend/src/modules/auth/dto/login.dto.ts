import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class PinLoginDto {
  @IsString()
  pin: string;

  @IsString()
  terminal_code: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  current_password: string;

  @IsString()
  @MinLength(6)
  new_password: string;
}

export class SuperAdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
