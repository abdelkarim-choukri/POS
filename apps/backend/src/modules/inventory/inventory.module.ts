import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { StockBatchService } from './stock-batch.service';
import { StockBatchController } from './stock-batch.controller';
import { StockTemplateService } from './stock-template.service';
import { StockTemplateController } from './stock-template.controller';
import { PurchaseOrderService } from './purchase-order.service';
import { PurchaseOrderController } from './purchase-order.controller';
import { AlertService } from './alert.service';
import { AlertController } from './alert.controller';
import { StockConsumptionService } from './stock-consumption.service';
import { StockSchedulerService } from './stock-scheduler.service';
import { ExpirationScanProcessor, EXPIRATION_SCAN_QUEUE } from './processors/expiration-scan.processor';
import { ReconciliationProcessor, RECONCILIATION_QUEUE } from './processors/reconciliation.processor';
import { UnitOfMeasure } from '../../common/entities/unit-of-measure.entity';
import { Warehouse } from '../../common/entities/warehouse.entity';
import { Vendor } from '../../common/entities/vendor.entity';
import { VendorCheckDetail } from '../../common/entities/vendor-check-detail.entity';
import { Brand } from '../../common/entities/brand.entity';
import { NutritionInfo } from '../../common/entities/nutrition-info.entity';
import { Product } from '../../common/entities/product.entity';
import { StockBatch } from '../../common/entities/stock-batch.entity';
import { StockMovement } from '../../common/entities/stock-movement.entity';
import { PurchaseOrder } from '../../common/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../common/entities/purchase-order-item.entity';
import { StockTemplate } from '../../common/entities/stock-template.entity';
import { StockTemplateItem } from '../../common/entities/stock-template-item.entity';
import { ExpirationAlert } from '../../common/entities/expiration-alert.entity';
import { StockDiscrepancyAlert } from '../../common/entities/stock-discrepancy-alert.entity';
import { Business } from '../../common/entities/business.entity';

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
      StockBatch,
      StockMovement,
      PurchaseOrder,
      PurchaseOrderItem,
      StockTemplate,
      StockTemplateItem,
      ExpirationAlert,
      StockDiscrepancyAlert,
      Business,
    ]),
    BullModule.registerQueue(
      { name: EXPIRATION_SCAN_QUEUE },
      { name: RECONCILIATION_QUEUE },
    ),
  ],
  controllers: [
    InventoryController,
    StockBatchController,
    StockTemplateController,
    PurchaseOrderController,
    AlertController,
  ],
  providers: [
    InventoryService,
    StockBatchService,
    StockTemplateService,
    PurchaseOrderService,
    AlertService,
    StockConsumptionService,
    StockSchedulerService,
    ExpirationScanProcessor,
    ReconciliationProcessor,
  ],
  exports: [
    InventoryService,
    StockConsumptionService,
  ],
})
export class InventoryModule {}
