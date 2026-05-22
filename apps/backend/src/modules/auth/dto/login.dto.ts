import { IsEmail, IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(72)
  password: string;
}

export class PinLoginDto {
  @IsString()
  @MaxLength(10)
  pin: string;

  @IsString()
  terminal_code: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  current_password: string;

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  new_password: string;
}

export class SuperAdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(72)
  password: string;
}
