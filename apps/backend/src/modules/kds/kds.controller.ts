import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { KdsService } from './kds.service';
import { CurrentUser } from '../../common/decorators';

@ApiTags('KDS (Legacy)')
@Controller('kds')
export class KdsController {
  constructor(private kdsService: KdsService) {}

  @Get('orders')
  getActiveOrders(
    @CurrentUser('business_id') businessId: string,
    @Query('location_id') locationId: string,
  ) {
    return this.kdsService.getActiveOrders(locationId);
  }

  @Patch('orders/:id/status')
  updateStatus(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
    @Body('order_status') status: string,
  ) {
    return this.kdsService.updateOrderStatus(businessId, id, status);
  }
}
