import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import {
  CreateDiningAreaDto, UpdateDiningAreaDto, ListDiningAreasQueryDto,
  CreateTableTypeDto, UpdateTableTypeDto,
  CreateTableDto, UpdateTableDto, ListTablesQueryDto,
} from './dto/restaurant.dto';

@Controller('business')
@UseGuards(RolesGuard)
export class RestaurantController {
  constructor(private readonly service: RestaurantService) {}

  // ── RST-001: List dining areas ────────────────────────────────────────────
  @Get('dining-areas')
  @Roles('owner', 'manager')
  listDiningAreas(
    @CurrentUser('business_id') businessId: string,
    @Query() query: ListDiningAreasQueryDto,
  ) {
    return this.service.listDiningAreas(businessId, query);
  }

  // ── RST-002: Create dining area ───────────────────────────────────────────
  @Post('dining-areas')
  @Roles('owner', 'manager')
  createDiningArea(
    @CurrentUser('business_id') businessId: string,
    @Body() dto: CreateDiningAreaDto,
  ) {
    return this.service.createDiningArea(businessId, dto);
  }

  // ── RST-003: Update dining area ───────────────────────────────────────────
  @Patch('dining-areas/:id')
  @Roles('owner', 'manager')
  updateDiningArea(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
    @Body() dto: UpdateDiningAreaDto,
  ) {
    return this.service.updateDiningArea(businessId, id, dto);
  }

  // ── RST-004: Delete dining area ───────────────────────────────────────────
  @Delete('dining-areas/:id')
  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  deleteDiningArea(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
  ) {
    return this.service.deleteDiningArea(businessId, id);
  }

  // ── RST-010: List table types ─────────────────────────────────────────────
  @Get('table-types')
  @Roles('owner', 'manager')
  listTableTypes(@CurrentUser('business_id') businessId: string) {
    return this.service.listTableTypes(businessId);
  }

  // ── RST-011: Create table type ────────────────────────────────────────────
  @Post('table-types')
  @Roles('owner', 'manager')
  createTableType(
    @CurrentUser('business_id') businessId: string,
    @Body() dto: CreateTableTypeDto,
  ) {
    return this.service.createTableType(businessId, dto);
  }

  // ── RST-012: Update table type ────────────────────────────────────────────
  @Patch('table-types/:id')
  @Roles('owner', 'manager')
  updateTableType(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
    @Body() dto: UpdateTableTypeDto,
  ) {
    return this.service.updateTableType(businessId, id, dto);
  }

  // ── RST-013: Delete table type ────────────────────────────────────────────
  @Delete('table-types/:id')
  @Roles('owner', 'manager')
  @HttpCode(HttpStatus.OK)
  deleteTableType(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
  ) {
    return this.service.deleteTableType(businessId, id);
  }

  // ── RST-020: List tables ──────────────────────────────────────────────────
  @Get('tables')
  @Roles('owner', 'manager')
  listTables(
    @CurrentUser('business_id') businessId: string,
    @Query() query: ListTablesQueryDto,
  ) {
    return this.service.listTables(businessId, query);
  }

  // ── RST-021: Create table ─────────────────────────────────────────────────
  @Post('tables')
  @Roles('owner', 'manager')
  createTable(
    @CurrentUser('business_id') businessId: string,
    @Body() dto: CreateTableDto,
  ) {
    return this.service.createTable(businessId, dto);
  }

  // ── RST-022: Update table ─────────────────────────────────────────────────
  @Patch('tables/:id')
  @Roles('owner', 'manager')
  updateTable(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
    @Body() dto: UpdateTableDto,
  ) {
    return this.service.updateTable(businessId, id, dto);
  }

  // ── RST-023: Delete table ─────────────────────────────────────────────────
  @Delete('tables/:id')
  @Roles('owner', 'manager')
  @HttpCode(HttpStatus.OK)
  deleteTable(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
  ) {
    return this.service.deleteTable(businessId, id);
  }
}
