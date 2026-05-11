import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { OrderStatus } from '../../../common/enums';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  order_status: OrderStatus;
}

export class GetKdsItemsDto {
  @IsOptional()
  @IsUUID()
  location_id?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateKdsItemStatusDto {
  @IsString()
  status: string;
}
