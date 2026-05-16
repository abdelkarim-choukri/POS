import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KdsModule } from '../kds/kds.module';
import { PromotionModule } from '../promotion/promotion.module';
import { InventoryModule } from '../inventory/inventory.module';
import { TerminalController } from './terminal.controller';
import { TerminalService } from './terminal.service';
import { DiscountPipelineService } from '../../common/services/discount-pipeline.service';
import { Terminal } from '../../common/entities/terminal.entity';
import { User } from '../../common/entities/user.entity';
import { ClockEntry } from '../../common/entities/clock-entry.entity';
import { Category } from '../../common/entities/category.entity';
import { Product } from '../../common/entities/product.entity';
import { Transaction } from '../../common/entities/transaction.entity';
import { TransactionItem } from '../../common/entities/transaction-item.entity';
import { Void } from '../../common/entities/void.entity';
import { SyncQueue } from '../../common/entities/sync-queue.entity';
import { Business } from '../../common/entities/business.entity';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerGrade } from '../../common/entities/customer-grade.entity';
import { CustomerPointsHistory } from '../../common/entities/customer-points-history.entity';
import { Coupon } from '../../common/entities/coupon.entity';
import { TableSession } from '../../common/entities/table-session.entity';

@Module({
  imports: [
    KdsModule,
    PromotionModule,
    InventoryModule,
    TypeOrmModule.forFeature([
      Terminal, User, ClockEntry, Category, Product,
      Transaction, TransactionItem, Void, SyncQueue, Business,
      Customer, CustomerGrade, CustomerPointsHistory,
      Coupon, TableSession,
    ]),
  ],
  controllers: [TerminalController],
  providers: [TerminalService, DiscountPipelineService],
})
export class TerminalModule {}
