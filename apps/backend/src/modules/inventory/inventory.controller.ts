import {
  Controller, Get, Post, Patch, Put, Delete, Param, Body, Query, Request,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import {
  CreateUnitOfMeasureDto, UpdateUnitOfMeasureDto,
  CreateWarehouseDto, UpdateWarehouseDto,
  ListVendorsQueryDto, CreateVendorDto, UpdateVendorDto,
  CreateVendorCheckDetailDto,
  CreateBrandDto, UpdateBrandDto,
  SetNutritionInfoDto, ListNutritionQueryDto,
} from './dto/inventory.dto';

@Controller('business')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ── Units of Measure (EXT-INV-001) ───────────────────────────────────────

  @Get('units-of-measure')
  listUnitsOfMeasure(@Request() req: any) {
    return this.inventoryService.listUnitsOfMeasure(req.user.business_id);
  }

  @Post('units-of-measure')
  createUnitOfMeasure(@Request() req: any, @Body() dto: CreateUnitOfMeasureDto) {
    return this.inventoryService.createUnitOfMeasure(req.user.business_id, dto);
  }

  @Patch('units-of-measure/:id')
  updateUnitOfMeasure(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateUnitOfMeasureDto) {
    return this.inventoryService.updateUnitOfMeasure(id, req.user.business_id, dto);
  }

  @Delete('units-of-measure/:id')
  deleteUnitOfMeasure(@Param('id') id: string, @Request() req: any) {
    return this.inventoryService.deleteUnitOfMeasure(id, req.user.business_id);
  }

  // ── Warehouses (INV-001–005) ──────────────────────────────────────────────

  @Get('warehouses')
  listWarehouses(@Request() req: any) {
    return this.inventoryService.listWarehouses(req.user.business_id);
  }

  @Get('warehouses/:id')
  getWarehouse(@Param('id') id: string, @Request() req: any) {
    return this.inventoryService.getWarehouse(id, req.user.business_id);
  }

  @Post('warehouses')
  createWarehouse(@Request() req: any, @Body() dto: CreateWarehouseDto) {
    return this.inventoryService.createWarehouse(req.user.business_id, dto);
  }

  @Patch('warehouses/:id')
  updateWarehouse(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateWarehouseDto) {
    return this.inventoryService.updateWarehouse(id, req.user.business_id, dto);
  }

  @Delete('warehouses/:id')
  deleteWarehouse(@Param('id') id: string, @Request() req: any) {
    return this.inventoryService.deleteWarehouse(id, req.user.business_id);
  }

  // ── Vendors (INV-010–015) ─────────────────────────────────────────────────

  @Get('vendors')
  listVendors(@Request() req: any, @Query() query: ListVendorsQueryDto) {
    return this.inventoryService.listVendors(req.user.business_id, query);
  }

  @Get('vendors/:id')
  getVendor(@Param('id') id: string, @Request() req: any) {
    return this.inventoryService.getVendor(id, req.user.business_id);
  }

  @Post('vendors')
  createVendor(@Request() req: any, @Body() dto: CreateVendorDto) {
    return this.inventoryService.createVendor(req.user.business_id, dto);
  }

  @Patch('vendors/:id')
  updateVendor(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateVendorDto) {
    return this.inventoryService.updateVendor(id, req.user.business_id, dto);
  }

  @Delete('vendors/:id')
  deleteVendor(@Param('id') id: string, @Request() req: any) {
    return this.inventoryService.deleteVendor(id, req.user.business_id);
  }

  @Get('vendors/:id/check-details')
  listVendorCheckDetails(@Param('id') id: string, @Request() req: any) {
    return this.inventoryService.listVendorCheckDetails(id, req.user.business_id);
  }

  @Post('vendors/:id/check-details')
  createVendorCheckDetail(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: CreateVendorCheckDetailDto,
  ) {
    return this.inventoryService.createVendorCheckDetail(id, req.user.business_id, dto);
  }

  // ── Brands (INV-020–023) ──────────────────────────────────────────────────

  @Get('brands')
  listBrands(@Request() req: any) {
    return this.inventoryService.listBrands(req.user.business_id);
  }

  @Post('brands')
  createBrand(@Request() req: any, @Body() dto: CreateBrandDto) {
    return this.inventoryService.createBrand(req.user.business_id, dto);
  }

  @Patch('brands/:id')
  updateBrand(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateBrandDto) {
    return this.inventoryService.updateBrand(id, req.user.business_id, dto);
  }

  @Delete('brands/:id')
  deleteBrand(@Param('id') id: string, @Request() req: any) {
    return this.inventoryService.deleteBrand(id, req.user.business_id);
  }

  // ── Nutrition Info (INV-030–032) ──────────────────────────────────────────

  @Get('products/:id/nutrition')
  getNutritionInfo(@Param('id') id: string, @Request() req: any) {
    return this.inventoryService.getNutritionInfo(id, req.user.business_id);
  }

  @Put('products/:id/nutrition')
  setNutritionInfo(@Param('id') id: string, @Request() req: any, @Body() dto: SetNutritionInfoDto) {
    return this.inventoryService.setNutritionInfo(id, req.user.business_id, dto);
  }

  @Get('nutrition-info')
  listNutritionInfo(@Request() req: any, @Query() query: ListNutritionQueryDto) {
    return this.inventoryService.listNutritionInfo(req.user.business_id, query);
  }
}
