import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { CouponService } from './coupon.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { CreateCouponTypeDto, UpdateCouponTypeDto, IssueCouponDto } from './dto/coupon.dto';

@Controller('business')
@UseGuards(RolesGuard)
export class CouponController {
  constructor(private readonly service: CouponService) {}

  // [CPN-001]
  @Get('coupon-types')
  @Roles('owner', 'manager', 'employee')
  listCouponTypes(@CurrentUser('business_id') businessId: string) {
    return this.service.listCouponTypes(businessId);
  }

  // [CPN-002]
  @Get('coupon-types/:id')
  @Roles('owner', 'manager', 'employee')
  getCouponType(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
  ) {
    return this.service.getCouponType(id, businessId);
  }

  // [CPN-003]
  @Post('coupon-types')
  @Roles('owner', 'manager')
  createCouponType(
    @CurrentUser('business_id') businessId: string,
    @Body() dto: CreateCouponTypeDto,
  ) {
    return this.service.createCouponType(businessId, dto);
  }

  // [CPN-004]
  @Patch('coupon-types/:id')
  @Roles('owner', 'manager')
  updateCouponType(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
    @Body() dto: UpdateCouponTypeDto,
  ) {
    return this.service.updateCouponType(id, businessId, dto);
  }

  // [CPN-005]
  @Post('coupon-types/:id/clone')
  @Roles('owner', 'manager')
  @HttpCode(HttpStatus.CREATED)
  cloneCouponType(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
  ) {
    return this.service.cloneCouponType(id, businessId);
  }

  // [CPN-006]
  @Post('coupon-types/:id/deactivate')
  @Roles('owner', 'manager')
  @HttpCode(HttpStatus.OK)
  deactivateCouponType(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
  ) {
    return this.service.deactivateCouponType(id, businessId);
  }

  // [CPN-010]
  @Post('coupon-types/:id/issue')
  @Roles('owner', 'manager', 'employee')
  issueCoupon(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
    @Body() dto: IssueCouponDto,
  ) {
    return this.service.issueCoupon(id, businessId, dto);
  }

  // [CPN-020]
  @Get('coupons/lookup')
  @Roles('owner', 'manager', 'employee')
  lookupCoupon(
    @CurrentUser('business_id') businessId: string,
    @Query('code') code: string,
  ) {
    return this.service.lookupCoupon(code, businessId);
  }
}
