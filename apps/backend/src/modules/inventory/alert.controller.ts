import {
  Controller, Get, Post, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AlertService } from './alert.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import {
  ListExpirationAlertsQueryDto,
  ResolveExpirationAlertDto,
  ListDiscrepancyAlertsQueryDto,
  ResolveDiscrepancyAlertDto,
} from './dto/stock-engine.dto';

@ApiTags('Inventory — Alerts')
@Controller('business')
@UseGuards(RolesGuard)
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  // ── Expiration Alerts ───────────────────────────────────────────────────────

  @Get('expiration-alerts')
  listExpiration(
    @CurrentUser('business_id') businessId: string,
    @Query() query: ListExpirationAlertsQueryDto,
  ) {
    return this.alertService.listExpirationAlerts(businessId, query);
  }

  @Post('expiration-alerts/:id/resolve')
  @Roles('owner', 'manager')
  @HttpCode(HttpStatus.OK)
  resolveExpiration(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ResolveExpirationAlertDto,
  ) {
    return this.alertService.resolveExpirationAlert(id, businessId, userId, dto);
  }

  // ── Discrepancy Alerts ──────────────────────────────────────────────────────

  @Get('stock-discrepancy-alerts')
  listDiscrepancy(
    @CurrentUser('business_id') businessId: string,
    @Query() query: ListDiscrepancyAlertsQueryDto,
  ) {
    return this.alertService.listDiscrepancyAlerts(businessId, query);
  }

  @Post('stock-discrepancy-alerts/:id/resolve')
  @Roles('owner', 'manager')
  @HttpCode(HttpStatus.OK)
  resolveDiscrepancy(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ResolveDiscrepancyAlertDto,
  ) {
    return this.alertService.resolveDiscrepancyAlert(id, businessId, userId, dto);
  }
}
