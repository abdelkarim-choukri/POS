import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';
import { TableSessionController } from './table-session.controller';
import { TableSessionService } from './table-session.service';
import { DiningArea } from '../../common/entities/dining-area.entity';
import { TableType } from '../../common/entities/table-type.entity';
import { RestaurantTable } from '../../common/entities/table.entity';
import { TableSession } from '../../common/entities/table-session.entity';
import { TableSessionItem } from '../../common/entities/table-session-item.entity';
import { Product } from '../../common/entities/product.entity';
import { ProductVariant } from '../../common/entities/product-variant.entity';

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
    ]),
  ],
  controllers: [RestaurantController, TableSessionController],
  providers: [RestaurantService, TableSessionService],
  exports: [RestaurantService, TableSessionService],
})
export class RestaurantModule {}
