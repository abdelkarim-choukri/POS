import {
  Controller, Get, Post, Patch, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { PlatformAdminService } from './platform-admin.service';
import {
  CreateTradeCategoryDto, UpdateTradeCategoryDto,
  CreateCourierDto, UpdateCourierDto,
  SetCustomAuthorityDto,
  CreateVersionLogEntryDto, UpdateVersionLogEntryDto,
  UpdateSystemParameterDto, ListSystemParametersQueryDto,
} from './dto/platform-admin.dto';

@Controller('super')
@UseGuards(RolesGuard)
@Roles('super_admin')
export class PlatformAdminSuperController {
  constructor(private service: PlatformAdminService) {}

  // ── Trade Categories (ADM-001–005) ────────────────────────────────────────

  @Get('trade-categories/tree')
  listTradeCategoryTree() {
    return this.service.listTradeCategoryTree();
  }

  @Get('trade-categories/options')
  getTradeCategoryOptions() {
    return this.service.getTradeCategoryOptions();
  }

  @Post('trade-categories')
  createTradeCategory(@Body() dto: CreateTradeCategoryDto) {
    return this.service.createTradeCategory(dto);
  }

  @Patch('trade-categories/:id')
  updateTradeCategory(@Param('id') id: string, @Body() dto: UpdateTradeCategoryDto) {
    return this.service.updateTradeCategory(id, dto);
  }

  @Delete('trade-categories/:id')
  @HttpCode(HttpStatus.OK)
  deleteTradeCategory(@Param('id') id: string) {
    return this.service.deleteTradeCategory(id);
  }

  // ── Couriers (ADM-010–013) ────────────────────────────────────────────────

  @Get('couriers')
  listCouriers() {
    return this.service.listCouriers();
  }

  @Post('couriers')
  createCourier(@Body() dto: CreateCourierDto) {
    return this.service.createCourier(dto);
  }

  @Patch('couriers/:id')
  updateCourier(@Param('id') id: string, @Body() dto: UpdateCourierDto) {
    return this.service.updateCourier(id, dto);
  }

  @Delete('couriers/:id')
  @HttpCode(HttpStatus.OK)
  deleteCourier(@Param('id') id: string) {
    return this.service.deleteCourier(id);
  }

  // ── Custom Authority (ADM-020–021) ────────────────────────────────────────

  @Get('businesses/:id/custom-authority')
  getBusinessCustomAuthority(@Param('id') businessId: string) {
    return this.service.getBusinessCustomAuthority(businessId);
  }

  @Put('businesses/:id/custom-authority')
  setBusinessCustomAuthority(
    @Param('id') businessId: string,
    @Body() dto: SetCustomAuthorityDto,
    @CurrentUser('id') superAdminId: string,
  ) {
    return this.service.setBusinessCustomAuthority(businessId, superAdminId, dto);
  }

  // ── Version Log (ADM-040, ADM-042–044) ───────────────────────────────────

  @Get('version-log/menus')
  listVersionLogMenus() {
    return this.service.listVersionLogMenus();
  }

  @Post('version-log/entries')
  createVersionLogEntry(@Body() dto: CreateVersionLogEntryDto) {
    return this.service.createVersionLogEntry(dto);
  }

  @Patch('version-log/entries/:id')
  updateVersionLogEntry(@Param('id') id: string, @Body() dto: UpdateVersionLogEntryDto) {
    return this.service.updateVersionLogEntry(id, dto);
  }

  @Delete('version-log/entries/:id')
  @HttpCode(HttpStatus.OK)
  deleteVersionLogEntry(@Param('id') id: string) {
    return this.service.deleteVersionLogEntry(id);
  }

  // ── System Parameters (ADM-050–051) ──────────────────────────────────────

  @Get('system-parameters')
  listSystemParameters(@Query() query: ListSystemParametersQueryDto) {
    return this.service.listSystemParameters(query);
  }

  @Patch('system-parameters/:id')
  updateSystemParameter(@Param('id') id: string, @Body() dto: UpdateSystemParameterDto) {
    return this.service.updateSystemParameter(id, dto);
  }
}
