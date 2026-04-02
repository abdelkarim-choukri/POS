import { IsString, IsUUID, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateSubscriptionDto {
  @IsUUID()
  business_id: string;

  @IsString()
  plan_name: string;

  @IsDateString()
  start_date: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsNumber()
  price_mad: number;
}

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  plan_name?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  price_mad?: number;
}
