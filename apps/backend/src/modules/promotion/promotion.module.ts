import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';
import { PromotionEvaluatorService } from './promotion-evaluator.service';
import { Promotion } from '../../common/entities/promotion.entity';
import { PromotionRedemption } from '../../common/entities/promotion-redemption.entity';
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
      Category, Product,
      CustomerGrade, CustomerLabel, Customer, CustomerLabelAssignment,
      Location,
    ]),
  ],
  controllers: [PromotionController],
  providers: [PromotionService, PromotionEvaluatorService],
  exports: [PromotionService, PromotionEvaluatorService],
})
export class PromotionModule {}
