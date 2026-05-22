import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TerminalService } from './terminal.service';
import { CurrentUser, Public } from '../../common/decorators';
import { CreateTransactionDto, VoidTransactionDto, QuickAddCustomerDto, EvaluateCartDto } from './dto';
import { userHasPermission } from '../../common/utils/permissions';

@ApiTags('Terminal')
@Controller('terminal')
export class TerminalController {
  constructor(private service: TerminalService) {}

  @Public()
  @Post('activate')
  activate(@Body('terminal_code') terminalCode: string) {
    return this.service.activate(terminalCode);
  }

  @Get('config')
  getConfig(@CurrentUser() user: any) {
    return this.service.getConfig(user.terminal_id);
  }

  @Post('heartbeat')
  heartbeat(@CurrentUser('terminal_id') terminalId: string) {
    return this.service.heartbeat(terminalId);
  }

  @Post('clock-in')
  clockIn(@CurrentUser('id') userId: string, @Body('terminal_id') terminalId: string) {
    return this.service.clockIn(userId, terminalId);
  }

  @Post('clock-out')
  clockOut(@CurrentUser('id') userId: string) {
    return this.service.clockOut(userId);
  }

  @Get('active-employees')
  getActiveEmployees(@CurrentUser('business_id') businessId: string) {
    return this.service.getActiveEmployees(businessId);
  }

  @Get('catalog')
  getCatalog(@CurrentUser('business_id') businessId: string) {
    return this.service.getCatalog(businessId);
  }

  @Get('customers/lookup')
  lookupCustomer(
    @CurrentUser('business_id') businessId: string,
    @Query('phone') phone: string,
  ) {
    return this.service.lookupCustomer(businessId, phone);
  }

  @Post('customers/quick-add')
  quickAddCustomer(
    @CurrentUser('business_id') businessId: string,
    @Body() dto: QuickAddCustomerDto,
  ) {
    return this.service.quickAddCustomer(businessId, dto);
  }

  // [PROM-100] Evaluate cart promotions before checkout
  @Post('promotions/evaluate')
  evaluatePromotions(@CurrentUser() user: any, @Body() dto: EvaluateCartDto) {
    return this.service.evaluatePromotions(
      user.business_id,
      user.location_id,
      user.id,
      dto,
    );
  }

  // [CPN-100] Validate coupon code at terminal
  @Get('coupons/validate')
  validateCoupon(
    @CurrentUser('business_id') businessId: string,
    @Query('code') code: string,
  ) {
    return this.service.validateCoupon(code, businessId);
  }

  @Post('transactions')
  createTransaction(@CurrentUser() user: any, @Body() dto: CreateTransactionDto) {
    return this.service.createTransaction(
      user.business_id,
      dto.location_id || user.location_id,
      dto.terminal_id || user.terminal_id,
      user.id,
      dto,
    );
  }

  @Post('transactions/:id/void')
  voidTransaction(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: VoidTransactionDto) {
    return this.service.voidTransaction(user.business_id, id, user.id, dto, userHasPermission(user, 'can_void'));
  }

  @Get('transactions/today')
  getTodayTransactions(@CurrentUser('business_id') businessId: string, @Query('terminal_id') terminalId: string) {
    return this.service.getTodayTransactions(businessId, terminalId);
  }

  @Post('sync')
  pushSync(@CurrentUser('terminal_id') terminalId: string, @Body('operations') operations: any[]) {
    return this.service.pushSync(terminalId, operations);
  }

  @Get('sync/status')
  getSyncStatus(@CurrentUser('terminal_id') terminalId: string) {
    return this.service.getSyncStatus(terminalId);
  }
}
