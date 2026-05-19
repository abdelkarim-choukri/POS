import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformAnnouncement } from '../../common/entities/platform-announcement.entity';
import { UserAnnouncementDismissal } from '../../common/entities/user-announcement-dismissal.entity';
import { BusinessAnnouncement } from '../../common/entities/business-announcement.entity';
import { NotificationChannel } from '../../common/entities/notification-channel.entity';
import { Business } from '../../common/entities/business.entity';
import {
  CreateBusinessAnnouncementDto, UpdateBusinessAnnouncementDto,
  UpsertNotificationChannelDto, TestChannelDto,
} from './dto/communications.dto';

@Injectable()
export class CommunicationsService {
  constructor(
    @InjectRepository(PlatformAnnouncement)
    private platformAnnouncementRepo: Repository<PlatformAnnouncement>,
    @InjectRepository(UserAnnouncementDismissal)
    private dismissalRepo: Repository<UserAnnouncementDismissal>,
    @InjectRepository(BusinessAnnouncement)
    private bizAnnouncementRepo: Repository<BusinessAnnouncement>,
    @InjectRepository(NotificationChannel)
    private channelRepo: Repository<NotificationChannel>,
    @InjectRepository(Business)
    private businessRepo: Repository<Business>,
  ) {}

  // ── COM-005: Get active platform announcements for this business ────────────

