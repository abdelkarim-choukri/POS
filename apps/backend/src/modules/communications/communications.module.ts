import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { CommunicationsController } from './communications.controller';
import { CommunicationsService } from './communications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsPublicController } from './notifications-public.controller';
import { NotificationSendService, NOTIFICATION_CAMPAIGN_QUEUE } from './notification-send.service';
import { NotificationProviderService } from './notification-provider.service';
import { NotificationCampaignProcessor } from './notification-campaign.processor';
import { PlatformAnnouncement } from '../../common/entities/platform-announcement.entity';
import { UserAnnouncementDismissal } from '../../common/entities/user-announcement-dismissal.entity';
import { BusinessAnnouncement } from '../../common/entities/business-announcement.entity';
import { NotificationChannel } from '../../common/entities/notification-channel.entity';
import { NotificationTemplate } from '../../common/entities/notification-template.entity';
import { NotificationSend } from '../../common/entities/notification-send.entity';
import { Business } from '../../common/entities/business.entity';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerLabelAssignment } from '../../common/entities/customer-label-assignment.entity';
import { AuditLog } from '../../common/entities/audit-log.entity';

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
      Customer,
      CustomerLabelAssignment,
      AuditLog,
    ]),
    BullModule.registerQueue({ name: NOTIFICATION_CAMPAIGN_QUEUE }),
  ],
  controllers: [
    CommunicationsController,
    NotificationsController,
    NotificationsPublicController,
  ],
  providers: [
    CommunicationsService,
    NotificationSendService,
    NotificationProviderService,
    NotificationCampaignProcessor,
  ],
  exports: [CommunicationsService, NotificationSendService, NotificationProviderService],
})
export class CommunicationsModule {}
