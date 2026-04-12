import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../../common/entities/transaction.entity';
import { KdsGateway } from './kds.gateway';
import { KdsService } from './kds.service';
import { KdsController } from './kds.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction])],
  providers: [KdsGateway, KdsService],
  controllers: [KdsController],
  exports: [KdsService],
})
export class KdsModule {}
