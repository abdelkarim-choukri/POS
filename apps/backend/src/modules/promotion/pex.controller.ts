import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PointsExchangeService } from './pex.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { userHasPermission } from '../../common/utils/permissions';
import {
  CreatePexRuleDto, UpdatePexRuleDto, ListPexRulesQueryDto,
  CheckPointValueQueryDto, RedeemPointsDto, PexReportQueryDto,
} from './dto/pex.dto';

@ApiTags('Promotions — Points Exchange')
@Controller('business')
@UseGuards(RolesGuard)
export class PointsExchangeController {
  constructor(private readonly service: PointsExchangeService) {}

  // [PEX-001]
  @Get('points-exchange-rules')
  @Roles('owner', 'manager', 'employee')
  list(
    @CurrentUser('business_id') businessId: string,
    @Query() query: ListPexRulesQueryDto,
  ) {
    return this.service.list(businessId, query);
  }

  // [PEX-003] — must be before /:id to avoid route shadowing
  @Get('points-exchange-rules/check-point-value')
  @Roles('owner', 'manager')
  checkPointValue(
    @CurrentUser('business_id') businessId: string,
    @Query() query: CheckPointValueQueryDto,
  ) {
    return this.service.checkPointValue(businessId, query);
  }

  // [PEX-010] — must be before /:id to avoid route shadowing
  @Get('points-exchange-rules/redeemable-for-customer')
  @Roles('owner', 'manager', 'employee')
  listRedeemable(
    @CurrentUser('business_id') businessId: string,
    @Query('customer_id') customerId: string,
  ) {
    return this.service.listRedeemableForCustomer(businessId, customerId);
  }

  // [PEX-002]
  @Get('points-exchange-rules/:id')
  @Roles('owner', 'manager', 'employee')
  getDetail(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
  ) {
    return this.service.getDetail(id, businessId);
  }

  // [PEX-004]
  @Post('points-exchange-rules')
  @Roles('owner', 'manager')
  create(
    @CurrentUser('business_id') businessId: string,
    @Body() dto: CreatePexRuleDto,
  ) {
    return this.service.create(businessId, dto);
  }

  // [PEX-005]
  @Patch('points-exchange-rules/:id')
  @Roles('owner', 'manager')
  update(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
    @Body() dto: UpdatePexRuleDto,
  ) {
    return this.service.update(id, businessId, dto);
  }

  // [PEX-006]
  @Delete('points-exchange-rules/:id')
  @Roles('owner', 'manager')
  @HttpCode(HttpStatus.OK)
  deactivate(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
  ) {
    return this.service.deactivate(id, businessId);
  }

  // [PEX-011] — owner/manager always allowed; employee needs can_redeem_points
  @Post('points-exchange-rules/:id/redeem')
  @Roles('owner', 'manager', 'employee')
  @HttpCode(HttpStatus.OK)
  redeem(
    @Param('id') ruleId: string,
    @CurrentUser() user: any,
    @Body() dto: RedeemPointsDto,
  ) {
    const canRedeem =
      user.role === 'owner' ||
      user.role === 'manager' ||
      userHasPermission(user, 'can_redeem_points');
    return this.service.redeem(ruleId, user.business_id, dto.customer_id, canRedeem);
  }

  // [PEX-020]
  @Get('reports/points-exchange')
  @Roles('owner', 'manager')
  report(
    @CurrentUser('business_id') businessId: string,
    @Query() query: PexReportQueryDto,
  ) {
    return this.service.report(businessId, query);
  }
}
