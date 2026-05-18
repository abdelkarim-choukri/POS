import {
  Controller, Get, Post, Put, Param, Body, Query, Request, UseGuards, HttpCode,
} from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ChainService } from './chain.service';
import {
  SyncConfigDto, TriggerSyncDto, PullProductDto,
  RolloutPromotionDto, ValidateSubStoresDto, GrantBusinessAccessDto,
  ChainDashboardQueryDto, ChainTransactionsQueryDto, FulfillChildPoDto,
} from './dto/chain.dto';

@Controller('business')
@UseGuards(RolesGuard)
export class ChainController {
  constructor(private chainService: ChainService) {}

  // CHN-012
  @Post('users/:id/grant-business-access')
  @Roles('owner', 'super_admin')
  grantAccess(@Param('id') userId: string, @Request() req: any, @Body() dto: GrantBusinessAccessDto) {
    return this.chainService.grantBusinessAccess(userId, req.user.business_id, dto.business_ids, dto.role_per_business, req.user.sub);
  }

  // CHN-020 get
  @Get('chain/sync-config')
  @Roles('owner', 'manager')
  getSyncConfig(@Request() req: any) {
    return this.chainService.getSyncConfig(req.user.business_id);
  }

  // CHN-020 set
  @Put('chain/sync-config')
  @Roles('owner')
  setSyncConfig(@Request() req: any, @Body() dto: SyncConfigDto) {
    return this.chainService.setSyncConfig(req.user.business_id, dto);
  }

  // CHN-021
  @Post('chain/sync')
  @Roles('owner')
  @HttpCode(202)
  triggerSync(@Request() req: any, @Body() dto: TriggerSyncDto) {
    return this.chainService.triggerSync(req.user.business_id, dto);
  }

  // CHN-022
  @Get('chain/sync-jobs/:id')
  @Roles('owner', 'manager')
  getSyncJobStatus(@Param('id') jobId: string, @Request() req: any) {
    return this.chainService.getSyncJobStatus(jobId, req.user.business_id);
  }

  // CHN-023
  @Get('chain/unmapped-products')
  @Roles('owner', 'manager')
  getUnmapped(@Request() req: any) {
    return this.chainService.getUnmappedProducts(req.user.business_id);
  }

  // CHN-024
  @Post('chain/pull-product')
  @Roles('owner', 'manager')
  pullProduct(@Request() req: any, @Body() dto: PullProductDto) {
    return this.chainService.pullProduct(req.user.business_id, dto.parent_product_id);
  }

  // PROM-040
  @Post('promotions/:id/validate-sub-stores')
  @Roles('owner')
  validateSubStores(@Param('id') id: string, @Request() req: any, @Body() dto: ValidateSubStoresDto) {
    return this.chainService.validateSubStores(req.user.business_id, id, dto.child_business_ids);
  }

  // CHN-030
  @Post('promotions/:id/rollout-to-children')
  @Roles('owner')
  rollout(@Param('id') id: string, @Request() req: any, @Body() dto: RolloutPromotionDto) {
    return this.chainService.rolloutPromotion(req.user.business_id, id, dto.child_business_ids, dto.skip_validation ?? false);
  }

  // CHN-040
  @Get('chain/dashboard')
  @Roles('owner', 'manager')
  dashboard(@Request() req: any, @Query() query: ChainDashboardQueryDto) {
    return this.chainService.getChainDashboard(req.user.business_id, query.from_date, query.to_date);
  }

  // CHN-041
  @Get('chain/transactions')
  @Roles('owner', 'manager')
  chainTransactions(@Request() req: any, @Query() query: ChainTransactionsQueryDto) {
    return this.chainService.getChainTransactions(req.user.business_id, query);
  }

  // CHN-050
  @Get('chain/parent-vendor-info')
  @Roles('owner', 'manager')
  parentVendorInfo(@Request() req: any) {
    return this.chainService.getParentVendorInfo(req.user.business_id);
  }

  // CHN-051
  @Get('chain/incoming-po-requests')
  @Roles('owner', 'manager')
  incomingPoRequests(@Request() req: any) {
    return this.chainService.getIncomingPoRequests(req.user.business_id);
  }

  // CHN-052
  @Post('chain/incoming-po-requests/:id/fulfill')
  @Roles('owner', 'manager')
  @HttpCode(200)
  fulfillPo(@Param('id') id: string, @Request() req: any, @Body() dto: FulfillChildPoDto) {
    return this.chainService.fulfillChildPo(req.user.business_id, id, dto.source_warehouse_id);
  }
}
