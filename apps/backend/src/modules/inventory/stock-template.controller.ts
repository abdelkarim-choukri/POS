import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StockTemplateService } from './stock-template.service';
import { CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import {
  CreateStockTemplateDto,
  UpdateStockTemplateDto,
  GeneratePurchaseOrderDto,
} from './dto/stock-engine.dto';

@ApiTags('Inventory — Templates')
@Controller('business/stock-templates')
@UseGuards(RolesGuard)
export class StockTemplateController {
  constructor(private readonly stockTemplateService: StockTemplateService) {}

  // INV-060: List templates
  @Get()
  list(@CurrentUser('business_id') businessId: string) {
    return this.stockTemplateService.listTemplates(businessId);
  }

  // INV-061: Get single template
  @Get(':id')
  getOne(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.stockTemplateService.getTemplate(id, businessId);
  }

  // INV-062: Create template
  @Post()
  create(
    @CurrentUser('business_id') businessId: string,
    @Body() dto: CreateStockTemplateDto,
  ) {
    return this.stockTemplateService.createTemplate(businessId, dto);
  }

  // INV-063: Update template
  @Patch(':id')
  update(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStockTemplateDto,
  ) {
    return this.stockTemplateService.updateTemplate(id, businessId, dto);
  }

  // INV-064: Delete template
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.stockTemplateService.deleteTemplate(id, businessId);
  }

  // INV-065: Generate PO from template
  @Post(':id/create-purchase-order')
  generatePurchaseOrder(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: GeneratePurchaseOrderDto,
  ) {
    return this.stockTemplateService.generatePurchaseOrder(id, businessId, userId, dto);
  }
}
