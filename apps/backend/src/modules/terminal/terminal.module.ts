import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KdsModule } from '../kds/kds.module';
import { TerminalController } from './terminal.controller';
import { TerminalService } from './terminal.service';
import { Terminal } from '../../common/entities/terminal.entity';
import { User } from '../../common/entities/user.entity';
import { ClockEntry } from '../../common/entities/clock-entry.entity';
import { Category } from '../../common/entities/category.entity';
import { Product } from '../../common/entities/product.entity';
import { Transaction } from '../../common/entities/transaction.entity';
import { TransactionItem } from '../../common/entities/transaction-item.entity';
import { Void } from '../../common/entities/void.entity';
import { SyncQueue } from '../../common/entities/sync-queue.entity';

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
