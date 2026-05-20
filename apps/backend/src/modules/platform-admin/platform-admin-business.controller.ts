import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { PlatformAdminService } from './platform-admin.service';
import { LinkCourierDto, UpdateSettlementCutoffDto } from './dto/platform-admin.dto';

@ApiTags('Platform Admin')
@Controller('business')
@UseGuards(RolesGuard)
export class PlatformAdminBusinessController {
  constructor(private service: PlatformAdminService) {}

  // ── Couriers (ADM-014–016) ────────────────────────────────────────────────

  @Get('couriers')
  listBusinessCouriers(@CurrentUser('business_id') businessId: string) {
    return this.service.listBusinessCouriers(businessId);
  }

  @Post('couriers/link')
  linkCourier(
    @CurrentUser('business_id') businessId: string,
    @Body() dto: LinkCourierDto,
  ) {
    return this.service.linkCourierToBusiness(businessId, dto);
  }

  @Delete('couriers/:courier_id')
  @HttpCode(HttpStatus.OK)
  unlinkCourier(
    @CurrentUser('business_id') businessId: string,
    @Param('courier_id') courierId: string,
  ) {
    return this.service.unlinkCourierFromBusiness(businessId, courierId);
  }

  // ── Settlement Cutoff (ADM-060–061) ───────────────────────────────────────

  @Get('settings/settlement-cutoff')
  getSettlementCutoff(@CurrentUser('business_id') businessId: string) {
    return this.service.getSettlementCutoff(businessId);
  }

  @Put('settings/settlement-cutoff')
  @Roles('owner')
  updateSettlementCutoff(
    @CurrentUser('business_id') businessId: string,
    @Body() dto: UpdateSettlementCutoffDto,
  ) {
    return this.service.updateSettlementCutoff(businessId, dto);
  }
}
