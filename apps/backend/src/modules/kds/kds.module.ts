import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../../common/entities/transaction.entity';
import { TableSessionItem } from '../../common/entities/table-session-item.entity';
import { KdsGateway } from './kds.gateway';
import { KdsService } from './kds.service';
import { KdsController } from './kds.controller';
import { KdsItemsController } from './kds-items.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, TableSessionItem])],
  providers: [KdsGateway, KdsService],
  controllers: [KdsController, KdsItemsController],
  exports: [KdsService],
})
export class KdsModule {}
