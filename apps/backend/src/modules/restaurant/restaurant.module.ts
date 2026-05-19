import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromotionModule } from '../promotion/promotion.module';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';
import { TableSessionController } from './table-session.controller';
import { TableSessionService } from './table-session.service';
import { CheckoutService } from './checkout.service';
import { OssController } from './oss.controller';
import { OssService } from './oss.service';
import { DiningArea } from '../../common/entities/dining-area.entity';
import { TableType } from '../../common/entities/table-type.entity';
import { RestaurantTable } from '../../common/entities/table.entity';
import { TableSession } from '../../common/entities/table-session.entity';
import { TableSessionItem } from '../../common/entities/table-session-item.entity';
import { Product } from '../../common/entities/product.entity';
import { ProductVariant } from '../../common/entities/product-variant.entity';
import { Transaction } from '../../common/entities/transaction.entity';
import { Business } from '../../common/entities/business.entity';
import { AuditLog } from '../../common/entities/audit-log.entity';

@Module({
  imports: [
    PromotionModule,
    TypeOrmModule.forFeature([
      DiningArea,
      TableType,
      RestaurantTable,
      TableSession,
      TableSessionItem,
      Product,
      ProductVariant,
      Transaction,
      Business,
      AuditLog,
    ]),
  ],
  controllers: [RestaurantController, TableSessionController, OssController],
  providers: [RestaurantService, TableSessionService, CheckoutService, OssService],
  exports: [RestaurantService, TableSessionService, CheckoutService, OssService],
})
export class RestaurantModule {}
