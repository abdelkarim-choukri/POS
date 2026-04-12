import { IsOptional, IsDateString, IsUUID } from 'class-validator';

export class ReportFilterDto {
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsUUID()
  location_id?: string;
}

export class RefundDto {
  @IsOptional()
  amount?: number;

  @IsOptional()
  reason?: string;

  @IsOptional()
  refund_method?: string;
}
