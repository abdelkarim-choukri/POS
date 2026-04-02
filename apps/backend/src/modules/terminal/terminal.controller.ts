import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { TerminalService } from './terminal.service';
import { CurrentUser, Public } from '../../common/decorators';
import { CreateTransactionDto, VoidTransactionDto } from './dto';

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
    // Terminal ID should be in the token or passed — simplified here
    return this.service.getConfig(user.terminal_id);
  }

  @Post('heartbeat')
  heartbeat(@Body('terminal_id') terminalId: string) {
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

  @Post('transactions')
  createTransaction(
    @CurrentUser() user: any,
    @Body() dto: CreateTransactionDto,
    @Body('terminal_id') terminalId: string,
    @Body('location_id') locationId: string,
  ) {
    return this.service.createTransaction(user.business_id, locationId, terminalId, user.id, dto);
  }

  @Post('transactions/:id/void')
  voidTransaction(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: VoidTransactionDto,
  ) {
    return this.service.voidTransaction(id, user.id, dto, user.can_void);
  }

  @Get('transactions/today')
  getTodayTransactions(@CurrentUser('business_id') businessId: string, @Query('terminal_id') terminalId: string) {
    return this.service.getTodayTransactions(businessId, terminalId);
  }

  @Post('sync')
  pushSync(@Body('terminal_id') terminalId: string, @Body('operations') operations: any[]) {
    return this.service.pushSync(terminalId, operations);
  }

  @Get('sync/status')
  getSyncStatus(@Query('terminal_id') terminalId: string) {
    return this.service.getSyncStatus(terminalId);
  }
}
