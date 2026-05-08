import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';
import { PromotionEvaluatorService } from './promotion-evaluator.service';
import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';
import { CouponExtService, COUPON_BULK_QUEUE } from './coupon-ext.service';
import { CouponBulkIssueProcessor } from './coupon-bulk-issue.processor';
import { PointsExchangeController } from './pex.controller';
import { PointsExchangeService } from './pex.service';
import { Promotion } from '../../common/entities/promotion.entity';
import { PromotionRedemption } from '../../common/entities/promotion-redemption.entity';
import { CouponType } from '../../common/entities/coupon-type.entity';
import { Coupon } from '../../common/entities/coupon.entity';
import { CouponRedemption } from '../../common/entities/coupon-redemption.entity';
import { DiscountWriteOff } from '../../common/entities/discount-write-off.entity';
import { Category } from '../../common/entities/category.entity';
import { Product } from '../../common/entities/product.entity';
import { CustomerGrade } from '../../common/entities/customer-grade.entity';
import { CustomerLabel } from '../../common/entities/customer-label.entity';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerLabelAssignment } from '../../common/entities/customer-label-assignment.entity';
import { Location } from '../../common/entities/location.entity';
import { PointsExchangeRule } from '../../common/entities/points-exchange-rule.entity';
import { PointsExchangeRuleDetail } from '../../common/entities/points-exchange-rule-detail.entity';
import { PointsExchangeRedemption } from '../../common/entities/points-exchange-redemption.entity';
import { CustomerPointsHistory } from '../../common/entities/customer-points-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Promotion, PromotionRedemption,
      CouponType, Coupon, CouponRedemption, DiscountWriteOff,
      Category, Product,
      CustomerGrade, CustomerLabel, Customer, CustomerLabelAssignment,
      Location,
      PointsExchangeRule, PointsExchangeRuleDetail, PointsExchangeRedemption,
      CustomerPointsHistory,
    ]),
    BullModule.registerQueue({ name: COUPON_BULK_QUEUE }),
  ],
  controllers: [PromotionController, CouponController, PointsExchangeController],
  providers: [
    PromotionService, PromotionEvaluatorService,
    CouponService, CouponExtService, CouponBulkIssueProcessor,
    PointsExchangeService,
  ],
  exports: [PromotionService, PromotionEvaluatorService, CouponService, CouponExtService, PointsExchangeService],
})
export class PromotionModule {}
