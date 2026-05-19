import {
  Controller, Get, Post, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { VendorPaymentService } from './vendor-payment.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import {
  ListVendorPaymentsQueryDto,
  CreateVendorPaymentDto,
  VoidVendorPaymentDto,
} from './dto/stock-engine.dto';

@Controller('business')
@UseGuards(RolesGuard)
export class VendorPaymentController {
  constructor(private readonly vendorPaymentService: VendorPaymentService) {}

  @Get('vendor-payments')
  @Roles('owner', 'manager')
  list(
    @CurrentUser('business_id') businessId: string,
    @Query() query: ListVendorPaymentsQueryDto,
  ) {
    return this.vendorPaymentService.listPayments(businessId, query);
  }

  @Get('vendor-payments/:id')
  @Roles('owner', 'manager')
  get(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.vendorPaymentService.getPayment(id, businessId);
  }

  @Post('vendor-payments')
  @Roles('owner', 'manager')
  create(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateVendorPaymentDto,
  ) {
    return this.vendorPaymentService.createPayment(businessId, userId, dto);
  }

  @Post('vendor-payments/:id/confirm')
  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  confirm(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.vendorPaymentService.confirmPayment(id, businessId, userId);
  }

  @Post('vendor-payments/:id/void')
  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  void(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: VoidVendorPaymentDto,
  ) {
    return this.vendorPaymentService.voidPayment(id, businessId, dto, userId);
  }

  @Get('vendors/:vendorId/outstanding')
  @Roles('owner', 'manager')
  outstanding(
    @CurrentUser('business_id') businessId: string,
    @Param('vendorId') vendorId: string,
  ) {
    return this.vendorPaymentService.getVendorOutstanding(vendorId, businessId);
  }

  @Get('vendors/:vendorId/payment-summary')
  @Roles('owner', 'manager')
  paymentSummary(
    @CurrentUser('business_id') businessId: string,
    @Param('vendorId') vendorId: string,
  ) {
    return this.vendorPaymentService.getVendorPaymentSummary(vendorId, businessId);
  }
}
