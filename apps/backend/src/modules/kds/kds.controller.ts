import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { KdsService } from './kds.service';
import { Public } from '../../common/decorators';

@Controller('kds')
export class KdsController {
  constructor(private kdsService: KdsService) {}

  // KDS screen doesn't need auth — uses location token in URL
  @Public()
  @Get('orders')
  getActiveOrders(@Query('location_id') locationId: string) {
    return this.kdsService.getActiveOrders(locationId);
  }

  @Public()
  @Patch('orders/:id/status')
  updateStatus(@Param('id') id: string, @Body('order_status') status: string) {
    return this.kdsService.updateOrderStatus(id, status);
  }
}
