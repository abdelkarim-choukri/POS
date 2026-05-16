import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { UnitOfMeasure } from '../../common/entities/unit-of-measure.entity';
import { Warehouse } from '../../common/entities/warehouse.entity';
import { Vendor } from '../../common/entities/vendor.entity';
import { VendorCheckDetail } from '../../common/entities/vendor-check-detail.entity';
import { Brand } from '../../common/entities/brand.entity';
import { NutritionInfo } from '../../common/entities/nutrition-info.entity';
import { Product } from '../../common/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UnitOfMeasure,
      Warehouse,
      Vendor,
      VendorCheckDetail,
      Brand,
      NutritionInfo,
      Product,
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
