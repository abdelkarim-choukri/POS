import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { CreatePromotionDto, UpdatePromotionDto, ListPromotionsQueryDto } from './dto/promotion.dto';

@Controller('business')
@UseGuards(RolesGuard)
export class PromotionController {
  constructor(private readonly service: PromotionService) {}

  // [PROM-001]
  @Get('promotions')
  @Roles('owner', 'manager', 'employee')
  list(
    @CurrentUser('business_id') businessId: string,
    @Query() query: ListPromotionsQueryDto,
  ) {
    return this.service.list(businessId, query);
  }

  // [PROM-002]
  @Get('promotions/:id')
  @Roles('owner', 'manager', 'employee')
  getDetail(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
  ) {
    return this.service.getDetail(id, businessId);
  }

  // [PROM-003]
  @Post('promotions')
  @Roles('owner', 'manager')
  create(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePromotionDto,
  ) {
    return this.service.create(businessId, dto, userId);
  }

  // [PROM-004]
  @Patch('promotions/:id')
  @Roles('owner', 'manager')
  update(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.service.update(id, businessId, dto);
  }

  // [PROM-005]
  @Post('promotions/:id/activate')
  @Roles('owner', 'manager')
  @HttpCode(HttpStatus.OK)
  activate(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
  ) {
    return this.service.activate(id, businessId);
  }

  // [PROM-006]
  @Post('promotions/:id/pause')
  @Roles('owner', 'manager')
  @HttpCode(HttpStatus.OK)
  pause(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
  ) {
    return this.service.pause(id, businessId);
  }

  // [PROM-007]
  @Post('promotions/:id/archive')
  @Roles('owner', 'manager')
  @HttpCode(HttpStatus.OK)
  archive(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
  ) {
    return this.service.archive(id, businessId);
  }
}
