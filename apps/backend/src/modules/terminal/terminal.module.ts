import { Module } from '@nestjs/common';
import { KdsModule } from '../kds/kds.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KdsModule } from '../kds/kds.module';
import { TerminalController } from './terminal.controller';
import { KdsModule } from '../kds/kds.module';
import { TerminalService } from './terminal.service';
import { KdsModule } from '../kds/kds.module';
import { Terminal } from '../../common/entities/terminal.entity';
import { KdsModule } from '../kds/kds.module';
import { User } from '../../common/entities/user.entity';
import { KdsModule } from '../kds/kds.module';
import { ClockEntry } from '../../common/entities/clock-entry.entity';
import { KdsModule } from '../kds/kds.module';
import { Category } from '../../common/entities/category.entity';
import { KdsModule } from '../kds/kds.module';
import { Product } from '../../common/entities/product.entity';
import { KdsModule } from '../kds/kds.module';
import { Transaction } from '../../common/entities/transaction.entity';
import { KdsModule } from '../kds/kds.module';
import { TransactionItem } from '../../common/entities/transaction-item.entity';
import { KdsModule } from '../kds/kds.module';
import { Void } from '../../common/entities/void.entity';
import { KdsModule } from '../kds/kds.module';
import { SyncQueue } from '../../common/entities/sync-queue.entity';
import { KdsModule } from '../kds/kds.module';

@Module({
  imports: [
    KdsModule,
    TypeOrmModule.forFeature([
      Terminal, User, ClockEntry, Category, Product,
      Transaction, TransactionItem, Void, SyncQueue,
    ]),
  ],
  controllers: [TerminalController],
  providers: [TerminalService],
})
export class TerminalModule {}
