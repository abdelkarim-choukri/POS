import { IsDateString } from 'class-validator';

export class TvaDeclarationQueryDto {
  @IsDateString()
  from_date: string;

  @IsDateString()
  to_date: string;
}
