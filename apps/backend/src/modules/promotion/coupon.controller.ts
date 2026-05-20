import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CouponService } from './coupon.service';
import { CouponExtService } from './coupon-ext.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import {
  CreateCouponTypeDto, UpdateCouponTypeDto, IssueCouponDto,
  VoidCouponDto, BulkIssueCouponDto, IssueToSegmentDto,
  CouponReportQueryDto, DiscountWriteOffReportQueryDto,
} from './dto/coupon.dto';

@ApiTags('Promotions — Coupons')
@Controller('business')
@UseGuards(RolesGuard)
export class CouponController {
  constructor(
    private readonly service: CouponService,
    private readonly extService: CouponExtService,
  ) {}

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

  // [CPN-020] — must be declared before /:id/void to avoid route collision
  @Get('coupons/lookup')
  @Roles('owner', 'manager', 'employee')
  lookupCoupon(
    @CurrentUser('business_id') businessId: string,
    @Query('code') code: string,
  ) {
    return this.service.lookupCoupon(code, businessId);
  }

  // [CPN-021] Bulk issue — declared before /:id routes
  @Post('coupons/bulk-issue')
  @Roles('owner', 'manager')
  bulkIssueCoupons(
    @CurrentUser('business_id') businessId: string,
    @Body() dto: BulkIssueCouponDto,
  ) {
    return this.extService.bulkIssueCoupons(businessId, dto);
  }

  // [CPN-022] Issue to segment — declared before /:id routes
  @Post('coupons/issue-to-segment')
  @Roles('owner', 'manager')
  issueToSegment(
    @CurrentUser('business_id') businessId: string,
    @Body() dto: IssueToSegmentDto,
  ) {
    return this.extService.issueToSegment(businessId, dto);
  }

  // [CPN-033] Void coupon
  @Post('coupons/:id/void')
  @Roles('owner', 'manager')
  @HttpCode(HttpStatus.OK)
  voidCoupon(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: VoidCouponDto,
  ) {
    return this.service.voidCoupon(id, businessId, dto, userId);
  }

  // [CPN-040] Coupon usage report
  @Get('reports/coupons')
  @Roles('owner', 'manager')
  couponReport(
    @CurrentUser('business_id') businessId: string,
    @Query() query: CouponReportQueryDto,
  ) {
    return this.extService.couponReport(businessId, query);
  }

  // [XCC-040] Discount write-off report
  @Get('reports/discount-write-offs')
  @Roles('owner', 'manager')
  discountWriteOffReport(
    @CurrentUser('business_id') businessId: string,
    @Query() query: DiscountWriteOffReportQueryDto,
  ) {
    return this.extService.discountWriteOffReport(businessId, query);
  }
}
