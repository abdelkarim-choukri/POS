import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ChainService, CHAIN_SYNC_QUEUE } from './chain.service';
import { ChainSuperController } from './chain-super.controller';
import { ChainAuthController } from './chain-auth.controller';
import { ChainController } from './chain.controller';
import { ChainSyncProcessor } from './chain-sync.processor';
import { Business } from '../../common/entities/business.entity';
import { User } from '../../common/entities/user.entity';
import { UserBusinessRole } from '../../common/entities/user-business-role.entity';
import { ChainSyncConfig } from '../../common/entities/chain-sync-config.entity';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Business, User, UserBusinessRole, ChainSyncConfig, AuditLog]),
    BullModule.registerQueue({ name: CHAIN_SYNC_QUEUE }),
    AuthModule,
  ],
  controllers: [ChainSuperController, ChainAuthController, ChainController],
  providers: [ChainService, ChainSyncProcessor],
})
export class ChainModule {}
