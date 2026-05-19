import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { CommunicationsService } from './communications.service';
import { PlatformAnnouncement } from '../../common/entities/platform-announcement.entity';
import { UserAnnouncementDismissal } from '../../common/entities/user-announcement-dismissal.entity';
import { BusinessAnnouncement } from '../../common/entities/business-announcement.entity';
import { NotificationChannel } from '../../common/entities/notification-channel.entity';
import { Business } from '../../common/entities/business.entity';

const BIZ_ID = 'biz-com-1';
const USER_ID = 'user-com-1';
const BIZ_TYPE_ID = 'bt-uuid-1';
const ANN_ID = 'ann-uuid-1';

function makeBusiness(): Partial<Business> {
  return { id: BIZ_ID, business_type_id: BIZ_TYPE_ID } as Business;
}

function makePlatformAnnouncement(overrides: Partial<PlatformAnnouncement> = {}): PlatformAnnouncement {
  return {
    id: ANN_ID,
    title: 'Platform Update',
    body: 'New features released.',
    severity: 'info',
    target_business_type_ids: [],
    target_business_ids: [],
    display_on_homepage: true,
    display_until: new Date('2099-12-31'),
    created_by_user_id: 'sa-1',
    created_by: null as any,
    created_at: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeQb(rows: any[]) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(rows),
    getManyAndCount: jest.fn().mockResolvedValue([rows, rows.length]),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
  };
}

async function buildService(overrides: Record<string, any> = {}) {
  const platformRepo = {
    findOne: jest.fn().mockResolvedValue(makePlatformAnnouncement()),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((d: any) => d),
    save: jest.fn((e: any) => Promise.resolve({ id: ANN_ID, ...e })),
    remove: jest.fn().mockResolvedValue({}),
    createQueryBuilder: jest.fn().mockReturnValue(makeQb([makePlatformAnnouncement()])),
    ...overrides.platformRepo,
  };
  const dismissalRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue({}),
    ...overrides.dismissalRepo,
  };
  const bizAnnRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((d: any) => d),
    save: jest.fn((e: any) => Promise.resolve({ id: 'bann-uuid-1', ...e })),
    remove: jest.fn().mockResolvedValue({}),
    createQueryBuilder: jest.fn().mockReturnValue(makeQb([])),
    ...overrides.bizAnnRepo,
  };
  const channelRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    upsert: jest.fn().mockResolvedValue({}),
    ...overrides.channelRepo,
  };
  const businessRepo = {
    findOne: jest.fn().mockResolvedValue(makeBusiness()),
    ...overrides.businessRepo,
  };

  const module = await Test.createTestingModule({
    providers: [
      CommunicationsService,
      { provide: getRepositoryToken(PlatformAnnouncement), useValue: platformRepo },
      { provide: getRepositoryToken(UserAnnouncementDismissal), useValue: dismissalRepo },
      { provide: getRepositoryToken(BusinessAnnouncement), useValue: bizAnnRepo },
      { provide: getRepositoryToken(NotificationChannel), useValue: channelRepo },
      { provide: getRepositoryToken(Business), useValue: businessRepo },
    ],
  }).compile();

  return {
    service: module.get(CommunicationsService),
    platformRepo, dismissalRepo, bizAnnRepo, channelRepo, businessRepo,
  };
}

