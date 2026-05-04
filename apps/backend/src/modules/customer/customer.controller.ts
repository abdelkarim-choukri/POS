import {
  Controller, Get, Post, Patch, Delete, Put, Body, Param, Query, UseGuards,
  HttpCode, HttpStatus, ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { userHasPermission } from '../../common/utils/permissions';
import {
  CreateCustomerDto, UpdateCustomerDto, ListCustomersQueryDto,
  CreateGradeDto, UpdateGradeDto,
  CreateLabelDto, UpdateLabelDto, AssignLabelsDto,
  CreateAttributeDto, UpdateAttributeDto, SetAttributeValuesDto,
  PointsHistoryQueryDto, PointsAdjustmentDto,
} from './dto/customer.dto';

@Controller('business')
@UseGuards(RolesGuard)
export class CustomerController {
  constructor(private service: CustomerService) {}

  // ── CUSTOMER CRUD ──────────────────────────────────────────────────────────

  // [CUST-001] employee may also read at terminal
  @Get('customers')
  @Roles('owner', 'manager', 'employee')
  list(
    @CurrentUser('business_id') businessId: string,
    @Query() query: ListCustomersQueryDto,
  ) {
    return this.service.list(businessId, query);
  }

  // [CUST-002]
  @Get('customers/dashboard-summary')
  @Roles('owner', 'manager')
  dashboardSummary() {
    // Placeholder — CUST-010 is out of scope for Part A
    return { message: 'Coming in Part B' };
  }

  // [CUST-002]
  @Get('customers/:id')
  @Roles('owner', 'manager')
  getDetail(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.service.getDetail(businessId, id);
  }

  // [CUST-003] employee may create at terminal
  @Post('customers')
  @Roles('owner', 'manager', 'employee')
  create(
    @CurrentUser('business_id') businessId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.service.create(businessId, dto);
  }

  // [CUST-004]
  @Patch('customers/:id')
  @Roles('owner', 'manager')
  update(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.service.update(businessId, id, dto);
  }

  // [CUST-005] owner only
  @Delete('customers/:id')
  @Roles('owner')
  softDelete(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.service.softDelete(businessId, id);
  }

  // ── GRADE CRUD ─────────────────────────────────────────────────────────────

  // [CUST-020] employee may read for terminal display
  @Get('customer-grades')
  @Roles('owner', 'manager', 'employee')
  listGrades(@CurrentUser('business_id') businessId: string) {
    return this.service.listGrades(businessId);
  }

  // [CUST-021]
  @Post('customer-grades')
  @Roles('owner', 'manager')
  createGrade(
    @CurrentUser('business_id') businessId: string,
    @Body() dto: CreateGradeDto,
  ) {
    return this.service.createGrade(businessId, dto);
  }

  // [CUST-022]
  @Patch('customer-grades/:id')
  @Roles('owner', 'manager')
  updateGrade(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGradeDto,
  ) {
    return this.service.updateGrade(businessId, id, dto);
  }

  // [CUST-023] owner only
  @Delete('customer-grades/:id')
  @Roles('owner')
  deleteGrade(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.service.deleteGrade(businessId, id);
  }

  // ── LABEL CRUD ─────────────────────────────────────────────────────────────

  // [CUST-030]
  @Get('customer-labels')
  @Roles('owner', 'manager')
  listLabels(@CurrentUser('business_id') businessId: string) {
    return this.service.listLabels(businessId);
  }

  // [CUST-031]
  @Post('customer-labels')
  @Roles('owner', 'manager')
  createLabel(
    @CurrentUser('business_id') businessId: string,
    @Body() dto: CreateLabelDto,
  ) {
    return this.service.createLabel(businessId, dto);
  }

  // [CUST-032]
  @Patch('customer-labels/:id')
  @Roles('owner', 'manager')
  updateLabel(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLabelDto,
  ) {
    return this.service.updateLabel(businessId, id, dto);
  }

  // [CUST-033]
  @Delete('customer-labels/:id')
  @Roles('owner', 'manager')
  deleteLabel(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.service.deleteLabel(businessId, id);
  }

  // [CUST-034]
  @Put('customers/:id/labels')
  @Roles('owner', 'manager')
  assignLabels(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
    @Body() dto: AssignLabelsDto,
  ) {
    return this.service.assignLabels(businessId, id, dto);
  }

  // ── ATTRIBUTE CRUD ─────────────────────────────────────────────────────────

  // [CUST-040]
  @Get('customer-attributes')
  @Roles('owner', 'manager')
  listAttributes(@CurrentUser('business_id') businessId: string) {
    return this.service.listAttributes(businessId);
  }

  // [CUST-041]
  @Post('customer-attributes')
  @Roles('owner', 'manager')
  createAttribute(
    @CurrentUser('business_id') businessId: string,
    @Body() dto: CreateAttributeDto,
  ) {
    return this.service.createAttribute(businessId, dto);
  }

  // [CUST-042]
  @Patch('customer-attributes/:id')
  @Roles('owner', 'manager')
  updateAttribute(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAttributeDto,
  ) {
    return this.service.updateAttribute(businessId, id, dto);
  }

  // [CUST-043]
  @Delete('customer-attributes/:id')
  @Roles('owner', 'manager')
  deleteAttribute(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.service.deleteAttribute(businessId, id);
  }

  // [CUST-044]
  @Get('customers/:id/attributes')
  @Roles('owner', 'manager')
  getCustomerAttributes(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.service.getCustomerAttributes(businessId, id);
  }

  // [CUST-045]
  @Put('customers/:id/attributes')
  @Roles('owner', 'manager')
  setCustomerAttributes(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
    @Body() dto: SetAttributeValuesDto,
  ) {
    return this.service.setCustomerAttributes(businessId, id, dto);
  }

  // ── POINTS MANAGEMENT ──────────────────────────────────────────────────────

  // [CUST-050]
  @Get('customers/:id/points-history')
  @Roles('owner', 'manager')
  getPointsHistory(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
    @Query() query: PointsHistoryQueryDto,
  ) {
    return this.service.getPointsHistory(businessId, id, query);
  }

  // [CUST-051] employee needs can_adjust_points permission
  @Post('customers/:id/points-adjustment')
  @Roles('owner', 'manager', 'employee')
  adjustPoints(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: PointsAdjustmentDto,
  ) {
    if (user.role === 'employee' && !userHasPermission(user, 'can_adjust_points')) {
      throw new ForbiddenException('Insufficient permissions to adjust points');
    }
    return this.service.adjustPoints(user.business_id, id, dto, user.id);
  }

  // [CUST-052] stub — requires BullMQ (Phase 7 prerequisite)
  @Post('customers/import-grades')
  @Roles('owner', 'manager')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  importGrades() {
    return { message: 'Batch import requires background job infrastructure (Phase 7 prerequisite)' };
  }
}
