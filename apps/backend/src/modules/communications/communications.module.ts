import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationsController } from './communications.controller';
import { CommunicationsService } from './communications.service';
import { PlatformAnnouncement } from '../../common/entities/platform-announcement.entity';
import { UserAnnouncementDismissal } from '../../common/entities/user-announcement-dismissal.entity';
import { BusinessAnnouncement } from '../../common/entities/business-announcement.entity';
import { NotificationChannel } from '../../common/entities/notification-channel.entity';
import { NotificationTemplate } from '../../common/entities/notification-template.entity';
import { NotificationSend } from '../../common/entities/notification-send.entity';
import { Business } from '../../common/entities/business.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlatformAnnouncement,
      UserAnnouncementDismissal,
      BusinessAnnouncement,
      NotificationChannel,
      NotificationTemplate,
      NotificationSend,
      Business,
    ]),
  ],
  controllers: [CommunicationsController],
  providers: [CommunicationsService],
  exports: [CommunicationsService],
})
export class CommunicationsModule {}
