import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { PurchaseOrderService } from './purchase-order.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import {
  ListPurchaseOrdersQueryDto,
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  ReceivePurchaseOrderDto,
} from './dto/stock-engine.dto';

@Controller('business/purchase-orders')
@UseGuards(RolesGuard)
export class PurchaseOrderController {
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  @Get()
  list(
    @CurrentUser('business_id') businessId: string,
    @Query() query: ListPurchaseOrdersQueryDto,
  ) {
    return this.purchaseOrderService.listPurchaseOrders(businessId, query);
  }

  @Get(':id')
  get(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.purchaseOrderService.getPurchaseOrder(id, businessId);
  }

  @Post()
  @Roles('owner', 'manager')
  create(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.purchaseOrderService.createPurchaseOrder(businessId, userId, dto);
  }

  @Patch(':id')
  @Roles('owner', 'manager')
  update(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.purchaseOrderService.updatePurchaseOrder(id, businessId, dto);
  }

  @Post(':id/send')
  @Roles('owner', 'manager')
  @HttpCode(HttpStatus.OK)
  send(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.purchaseOrderService.sendPurchaseOrder(id, businessId, userId);
  }

  @Post(':id/confirm')
  @Roles('owner', 'manager')
  @HttpCode(HttpStatus.OK)
  confirm(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.purchaseOrderService.confirmPurchaseOrder(id, businessId);
  }

  @Post(':id/receive')
  @HttpCode(HttpStatus.OK)
  receive(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseOrderDto,
  ) {
    return this.purchaseOrderService.receivePurchaseOrder(id, businessId, userId, dto);
  }

  @Post(':id/cancel')
  @Roles('owner', 'manager')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.purchaseOrderService.cancelPurchaseOrder(id, businessId);
  }
}