  async getActivePlatformAnnouncements(businessId: string, userId: string) {
    const business = await this.businessRepo.findOne({ where: { id: businessId } });
    if (!business) return [];

    const now = new Date();
    const announcements = await this.platformAnnouncementRepo
      .createQueryBuilder('a')
      .where('(a.display_until IS NULL OR a.display_until > :now)', { now })
      .andWhere(
        '(cardinality(a.target_business_type_ids) = 0 OR :btid = ANY(a.target_business_type_ids))',
        { btid: business.business_type_id },
      )
      .andWhere(
        '(cardinality(a.target_business_ids) = 0 OR :bid = ANY(a.target_business_ids))',
        { bid: businessId },
      )
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM user_announcement_dismissals d
          WHERE d.user_id = :userId AND d.announcement_id = a.id
        )`,
        { userId },
      )
      .orderBy('a.created_at', 'DESC')
      .getMany();

    return announcements;
  }

  // ── COM-006: Dismiss a platform announcement (idempotent) ──────────────────

  async dismissPlatformAnnouncement(announcementId: string, userId: string) {
    const announcement = await this.platformAnnouncementRepo.findOne({
      where: { id: announcementId },
    });
    if (!announcement) throw new NotFoundException({ error: 'COM_ANNOUNCEMENT_NOT_FOUND', message: 'Announcement not found' });

    const existing = await this.dismissalRepo.findOne({
      where: { user_id: userId, announcement_id: announcementId },
    });
    if (!existing) {
      await this.dismissalRepo.save({ user_id: userId, announcement_id: announcementId });
    }
    return { dismissed: true };
  }

  // ── COM-010: Business announcements CRUD ───────────────────────────────────

  listBusinessAnnouncements(businessId: string) {
    return this.bizAnnouncementRepo.find({
      where: { business_id: businessId },
      order: { created_at: 'DESC' },
    });
  }

  async createBusinessAnnouncement(
    businessId: string,
    dto: CreateBusinessAnnouncementDto,
    userId: string,
  ) {
    const a = this.bizAnnouncementRepo.create({
      business_id: businessId,
      title: dto.title,
      body: dto.body,
      target_role: dto.target_role ?? 'all',
      display_until: dto.display_until ? new Date(dto.display_until) : null,
      is_active: dto.is_active ?? true,
      created_by_user_id: userId,
    });
    return this.bizAnnouncementRepo.save(a);
  }

  async updateBusinessAnnouncement(
    id: string,
    businessId: string,
    dto: UpdateBusinessAnnouncementDto,
  ) {
    const a = await this.bizAnnouncementRepo.findOne({ where: { id, business_id: businessId } });
    if (!a) throw new NotFoundException({ error: 'COM_ANNOUNCEMENT_NOT_FOUND', message: 'Announcement not found' });

    if (dto.title !== undefined) a.title = dto.title;
    if (dto.body !== undefined) a.body = dto.body;
    if (dto.target_role !== undefined) a.target_role = dto.target_role;
    if (dto.display_until !== undefined) a.display_until = dto.display_until ? new Date(dto.display_until) : null;
    if (dto.is_active !== undefined) a.is_active = dto.is_active;

    return this.bizAnnouncementRepo.save(a);
  }

  async deleteBusinessAnnouncement(id: string, businessId: string) {
    const a = await this.bizAnnouncementRepo.findOne({ where: { id, business_id: businessId } });
    if (!a) throw new NotFoundException({ error: 'COM_ANNOUNCEMENT_NOT_FOUND', message: 'Announcement not found' });
    await this.bizAnnouncementRepo.remove(a);
    return { deleted: true };
  }

  // ── COM-011: Announcements for current user ────────────────────────────────

  getAnnouncementsForMe(businessId: string, userRole: string) {
    const now = new Date();
    return this.bizAnnouncementRepo
      .createQueryBuilder('a')
      .where('a.business_id = :businessId', { businessId })
      .andWhere('a.is_active = true')
      .andWhere('(a.display_until IS NULL OR a.display_until > :now)', { now })
      .andWhere("(a.target_role = 'all' OR a.target_role = :role)", { role: userRole })
      .orderBy('a.created_at', 'DESC')
      .getMany();
  }

  // ── COM-020: Get channel configs with redacted credentials ─────────────────

  async getChannels(businessId: string) {
    const channels = await this.channelRepo.find({ where: { business_id: businessId } });
    return channels.map((ch) => ({
      ...ch,
      provider_config_json: ch.provider_config_json
        ? Object.fromEntries(Object.keys(ch.provider_config_json).map((k) => [k, '***']))
        : null,
    }));
  }

  // ── COM-021: Upsert channel config ────────────────────────────────────────

  async upsertChannel(businessId: string, dto: UpsertNotificationChannelDto) {
    const channelData: Partial<NotificationChannel> = {
      business_id: businessId,
      channel: dto.channel,
    };
    if (dto.provider !== undefined) channelData.provider = dto.provider;
    if (dto.provider_config_json !== undefined) channelData.provider_config_json = dto.provider_config_json;
    if (dto.default_sender_id !== undefined) channelData.default_sender_id = dto.default_sender_id;
    if (dto.default_sender_name !== undefined) channelData.default_sender_name = dto.default_sender_name;
    if (dto.is_active !== undefined) channelData.is_active = dto.is_active;

    await this.channelRepo.upsert(channelData as NotificationChannel, {
      conflictPaths: ['business_id', 'channel'],
      skipUpdateIfNoValuesChanged: true,
    });

    return this.channelRepo.findOne({ where: { business_id: businessId, channel: dto.channel } });
  }

  // ── COM-022: Test channel (stub) ───────────────────────────────────────────

  testChannel(businessId: string, dto: TestChannelDto) {
    // TODO: implement real provider test send for SMS/email/WhatsApp
    console.log(`[CommunicationsService] test send requested for channel ${dto.channel} by business ${businessId}`);
    return {
      success: true,
      message: 'Test dispatched (stub — provider integration pending)',
    };
  }

  // ── COM-030: Refresh SMS balance (stub) ───────────────────────────────────

  refreshSmsBalance(businessId: string) {
    // TODO: call SMS provider balance API and update notification_channels.balance_cached
    console.log(`[CommunicationsService] SMS balance refresh requested for business ${businessId}`);
    return { balance: 0, message: 'SMS provider integration pending (stub)' };
  }

  // ── COM-031: Get cached SMS balance ───────────────────────────────────────

  async getSmsBalance(businessId: string) {
    const channel = await this.channelRepo.findOne({
      where: { business_id: businessId, channel: 'sms' },
    });
    if (!channel) {
      return { balance: null, message: 'SMS channel not configured' };
    }
    return {
      balance: channel.balance_cached,
      last_refreshed_at: channel.balance_refreshed_at,
    };
  }
}
