import { IsString, IsUUID, IsOptional, MaxLength } from 'class-validator';

export class CreateTerminalDto {
  @IsString()
  @MaxLength(20)
  terminal_code: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  device_name?: string;
}

export class AssignTerminalDto {
  @IsUUID()
  location_id: string;
}
