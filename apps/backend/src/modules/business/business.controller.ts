import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BusinessService } from './business.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { PaginationDto } from '../../common/dto';
import {
  CreateCategoryDto, UpdateCategoryDto,
  CreateProductDto, UpdateProductDto, CreateVariantDto, UpdateVariantDto,
  CreateModifierGroupDto, UpdateModifierGroupDto, CreateModifierDto, LinkModifierGroupDto,
  CreateEmployeeDto, UpdateEmployeeDto,
  CreateLocationDto, UpdateLocationDto,
  ReportFilterDto, RefundDto,
} from './dto';

@Controller('business')
@Roles('owner', 'manager')
@UseGuards(RolesGuard)
export class BusinessController {
  constructor(private service: BusinessService) {}

  // ===== CATEGORIES =====
  @Get('categories')
  listCategories(@CurrentUser('business_id') businessId: string) {
    return this.service.listCategories(businessId);
  }

  @Post('categories')
  createCategory(@CurrentUser('business_id') businessId: string, @Body() dto: CreateCategoryDto) {
    return this.service.createCategory(businessId, dto);
  }

  @Put('categories/:id')
  updateCategory(@CurrentUser('business_id') businessId: string, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.updateCategory(businessId, id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@CurrentUser('business_id') businessId: string, @Param('id') id: string) {
    return this.service.deleteCategory(businessId, id);
  }

  // ===== PRODUCTS =====
  @Get('products')
  listProducts(@CurrentUser('business_id') businessId: string, @Query('category_id') categoryId?: string) {
    return this.service.listProducts(businessId, categoryId);
  }

  @Post('products')
  createProduct(@CurrentUser('business_id') businessId: string, @Body() dto: CreateProductDto) {
    return this.service.createProduct(businessId, dto);
  }

  @Put('products/:id')
  updateProduct(@CurrentUser('business_id') businessId: string, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.updateProduct(businessId, id, dto);
  }

  @Patch('products/:id/sold-out')
  toggleSoldOut(@CurrentUser('business_id') businessId: string, @Param('id') id: string) {
    return this.service.toggleSoldOut(businessId, id);
  }

  @Delete('products/:id')
  deleteProduct(@CurrentUser('business_id') businessId: string, @Param('id') id: string) {
    return this.service.deleteProduct(businessId, id);
  }

  @Get('products/:id/variants')
  listVariants(@Param('id') productId: string) {
    return this.service.listVariants(productId);
  }

  @Post('products/:id/variants')
  createVariant(@Param('id') productId: string, @Body() dto: CreateVariantDto) {
    return this.service.createVariant(productId, dto);
  }

  @Put('variants/:id')
  updateVariant(@Param('id') id: string, @Body() dto: UpdateVariantDto) {
    return this.service.updateVariant(id, dto);
  }

  // ===== MODIFIERS =====
  @Get('modifier-groups')
  listModifierGroups(@CurrentUser('business_id') businessId: string) {
    return this.service.listModifierGroups(businessId);
  }

  @Post('modifier-groups')
  createModifierGroup(@CurrentUser('business_id') businessId: string, @Body() dto: CreateModifierGroupDto) {
    return this.service.createModifierGroup(businessId, dto);
  }

  @Put('modifier-groups/:id')
  updateModifierGroup(@CurrentUser('business_id') businessId: string, @Param('id') id: string, @Body() dto: UpdateModifierGroupDto) {
    return this.service.updateModifierGroup(businessId, id, dto);
  }

  @Post('modifier-groups/:id/modifiers')
  addModifier(@Param('id') groupId: string, @Body() dto: CreateModifierDto) {
    return this.service.addModifier(groupId, dto);
  }

  @Post('products/:id/modifier-groups')
  linkModifierGroup(@Param('id') productId: string, @Body() dto: LinkModifierGroupDto) {
    return this.service.linkModifierGroupToProduct(productId, dto);
  }

  // ===== EMPLOYEES =====
  @Get('employees')
  listEmployees(@CurrentUser('business_id') businessId: string) {
    return this.service.listEmployees(businessId);
  }

  @Post('employees')
  createEmployee(@CurrentUser('business_id') businessId: string, @Body() dto: CreateEmployeeDto) {
    return this.service.createEmployee(businessId, dto);
  }

  @Put('employees/:id')
  updateEmployee(@CurrentUser('business_id') businessId: string, @Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.service.updateEmployee(businessId, id, dto);
  }

  @Patch('employees/:id/status')
  updateEmployeeStatus(@CurrentUser('business_id') businessId: string, @Param('id') id: string, @Body('is_active') isActive: boolean) {
    return this.service.updateEmployeeStatus(businessId, id, isActive);
  }

  @Get('employees/:id/clock-history')
  getClockHistory(@Param('id') employeeId: string) {
    return this.service.getClockHistory(employeeId);
  }

  // ===== LOCATIONS =====
  @Get('locations')
  listLocations(@CurrentUser('business_id') businessId: string) {
    return this.service.listLocations(businessId);
  }

  @Post('locations')
  createLocation(@CurrentUser('business_id') businessId: string, @Body() dto: CreateLocationDto) {
    return this.service.createLocation(businessId, dto);
  }

  @Put('locations/:id')
  updateLocation(@CurrentUser('business_id') businessId: string, @Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.service.updateLocation(businessId, id, dto);
  }

  @Get('locations/:id/terminals')
  getLocationTerminals(@CurrentUser('business_id') businessId: string, @Param('id') id: string) {
    return this.service.getLocationTerminals(businessId, id);
  }

  // ===== REPORTS =====
  @Get('reports/daily-sales')
  getDailySales(@CurrentUser('business_id') businessId: string, @Query() filter: ReportFilterDto) {
    return this.service.getDailySales(businessId, filter);
  }

  @Get('reports/revenue-by-item')
  getRevenueByItem(@CurrentUser('business_id') businessId: string, @Query() filter: ReportFilterDto) {
    return this.service.getRevenueByItem(businessId, filter);
  }

  @Get('reports/payment-methods')
  getPaymentMethods(@CurrentUser('business_id') businessId: string, @Query() filter: ReportFilterDto) {
    return this.service.getPaymentMethodBreakdown(businessId, filter);
  }

  @Get('reports/transactions')
  getTransactions(@CurrentUser('business_id') businessId: string, @Query() pagination: PaginationDto, @Query() filter: ReportFilterDto) {
    return this.service.getTransactionHistory(businessId, pagination, filter);
  }

  @Get('reports/voids-refunds')
  getVoidsRefunds(@CurrentUser('business_id') businessId: string, @Query() filter: ReportFilterDto) {
    return this.service.getVoidsRefunds(businessId, filter);
  }

  @Get('reports/clock-history')
  getClockReport(@CurrentUser('business_id') businessId: string, @Query() filter: ReportFilterDto) {
    return this.service.getClockReport(businessId, filter);
  }

  @Get('transactions/:id')
  getTransaction(@CurrentUser('business_id') businessId: string, @Param('id') id: string) {
    return this.service.getTransactionDetail(businessId, id);
  }

  @Post('transactions/:id/refund')
  issueRefund(@CurrentUser('business_id') businessId: string, @CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: RefundDto) {
    return this.service.issueRefund(businessId, id, userId, dto);
  }
}
