import { IsEnum, IsUUID } from 'class-validator';
import { OrderStatus } from '../../../common/enums';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  order_status: OrderStatus;
}
