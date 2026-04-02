import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { Business } from '../../common/entities/business.entity';
import { BusinessType } from '../../common/entities/business-type.entity';
import { BusinessTypeFeature } from '../../common/entities/business-type-feature.entity';
import { Location } from '../../common/entities/location.entity';
import { Terminal } from '../../common/entities/terminal.entity';
import { User } from '../../common/entities/user.entity';
import { Subscription } from '../../common/entities/subscription.entity';
import { AuditLog } from '../../common/entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Business, BusinessType, BusinessTypeFeature,
      Location, Terminal, User, Subscription, AuditLog,
    ]),
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule {}
