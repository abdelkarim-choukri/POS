import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { PaginationDto } from '../../common/dto';
import {
  CreateBusinessDto, UpdateBusinessDto, UpdateBusinessStatusDto,
  CreateTerminalDto, AssignTerminalDto,
  CreateBusinessTypeDto, UpdateFeaturesDto,
  CreateSubscriptionDto, UpdateSubscriptionDto,
} from './dto';

@Controller('super')
@Roles('super_admin')
@UseGuards(RolesGuard)
export class SuperAdminController {
  constructor(private service: SuperAdminService) {}

  // Business Management
  @Get('businesses')
  listBusinesses(@Query() pagination: PaginationDto) {
    return this.service.listBusinesses(pagination);
  }

  @Post('businesses')
  createBusiness(@Body() dto: CreateBusinessDto) {
    return this.service.createBusiness(dto);
  }

  @Get('businesses/:id')
  getBusiness(@Param('id') id: string) {
    return this.service.getBusiness(id);
  }

  @Put('businesses/:id')
  updateBusiness(@Param('id') id: string, @Body() dto: UpdateBusinessDto) {
    return this.service.updateBusiness(id, dto);
  }

  @Patch('businesses/:id/status')
  updateBusinessStatus(@Param('id') id: string, @Body() dto: UpdateBusinessStatusDto) {
    return this.service.updateBusinessStatus(id, dto);
  }

  // Business Types
  @Get('business-types')
  listBusinessTypes() {
    return this.service.listBusinessTypes();
  }

  @Post('business-types')
  createBusinessType(@Body() dto: CreateBusinessTypeDto) {
    return this.service.createBusinessType(dto);
  }

  @Put('business-types/:id/features')
  updateFeatures(@Param('id') id: string, @Body() dto: UpdateFeaturesDto) {
    return this.service.updateFeatures(id, dto);
  }

  // Terminal Management
  @Get('terminals')
  listTerminals() {
    return this.service.listTerminals();
  }

  @Post('terminals')
  createTerminal(@Body() dto: CreateTerminalDto) {
    return this.service.createTerminal(dto);
  }

  @Patch('terminals/:id/assign')
  assignTerminal(@Param('id') id: string, @Body() dto: AssignTerminalDto) {
    return this.service.assignTerminal(id, dto);
  }

  @Get('terminals/health')
  getTerminalHealth() {
    return this.service.getTerminalHealth();
  }

  // Subscriptions
  @Get('subscriptions')
  listSubscriptions() {
    return this.service.listSubscriptions();
  }

  @Post('subscriptions')
  createSubscription(@Body() dto: CreateSubscriptionDto) {
    return this.service.createSubscription(dto);
  }

  @Put('subscriptions/:id')
  updateSubscription(@Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.service.updateSubscription(id, dto);
  }

  // Dashboard
  @Get('dashboard/stats')
  getDashboardStats() {
    return this.service.getDashboardStats();
  }

  @Get('audit-logs')
  getAuditLogs(@Query() pagination: PaginationDto) {
    return this.service.getAuditLogs(pagination);
  }
}
