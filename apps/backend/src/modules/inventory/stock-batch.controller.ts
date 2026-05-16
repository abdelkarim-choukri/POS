import {
  Controller, Get, Post, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { StockBatchService } from './stock-batch.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import {
  ListBatchesQueryDto,
  CreateBatchDto,
  AdjustBatchDto,
  DisposeBatchDto,
  TransferBatchDto,
} from './dto/stock-engine.dto';

@Controller('business/stock-batches')
@UseGuards(RolesGuard)
export class StockBatchController {
  constructor(private readonly stockBatchService: StockBatchService) {}

  // INV-040: List batches
  @Get()
  list(
    @CurrentUser('business_id') businessId: string,
    @Query() query: ListBatchesQueryDto,
  ) {
    return this.stockBatchService.listBatches(businessId, query);
  }

  // INV-041: Receive new batch
  @Post()
  receive(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBatchDto,
  ) {
    return this.stockBatchService.receiveBatch(businessId, userId, dto);
  }

  // INV-042: Adjust quantity (owner/manager only)
  @Post(':id/adjust')
  @Roles('owner', 'manager')
  adjust(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: AdjustBatchDto,
  ) {
    return this.stockBatchService.adjustBatch(id, businessId, userId, dto);
  }

  // INV-043: Dispose
  @Post(':id/dispose')
  dispose(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: DisposeBatchDto,
  ) {
    return this.stockBatchService.disposeBatch(id, businessId, userId, dto);
  }

  // INV-044: Transfer between warehouses
  @Post(':id/transfer')
  transfer(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: TransferBatchDto,
  ) {
    return this.stockBatchService.transferBatch(id, businessId, userId, dto);
  }
}