describe('CommunicationsService', () => {
  // ── COM-005 ─────────────────────────────────────────────────────────────────
  describe('getActivePlatformAnnouncements [COM-005]', () => {
    it('returns active announcements targeted at the business', async () => {
      const ann = makePlatformAnnouncement();
      const { service } = await buildService({
        platformRepo: {
          createQueryBuilder: jest.fn().mockReturnValue(makeQb([ann])),
        },
      });

      const result = await service.getActivePlatformAnnouncements(BIZ_ID, USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(ANN_ID);
    });

    it('returns empty array when business not found', async () => {
      const { service } = await buildService({
        businessRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });

      const result = await service.getActivePlatformAnnouncements('nonexistent', USER_ID);

      expect(result).toHaveLength(0);
    });
  });

  // ── COM-006 ─────────────────────────────────────────────────────────────────
  describe('dismissPlatformAnnouncement [COM-006]', () => {
    it('inserts dismissal when not previously dismissed', async () => {
      const { service, dismissalRepo } = await buildService({
        dismissalRepo: { findOne: jest.fn().mockResolvedValue(null), save: jest.fn().mockResolvedValue({}) },
      });

      const result = await service.dismissPlatformAnnouncement(ANN_ID, USER_ID);

      expect(dismissalRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: USER_ID, announcement_id: ANN_ID }),
      );
      expect(result.dismissed).toBe(true);
    });

    it('is idempotent — does not throw when already dismissed', async () => {
      const { service, dismissalRepo } = await buildService({
        dismissalRepo: {
          findOne: jest.fn().mockResolvedValue({ user_id: USER_ID, announcement_id: ANN_ID }),
          save: jest.fn(),
        },
      });

      const result = await service.dismissPlatformAnnouncement(ANN_ID, USER_ID);

      expect(dismissalRepo.save).not.toHaveBeenCalled();
      expect(result.dismissed).toBe(true);
    });

    it('returns 404 when announcement does not exist', async () => {
      const { service } = await buildService({
        platformRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });

      await expect(service.dismissPlatformAnnouncement('nonexistent', USER_ID))
        .rejects.toMatchObject({ response: { error: 'COM_ANNOUNCEMENT_NOT_FOUND' } });
    });
  });

  // ── COM-010/011 ──────────────────────────────────────────────────────────────
  describe('createBusinessAnnouncement [COM-010]', () => {
    it('creates announcement scoped to business', async () => {
      const { service, bizAnnRepo } = await buildService();

      await service.createBusinessAnnouncement(
        BIZ_ID,
        { title: 'Staff Meeting', body: 'Tomorrow at 9AM', target_role: 'manager' },
        USER_ID,
      );

      expect(bizAnnRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ business_id: BIZ_ID, target_role: 'manager' }),
      );
      expect(bizAnnRepo.save).toHaveBeenCalled();
    });

    it('defaults target_role to "all" when not provided', async () => {
      const { service, bizAnnRepo } = await buildService();

      await service.createBusinessAnnouncement(BIZ_ID, { title: 'T', body: 'B' }, USER_ID);

      const created = bizAnnRepo.create.mock.calls[0][0];
      expect(created.target_role).toBe('all');
    });
  });

  describe('getAnnouncementsForMe [COM-011]', () => {
    it('filters by role — manager sees manager and all announcements', async () => {
      const annAll = { id: '1', target_role: 'all', is_active: true, display_until: null };
      const annMgr = { id: '2', target_role: 'manager', is_active: true, display_until: null };
      const qb = makeQb([annAll, annMgr]);
      const { service } = await buildService({ bizAnnRepo: { createQueryBuilder: jest.fn().mockReturnValue(qb) } });

      const result = await service.getAnnouncementsForMe(BIZ_ID, 'manager');

      expect(result).toHaveLength(2);
      // Verify the role filter is applied
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining("target_role = 'all' OR a.target_role = :role"),
        expect.objectContaining({ role: 'manager' }),
      );
    });

    it('excludes expired announcements', async () => {
      const qb = makeQb([]); // expired ones filtered out in query
      const { service } = await buildService({ bizAnnRepo: { createQueryBuilder: jest.fn().mockReturnValue(qb) } });

      await service.getAnnouncementsForMe(BIZ_ID, 'employee');

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('display_until IS NULL OR a.display_until > :now'),
        expect.any(Object),
      );
    });
  });

  // ── COM-020/021 ──────────────────────────────────────────────────────────────
  describe('getChannels [COM-020]', () => {
    it('redacts credentials in provider_config_json', async () => {
      const smsChannel = {
        business_id: BIZ_ID,
        channel: 'sms',
        provider: 'infobip',
        provider_config_json: { api_key: 'secret-key', account_id: 'acc123' },
        is_active: true,
      };
      const { service } = await buildService({
        channelRepo: { find: jest.fn().mockResolvedValue([smsChannel]) },
      });

      const result = await service.getChannels(BIZ_ID);

      expect(result).toHaveLength(1);
      expect(result[0].provider_config_json).toEqual({ api_key: '***', account_id: '***' });
    });

    it('returns null provider_config_json when channel has none', async () => {
      const channel = { business_id: BIZ_ID, channel: 'email', provider_config_json: null };
      const { service } = await buildService({
        channelRepo: { find: jest.fn().mockResolvedValue([channel]) },
      });

      const result = await service.getChannels(BIZ_ID);

      expect(result[0].provider_config_json).toBeNull();
    });
  });

  describe('upsertChannel [COM-021]', () => {
    it('calls upsert with conflict on (business_id, channel)', async () => {
      const saved = { business_id: BIZ_ID, channel: 'sms', provider: 'infobip', is_active: true };
      const { service, channelRepo } = await buildService({
        channelRepo: {
          upsert: jest.fn().mockResolvedValue({}),
          findOne: jest.fn().mockResolvedValue(saved),
        },
      });

      const result = await service.upsertChannel(BIZ_ID, {
        channel: 'sms',
        provider: 'infobip',
        is_active: true,
      });

      expect(channelRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ business_id: BIZ_ID, channel: 'sms' }),
        expect.objectContaining({ conflictPaths: ['business_id', 'channel'] }),
      );
      expect(result).toEqual(saved);
    });
  });

  // ── COM-031 ──────────────────────────────────────────────────────────────────
  describe('getSmsBalance [COM-031]', () => {
    it('returns cached balance when SMS channel is configured', async () => {
      const smsChannel = {
        business_id: BIZ_ID,
        channel: 'sms',
        balance_cached: 500,
        balance_refreshed_at: new Date('2026-05-01'),
      };
      const { service } = await buildService({
        channelRepo: { findOne: jest.fn().mockResolvedValue(smsChannel) },
      });

      const result = await service.getSmsBalance(BIZ_ID);

      expect(result).toEqual({
        balance: 500,
        last_refreshed_at: smsChannel.balance_refreshed_at,
      });
    });

    it('returns null message when SMS channel not configured', async () => {
      const { service } = await buildService({
        channelRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });

      const result = await service.getSmsBalance(BIZ_ID);

      expect(result).toEqual({ balance: null, message: 'SMS channel not configured' });
    });
  });

  // ── cross-tenant ─────────────────────────────────────────────────────────────
  describe('cross-tenant isolation', () => {
    it('updateBusinessAnnouncement returns 404 for wrong business', async () => {
      const { service } = await buildService({
        bizAnnRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });

      await expect(
        service.updateBusinessAnnouncement(ANN_ID, 'other-biz', { title: 'Hack' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
