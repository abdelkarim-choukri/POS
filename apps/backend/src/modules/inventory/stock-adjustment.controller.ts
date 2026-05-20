import {
  Controller, Get, Post, Param, Body, Query, UseGuards, ForbiddenException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StockAdjustmentService } from './stock-adjustment.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { userHasPermission } from '../../common/utils/permissions';
import {
  CreateAdjustmentDto,
  RejectAdjustmentDto,
  ListAdjustmentsQueryDto,
} from './dto/stock-adjustment-transfer.dto';

@ApiTags('Inventory — Adjustments')
@Controller('business/stock-adjustments')
@UseGuards(RolesGuard)
export class StockAdjustmentController {
  constructor(private readonly adjService: StockAdjustmentService) {}

  // EXT-INV-010: List
  @Get()
  list(
    @CurrentUser('business_id') businessId: string,
    @Query() query: ListAdjustmentsQueryDto,
  ) {
    return this.adjService.listAdjustments(businessId, query);
  }

  // EXT-INV-011: Detail
  @Get(':id')
  detail(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.adjService.getAdjustment(id, businessId);
  }

  // EXT-INV-012: Create draft — requires can_propose_stock_adjustment
  @Post()
  create(
    @CurrentUser() user: any,
    @CurrentUser('business_id') businessId: string,
    @Body() dto: CreateAdjustmentDto,
  ) {
    if (!userHasPermission(user, 'can_propose_stock_adjustment')) {
      throw new ForbiddenException('can_propose_stock_adjustment permission required');
    }
    return this.adjService.createAdjustment(businessId, user.id, dto);
  }

  // EXT-INV-013: Submit (draft → pending_approval)
  @Post(':id/submit')
  submit(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.adjService.submitAdjustment(id, businessId);
  }

  // EXT-INV-014: Approve — owner/manager + can_approve_stock_adjustment
  @Post(':id/approve')
  @Roles('owner', 'manager')
  approve(
    @CurrentUser() user: any,
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    if (!userHasPermission(user, 'can_approve_stock_adjustment')) {
      throw new ForbiddenException('can_approve_stock_adjustment permission required');
    }
    return this.adjService.approveAdjustment(id, businessId, user.id);
  }

  // EXT-INV-015: Post (approved → posted)
  @Post(':id/post')
  @Roles('owner', 'manager')
  post(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.adjService.postAdjustment(id, businessId, userId);
  }

  // EXT-INV-016: Reject — owner/manager + can_approve_stock_adjustment
  @Post(':id/reject')
  @Roles('owner', 'manager')
  reject(
    @CurrentUser() user: any,
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
    @Body() dto: RejectAdjustmentDto,
  ) {
    if (!userHasPermission(user, 'can_approve_stock_adjustment')) {
      throw new ForbiddenException('can_approve_stock_adjustment permission required');
    }
    return this.adjService.rejectAdjustment(id, businessId, dto);
  }
}
