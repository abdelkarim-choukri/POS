import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { Business } from '../../common/entities/business.entity';
import { BusinessType } from '../../common/entities/business-type.entity';
import { BusinessTypeFeature } from '../../common/entities/business-type-feature.entity';
import { Location } from '../../common/entities/location.entity';
import { Terminal } from '../../common/entities/terminal.entity';
import { User } from '../../common/entities/user.entity';
import { Subscription } from '../../common/entities/subscription.entity';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { PlatformAnnouncement } from '../../common/entities/platform-announcement.entity';

const SA_ID = 'super-admin-uuid-1';
const ANN_ID = 'announcement-uuid-1';

function makeAnnouncement(overrides: Partial<PlatformAnnouncement> = {}): PlatformAnnouncement {
  return {
    id: ANN_ID,
    title: 'System Maintenance',
    body: 'System will be down for maintenance.',
    severity: 'warning',
    target_business_type_ids: [],
    target_business_ids: [],
    display_on_homepage: true,
    display_until: new Date('2099-12-31'),
    created_by_user_id: SA_ID,
    created_by: null as any,
    created_at: new Date('2026-05-01'),
    ...overrides,
  };
}

function makeEmptyRepo() {
  return {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((d: any) => d),
    save: jest.fn((e: any) => Promise.resolve({ id: ANN_ID, ...e })),
    remove: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    }),
  };
}

async function buildService(announcementRepoOverrides: Record<string, any> = {}) {
  const announcementRepo = { ...makeEmptyRepo(), ...announcementRepoOverrides };

  const module = await Test.createTestingModule({
    providers: [
      SuperAdminService,
      { provide: getRepositoryToken(Business), useValue: makeEmptyRepo() },
      { provide: getRepositoryToken(BusinessType), useValue: makeEmptyRepo() },
      { provide: getRepositoryToken(BusinessTypeFeature), useValue: makeEmptyRepo() },
      { provide: getRepositoryToken(Location), useValue: makeEmptyRepo() },
      { provide: getRepositoryToken(Terminal), useValue: makeEmptyRepo() },
      { provide: getRepositoryToken(User), useValue: makeEmptyRepo() },
      { provide: getRepositoryToken(Subscription), useValue: makeEmptyRepo() },
      { provide: getRepositoryToken(AuditLog), useValue: makeEmptyRepo() },
      { provide: getRepositoryToken(PlatformAnnouncement), useValue: announcementRepo },
    ],
  }).compile();

  return { service: module.get(SuperAdminService), announcementRepo };
}

describe('SuperAdminService — Platform Announcements', () => {
  describe('createPlatformAnnouncement [COM-002]', () => {
    it('creates announcement with correct fields and sets created_by_user_id', async () => {
      const { service, announcementRepo } = await buildService();

      await service.createPlatformAnnouncement(
        { title: 'Maintenance', body: 'Down for maintenance', severity: 'warning' },
        SA_ID,
      );

      expect(announcementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Maintenance',
          severity: 'warning',
          created_by_user_id: SA_ID,
        }),
      );
      expect(announcementRepo.save).toHaveBeenCalled();
    });

    it('defaults severity to "info" when not provided', async () => {
      const { service, announcementRepo } = await buildService();

      await service.createPlatformAnnouncement({ title: 'Info', body: 'Body' }, SA_ID);

      const created = announcementRepo.create.mock.calls[0][0];
      expect(created.severity).toBe('info');
    });
  });

  describe('listPlatformAnnouncements [COM-001]', () => {
    it('returns paginated results', async () => {
      const rows = [makeAnnouncement()];
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([rows, 1]),
      };
      const { service } = await buildService({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      });

      const result = await service.listPlatformAnnouncements({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('filters by severity when provided', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      const { service } = await buildService({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      });

      await service.listPlatformAnnouncements({ severity: 'critical' });

      expect(qb.where).toHaveBeenCalledWith('a.severity = :severity', { severity: 'critical' });
    });
  });

  describe('updatePlatformAnnouncement [COM-003]', () => {
    it('updates fields and saves', async () => {
      const existing = makeAnnouncement();
      const { service, announcementRepo } = await buildService({
        findOne: jest.fn().mockResolvedValue(existing),
        save: jest.fn((e: any) => Promise.resolve(e)),
      });

      const result = await service.updatePlatformAnnouncement(ANN_ID, {
        title: 'Updated Title',
        severity: 'critical',
      });

      expect(result.title).toBe('Updated Title');
      expect(result.severity).toBe('critical');
      expect(announcementRepo.save).toHaveBeenCalled();
    });

    it('returns 404 when announcement not found', async () => {
      const { service } = await buildService({ findOne: jest.fn().mockResolvedValue(null) });

      await expect(service.updatePlatformAnnouncement('nonexistent', {}))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('deletePlatformAnnouncement [COM-004]', () => {
    it('hard deletes the announcement', async () => {
      const existing = makeAnnouncement();
      const { service, announcementRepo } = await buildService({
        findOne: jest.fn().mockResolvedValue(existing),
      });

      const result = await service.deletePlatformAnnouncement(ANN_ID);

      expect(announcementRepo.remove).toHaveBeenCalledWith(existing);
      expect(result.deleted).toBe(true);
    });

    it('returns 404 when announcement not found', async () => {
      const { service } = await buildService({ findOne: jest.fn().mockResolvedValue(null) });

      await expect(service.deletePlatformAnnouncement('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
