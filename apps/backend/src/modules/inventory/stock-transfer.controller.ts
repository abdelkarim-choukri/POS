import {
  Controller, Get, Post, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { StockTransferService } from './stock-transfer.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import {
  CreateTransferDto,
  ListTransfersQueryDto,
} from './dto/stock-adjustment-transfer.dto';

@Controller('business/stock-transfers')
@UseGuards(RolesGuard)
@Roles('owner', 'manager')
export class StockTransferController {
  constructor(private readonly transferService: StockTransferService) {}

  // EXT-INV-020: List
  @Get()
  list(
    @CurrentUser('business_id') businessId: string,
    @Query() query: ListTransfersQueryDto,
  ) {
    return this.transferService.listTransfers(businessId, query);
  }

  // EXT-INV-021: Detail
  @Get(':id')
  detail(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.transferService.getTransfer(id, businessId);
  }

  // EXT-INV-022: Create draft
  @Post()
  create(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTransferDto,
  ) {
    return this.transferService.createTransfer(businessId, userId, dto);
  }

  // EXT-INV-023: Post (immutable after this point)
  @Post(':id/post')
  post(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.transferService.postTransfer(id, businessId, userId);
  }

  // EXT-INV-024: Cancel draft
  @Post(':id/cancel')
  cancel(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.transferService.cancelTransfer(id, businessId);
  }

  // EXT-INV-025: Delete draft
  @Delete(':id')
  remove(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.transferService.deleteTransfer(id, businessId);
  }
}
