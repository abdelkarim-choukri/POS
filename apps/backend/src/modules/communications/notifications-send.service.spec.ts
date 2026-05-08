import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { NotificationSendService, NOTIFICATION_CAMPAIGN_QUEUE } from './notification-send.service';
import { NotificationProviderService } from './notification-provider.service';
import { NotificationTemplate } from '../../common/entities/notification-template.entity';
import { NotificationSend } from '../../common/entities/notification-send.entity';
import { NotificationChannel } from '../../common/entities/notification-channel.entity';
import { Customer } from '../../common/entities/customer.entity';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { JobService } from '../jobs/job.service';

const BIZ_ID = 'biz-ns-1';
const TMPL_ID = 'tmpl-uuid-1';
const CUST_ID = 'cust-uuid-1';
const SEND_ID = 'send-uuid-1';

function makeTemplate(overrides: Partial<NotificationTemplate> = {}): NotificationTemplate {
  return {
    id: TMPL_ID,
    business_id: BIZ_ID,
    business: null as any,
    channel: 'sms',
    name: 'Welcome',
    subject: null,
    body: 'Hello {{ customer_first_name }}, you have {{ points_balance }} points.',
    whatsapp_template_id: null,
    is_transactional: false,
    is_active: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: CUST_ID,
    business_id: BIZ_ID,
    business: null as any,
    customer_code: 'CUST-001',
    first_name: 'Ali',
    last_name: 'Benali',
    phone: '+212600000001',
    email: 'ali@example.com',
    birthday: null as any,
    gender: null as any,
    address: null as any,
    grade_id: null as any,
    grade: null as any,
    points_balance: 500,
    lifetime_points: 500,
    is_active: true,
    consent_marketing: true,
    notes: null as any,
    label_assignments: [],
    attribute_values: [],
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeChannel(overrides: Partial<NotificationChannel> = {}): NotificationChannel {
  return {
    business_id: BIZ_ID,
    channel: 'sms',
    provider: 'infobip',
    provider_config_json: null,
    default_sender_id: 'MYSHOP',
    default_sender_name: null,
    balance_cached: 100,
    balance_refreshed_at: null,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    business: null as any,
    ...overrides,
  };
}

function makeNotificationSend(overrides: Partial<NotificationSend> = {}): NotificationSend {
  return {
    id: SEND_ID,
    business_id: BIZ_ID,
    channel: 'sms',
    template_id: TMPL_ID,
    recipient_customer_id: CUST_ID,
    recipient_address: '+212600000001',
    subject: null,
    body_rendered: 'Hello',
    provider_message_id: 'stub-abc',
    status: 'sent',
    error_message: null,
    sent_at: new Date(),
    delivered_at: null,
    read_at: null,
    linked_promotion_id: null,
    linked_coupon_id: null,
    campaign_job_id: null,
    opt_out_token: 'tok123',
    created_at: new Date(),
    template: null as any,
    recipient_customer: null as any,
    business: null as any,
    linked_promotion: null as any,
    linked_coupon: null as any,
    campaign_job: null as any,
    ...overrides,
  };
}

function makeEmptyRepo() {
  return {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((d: any) => d),
    save: jest.fn((e: any) => Promise.resolve({ id: TMPL_ID, ...e })),
    remove: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
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

async function buildService(overrides: Record<string, any> = {}) {
  const templateRepo = { ...makeEmptyRepo(), findOne: jest.fn().mockResolvedValue(makeTemplate()), ...overrides.templateRepo };
  const sendRepo = { ...makeEmptyRepo(), findOne: jest.fn().mockResolvedValue(null), save: jest.fn((e: any) => Promise.resolve({ id: SEND_ID, ...e })), ...overrides.sendRepo };
  const channelRepo = { ...makeEmptyRepo(), findOne: jest.fn().mockResolvedValue(makeChannel()), update: jest.fn().mockResolvedValue({}), ...overrides.channelRepo };
  const customerRepo = { ...makeEmptyRepo(), findOne: jest.fn().mockResolvedValue(makeCustomer()), ...overrides.customerRepo };
  const auditLogRepo = { ...makeEmptyRepo(), save: jest.fn().mockResolvedValue({}), create: jest.fn((d: any) => d), ...overrides.auditLogRepo };

  const jobService = { createJob: jest.fn().mockResolvedValue({ id: 'job-1' }), ...overrides.jobService };
  const providerService = { send: jest.fn().mockResolvedValue({ success: true, provider_message_id: 'stub-123' }), ...overrides.providerService };
  const campaignQueue = { add: jest.fn().mockResolvedValue({}) };

  const module = await Test.createTestingModule({
    providers: [
      NotificationSendService,
      { provide: getRepositoryToken(NotificationTemplate), useValue: templateRepo },
      { provide: getRepositoryToken(NotificationSend), useValue: sendRepo },
      { provide: getRepositoryToken(NotificationChannel), useValue: channelRepo },
      { provide: getRepositoryToken(Customer), useValue: customerRepo },
      { provide: getRepositoryToken(AuditLog), useValue: auditLogRepo },
      { provide: JobService, useValue: jobService },
      { provide: NotificationProviderService, useValue: providerService },
      { provide: getQueueToken(NOTIFICATION_CAMPAIGN_QUEUE), useValue: campaignQueue },
    ],
  }).compile();

  return {
    service: module.get(NotificationSendService),
    templateRepo, sendRepo, channelRepo, customerRepo, auditLogRepo,
    jobService, providerService, campaignQueue,
  };
}

describe('NotificationSendService', () => {

  // ── COM-041/042/043 — Template CRUD ─────────────────────────────────────────
  describe('createTemplate [COM-041]', () => {
    it('creates a template scoped to the business', async () => {
      const { service, templateRepo } = await buildService();

      await service.createTemplate(BIZ_ID, {
        channel: 'sms',
        name: 'Promo',
        body: 'Hello {{ customer_first_name }}',
        is_transactional: false,
      });

      expect(templateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ business_id: BIZ_ID, channel: 'sms', is_transactional: false }),
      );
      expect(templateRepo.save).toHaveBeenCalled();
    });
  });

  describe('updateTemplate [COM-042]', () => {
    it('updates allowed fields', async () => {
      const existing = makeTemplate();
      const { service, templateRepo } = await buildService({
        templateRepo: {
          findOne: jest.fn().mockResolvedValue(existing),
          save: jest.fn((e: any) => Promise.resolve(e)),
        },
      });

      const result = await service.updateTemplate(TMPL_ID, BIZ_ID, { name: 'Updated', is_active: false });

      expect(result.name).toBe('Updated');
      expect(result.is_active).toBe(false);
      expect(templateRepo.save).toHaveBeenCalled();
    });

    it('returns 404 for wrong business', async () => {
      const { service } = await buildService({
        templateRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });

      await expect(service.updateTemplate(TMPL_ID, 'other-biz', {}))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTemplate [COM-043]', () => {
    it('deletes template when unused', async () => {
      const { service, templateRepo } = await buildService({
        templateRepo: {
          findOne: jest.fn().mockResolvedValue(makeTemplate()),
          remove: jest.fn().mockResolvedValue({}),
        },
        sendRepo: { count: jest.fn().mockResolvedValue(0) },
      });

      const result = await service.deleteTemplate(TMPL_ID, BIZ_ID);

      expect(templateRepo.remove).toHaveBeenCalled();
      expect(result.deleted).toBe(true);
    });

    it('returns 422 when template has been used in sends', async () => {
      const { service } = await buildService({
        templateRepo: { findOne: jest.fn().mockResolvedValue(makeTemplate()) },
        sendRepo: { count: jest.fn().mockResolvedValue(3) },
      });

      await expect(service.deleteTemplate(TMPL_ID, BIZ_ID))
        .rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ── COM-044 — Template preview ───────────────────────────────────────────────
  describe('previewTemplate [COM-044]', () => {
    it('substitutes real customer data when customer_id provided', async () => {
      const { service } = await buildService({
        templateRepo: { findOne: jest.fn().mockResolvedValue(makeTemplate()) },
        customerRepo: { findOne: jest.fn().mockResolvedValue(makeCustomer()) },
      });

      const result = await service.previewTemplate(TMPL_ID, BIZ_ID, { customer_id: CUST_ID });

      expect(result.body).toBe('Hello Ali, you have 500 points.');
    });

    it('substitutes sample data when no customer_id provided', async () => {
      const { service } = await buildService({
        templateRepo: { findOne: jest.fn().mockResolvedValue(makeTemplate()) },
        customerRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });

      const result = await service.previewTemplate(TMPL_ID, BIZ_ID, {});

      expect(result.body).toBe('Hello John, you have 250 points.');
    });

    it('returns 404 for unknown template', async () => {
      const { service } = await buildService({
        templateRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });

      await expect(service.previewTemplate('nonexistent', BIZ_ID, {}))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── COM-050 — Single send ────────────────────────────────────────────────────
  describe('sendSingle [COM-050]', () => {
    it('happy path — sends SMS and creates notification_send row', async () => {
      const { service, sendRepo, providerService } = await buildService();

      await service.sendSingle(BIZ_ID, {
        channel: 'sms',
        template_id: TMPL_ID,
        to_customer_id: CUST_ID,
      });

      expect(providerService.send).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'sms', to: '+212600000001' }),
      );
      expect(sendRepo.save).toHaveBeenCalled();
    });

    it('generates opt_out_token for marketing template', async () => {
      const { service, sendRepo } = await buildService({
        templateRepo: { findOne: jest.fn().mockResolvedValue(makeTemplate({ is_transactional: false })) },
      });

      await service.sendSingle(BIZ_ID, {
        channel: 'sms',
        template_id: TMPL_ID,
        to_customer_id: CUST_ID,
      });

      const savedRow = sendRepo.save.mock.calls[0][0];
      expect(savedRow.opt_out_token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('does NOT generate opt_out_token for transactional template', async () => {
      const { service, sendRepo } = await buildService({
        templateRepo: { findOne: jest.fn().mockResolvedValue(makeTemplate({ is_transactional: true })) },
      });

      await service.sendSingle(BIZ_ID, {
        channel: 'sms',
        template_id: TMPL_ID,
        to_customer_id: CUST_ID,
      });

      const savedRow = sendRepo.save.mock.calls[0][0];
      expect(savedRow.opt_out_token).toBeNull();
    });

    it('returns 422 when customer has not consented to marketing', async () => {
      const { service } = await buildService({
        customerRepo: { findOne: jest.fn().mockResolvedValue(makeCustomer({ consent_marketing: false })) },
        templateRepo: { findOne: jest.fn().mockResolvedValue(makeTemplate({ is_transactional: false })) },
      });

      await expect(
        service.sendSingle(BIZ_ID, { channel: 'sms', template_id: TMPL_ID, to_customer_id: CUST_ID }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('returns 422 when SMS balance is zero', async () => {
      const { service } = await buildService({
        channelRepo: { findOne: jest.fn().mockResolvedValue(makeChannel({ balance_cached: 0 })) },
        templateRepo: { findOne: jest.fn().mockResolvedValue(makeTemplate({ is_transactional: true })) },
      });

      await expect(
        service.sendSingle(BIZ_ID, { channel: 'sms', template_id: TMPL_ID, to_customer_id: CUST_ID }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('returns 422 when channel is not configured', async () => {
      const { service } = await buildService({
        channelRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });

      await expect(
        service.sendSingle(BIZ_ID, { channel: 'sms', to_customer_id: CUST_ID }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('marks send as failed when provider throws', async () => {
      const { service, sendRepo } = await buildService({
        providerService: { send: jest.fn().mockRejectedValue(new Error('provider down')) },
        templateRepo: { findOne: jest.fn().mockResolvedValue(makeTemplate({ is_transactional: true })) },
      });

      const result = await service.sendSingle(BIZ_ID, {
        channel: 'sms',
        template_id: TMPL_ID,
        to_customer_id: CUST_ID,
      });

      expect(result.status).toBe('failed');
      expect(sendRepo.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ status: 'failed' }),
      );
    });
  });

  // ── COM-052 — Send history ───────────────────────────────────────────────────
  describe('getSendHistory [COM-052]', () => {
    it('returns paginated history scoped to business', async () => {
      const rows = [makeNotificationSend()];
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([rows, 1]),
      };
      const { service } = await buildService({
        sendRepo: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
      });

      const result = await service.getSendHistory(BIZ_ID, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(qb.where).toHaveBeenCalledWith('s.business_id = :businessId', { businessId: BIZ_ID });
    });
  });

  // ── COM-053 — Webhook ────────────────────────────────────────────────────────
  describe('handleWebhook [COM-053]', () => {
    it('updates status to delivered and sets delivered_at', async () => {
      const send = makeNotificationSend({ status: 'sent', delivered_at: null });
      const { service, sendRepo } = await buildService({
        sendRepo: {
          findOne: jest.fn().mockResolvedValue(send),
          update: jest.fn().mockResolvedValue({}),
        },
      });

      const result = await service.handleWebhook('infobip', {
        provider_message_id: 'stub-abc',
        status: 'delivered',
        timestamp: '2026-05-08T10:00:00Z',
      });

      expect(result.matched).toBe(true);
      expect(sendRepo.update).toHaveBeenCalledWith(
        send.id,
        expect.objectContaining({ status: 'delivered', delivered_at: expect.any(Date) }),
      );
    });

    it('returns matched=false when provider_message_id not found', async () => {
      const { service } = await buildService({
        sendRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });

      const result = await service.handleWebhook('infobip', {
        provider_message_id: 'unknown',
        status: 'delivered',
      });

      expect(result.matched).toBe(false);
    });
  });

  // ── COM-060 — Opt-out ────────────────────────────────────────────────────────
  describe('optOut [COM-060]', () => {
    it('sets consent_marketing = false and writes audit log', async () => {
      const send = makeNotificationSend({ opt_out_token: 'valid-token-abc' });
      const customer = makeCustomer({ consent_marketing: true });
      const { service, customerRepo, auditLogRepo } = await buildService({
        sendRepo: { findOne: jest.fn().mockResolvedValue(send) },
        customerRepo: {
          findOne: jest.fn().mockResolvedValue(customer),
          save: jest.fn().mockResolvedValue({ ...customer, consent_marketing: false }),
        },
      });

      const result = await service.optOut('valid-token-abc');

      expect(customerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ consent_marketing: false }),
      );
      expect(auditLogRepo.save).toHaveBeenCalled();
      const auditRow = auditLogRepo.create.mock.calls[0][0];
      expect(auditRow.action).toBe('opt_out');
      expect(auditRow.entity_type).toBe('customer');
      expect(result.opted_out).toBe(true);
    });

    it('is idempotent — does not double-save if already opted out', async () => {
      const send = makeNotificationSend({ opt_out_token: 'tok' });
      const customer = makeCustomer({ consent_marketing: false });
      const { service, customerRepo } = await buildService({
        sendRepo: { findOne: jest.fn().mockResolvedValue(send) },
        customerRepo: {
          findOne: jest.fn().mockResolvedValue(customer),
          save: jest.fn(),
        },
        auditLogRepo: { create: jest.fn((d: any) => d), save: jest.fn().mockResolvedValue({}) },
      });

      await service.optOut('tok');

      expect(customerRepo.save).not.toHaveBeenCalled();
    });

    it('returns 404 for invalid opt-out token', async () => {
      const { service } = await buildService({
        sendRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });

      await expect(service.optOut('bad-token')).rejects.toThrow(NotFoundException);
    });
  });

  // ── Cross-tenant ─────────────────────────────────────────────────────────────
  describe('cross-tenant isolation', () => {
    it('deleteTemplate returns 404 for wrong business', async () => {
      const { service } = await buildService({
        templateRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });

      await expect(service.deleteTemplate(TMPL_ID, 'other-biz'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
