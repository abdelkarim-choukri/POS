import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { TableSessionService } from './table-session.service';
import { CheckoutService } from './checkout.service';
import { CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import {
  FloorPlanQueryDto, OpenTableDto, AddItemsDto,
  ModifyItemDto, TransferItemsDto, CancelSessionDto, SplitBillDto,
} from './dto/table-session.dto';

@Controller('terminal')
@UseGuards(RolesGuard)
export class TableSessionController {
  constructor(
    private readonly service: TableSessionService,
    private readonly checkoutService: CheckoutService,
  ) {}

  // RST-030: Floor plan view
  @Get('tables/floor-plan')
  floorPlan(
    @CurrentUser('business_id') businessId: string,
    @Query() query: FloorPlanQueryDto,
  ) {
    return this.service.floorPlan(businessId, query);
  }

  // RST-031: Open table
  @Post('tables/:id/open')
  @HttpCode(HttpStatus.CREATED)
  openTable(
    @Param('id') tableId: string,
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser() user: any,
    @Body() dto: OpenTableDto,
  ) {
    return this.service.openTable(businessId, tableId, userId, dto, user);
  }

  // RST-032: Add items to open table
  @Post('table-sessions/:id/items')
  @HttpCode(HttpStatus.CREATED)
  addItems(
    @Param('id') sessionId: string,
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddItemsDto,
  ) {
    return this.service.addItems(businessId, sessionId, userId, dto);
  }

  // RST-033: Modify table item
  @Patch('table-session-items/:id')
  modifyItem(
    @Param('id') itemId: string,
    @CurrentUser('business_id') businessId: string,
    @Body() dto: ModifyItemDto,
  ) {
    return this.service.modifyItem(businessId, itemId, dto);
  }

  // RST-037: Transfer items — static route declared before :id routes (same base path)
  @Post('table-session-items/transfer')
  @HttpCode(HttpStatus.OK)
  transferItems(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser() user: any,
    @Body() dto: TransferItemsDto,
  ) {
    return this.service.transferItems(businessId, dto, user);
  }

  // RST-034: Remove table item
  @Delete('table-session-items/:id')
  @HttpCode(HttpStatus.OK)
  removeItem(
    @Param('id') itemId: string,
    @CurrentUser('business_id') businessId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.removeItem(businessId, itemId, user);
  }

  // RST-035: Close table → single checkout payload
  @Post('table-sessions/:id/close')
  @HttpCode(HttpStatus.OK)
  closeTable(
    @Param('id') sessionId: string,
    @CurrentUser('business_id') businessId: string,
    @CurrentUser() user: any,
  ) {
    const terminalId = user.terminal_id ?? null;
    return this.checkoutService.closeTable(businessId, sessionId, terminalId, user);
  }

  // RST-036: Split bill → multiple checkout payloads
  @Post('table-sessions/:id/split')
  @HttpCode(HttpStatus.OK)
  splitBill(
    @Param('id') sessionId: string,
    @CurrentUser('business_id') businessId: string,
    @CurrentUser() user: any,
    @Body() dto: SplitBillDto,
  ) {
    const terminalId = user.terminal_id ?? null;
    return this.checkoutService.splitBill(businessId, sessionId, terminalId, dto, user);
  }

  // RST-038: Cancel or partially close session
  @Post('table-sessions/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelSession(
    @Param('id') sessionId: string,
    @CurrentUser('business_id') businessId: string,
    @CurrentUser() user: any,
    @Body() dto: CancelSessionDto,
  ) {
    return this.service.cancelSession(businessId, sessionId, dto, user);
  }
}
