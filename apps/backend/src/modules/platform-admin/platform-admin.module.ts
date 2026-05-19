import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformAdminSuperController } from './platform-admin-super.controller';
import { PlatformAdminBusinessController } from './platform-admin-business.controller';
import { PlatformAdminAuthController } from './platform-admin-auth.controller';
import { TradeCategory } from '../../common/entities/trade-category.entity';
import { Courier } from '../../common/entities/courier.entity';
import { BusinessCourierLink } from '../../common/entities/business-courier-link.entity';
import { BusinessCustomAuthority } from '../../common/entities/business-custom-authority.entity';
import { VersionLogMenu } from '../../common/entities/version-log-menu.entity';
import { VersionLogEntry } from '../../common/entities/version-log-entry.entity';
import { SystemParameter } from '../../common/entities/system-parameter.entity';
import { MoroccoRegion } from '../../common/entities/morocco-region.entity';
import { Business } from '../../common/entities/business.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TradeCategory, Courier, BusinessCourierLink, BusinessCustomAuthority,
      VersionLogMenu, VersionLogEntry, SystemParameter, MoroccoRegion, Business,
    ]),
  ],
  controllers: [
    PlatformAdminSuperController,
    PlatformAdminBusinessController,
    PlatformAdminAuthController,
  ],
  providers: [PlatformAdminService],
  exports: [PlatformAdminService],
})
export class PlatformAdminModule {}
