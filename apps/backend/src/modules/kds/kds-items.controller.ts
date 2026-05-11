import {
  Controller, Get, Post, Param, Query, Body, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { KdsService } from './kds.service';
import { CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { GetKdsItemsDto, UpdateKdsItemStatusDto } from './dto';

@Controller('terminal/kds')
@UseGuards(RolesGuard)
export class KdsItemsController {
  constructor(private readonly kdsService: KdsService) {}

  // RST-MOD-001: Get active KDS items from both table sessions and direct transactions
  @Get('items')
  getItems(
    @CurrentUser('business_id') businessId: string,
    @Query() query: GetKdsItemsDto,
  ) {
    return this.kdsService.getKdsItems(businessId, query);
  }

  // RST-MOD-001: Update kds_status on a table_session_item
  @Post('items/:id/status')
  @HttpCode(HttpStatus.OK)
  updateItemStatus(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
    @Body() dto: UpdateKdsItemStatusDto,
  ) {
    return this.kdsService.updateItemStatus(businessId, id, dto.status);
  }
}
