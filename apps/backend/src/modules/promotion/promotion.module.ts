import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';
import { PromotionEvaluatorService } from './promotion-evaluator.service';
import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';
import { Promotion } from '../../common/entities/promotion.entity';
import { PromotionRedemption } from '../../common/entities/promotion-redemption.entity';
import { CouponType } from '../../common/entities/coupon-type.entity';
import { Coupon } from '../../common/entities/coupon.entity';
import { Category } from '../../common/entities/category.entity';
import { Product } from '../../common/entities/product.entity';
import { CustomerGrade } from '../../common/entities/customer-grade.entity';
import { CustomerLabel } from '../../common/entities/customer-label.entity';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerLabelAssignment } from '../../common/entities/customer-label-assignment.entity';
import { Location } from '../../common/entities/location.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Promotion, PromotionRedemption,
      CouponType, Coupon,
      Category, Product,
      CustomerGrade, CustomerLabel, Customer, CustomerLabelAssignment,
      Location,
    ]),
  ],
  controllers: [PromotionController, CouponController],
  providers: [PromotionService, PromotionEvaluatorService, CouponService],
  exports: [PromotionService, PromotionEvaluatorService, CouponService],
})
export class PromotionModule {}
