import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../../common/entities/business.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { SalesGenerator } from './generators/sales.generator';
import { PaymentsGenerator } from './generators/payments.generator';
import { CustomersGenerator } from './generators/customers.generator';
import { OperationsGenerator } from './generators/operations.generator';
import { AccountingGenerator } from './generators/accounting.generator';
import { ExistingWrappersGenerator } from './generators/existing-wrappers.generator';
import { InventoryReportsGenerator } from './generators/inventory-reports.generator';
import { CapitalDetailGenerator } from './generators/capital-detail.generator';
import { PromotionModule } from '../promotion/promotion.module';

@Module({
  imports: [TypeOrmModule.forFeature([Business]), PromotionModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    SalesGenerator,
    PaymentsGenerator,
    CustomersGenerator,
    OperationsGenerator,
    AccountingGenerator,
    ExistingWrappersGenerator,
    InventoryReportsGenerator,
    CapitalDetailGenerator,
  ],
})
export class ReportsModule {}
