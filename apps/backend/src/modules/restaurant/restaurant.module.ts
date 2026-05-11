import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';
import { TableSessionController } from './table-session.controller';
import { TableSessionService } from './table-session.service';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DiningArea,
      TableType,
      RestaurantTable,
      TableSession,
      TableSessionItem,
      Product,
      ProductVariant,
      Transaction,
    ]),
  ],
  controllers: [RestaurantController, TableSessionController, OssController],
  providers: [RestaurantService, TableSessionService, OssService],
  exports: [RestaurantService, TableSessionService, OssService],
})
export class RestaurantModule {}
