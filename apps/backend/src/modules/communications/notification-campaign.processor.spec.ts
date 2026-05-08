import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationCampaignProcessor } from './notification-campaign.processor';
import { NotificationSendService } from './notification-send.service';
import { NotificationProviderService } from './notification-provider.service';
import { JobService } from '../jobs/job.service';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerLabelAssignment } from '../../common/entities/customer-label-assignment.entity';
import { NotificationTemplate } from '../../common/entities/notification-template.entity';
import { NotificationSend } from '../../common/entities/notification-send.entity';
import { NotificationChannel } from '../../common/entities/notification-channel.entity';

const BIZ_ID = 'biz-proc-1';
const TMPL_ID = 'tmpl-proc-1';
const JOB_DB_ID = 'job-proc-1';

function makeCustomer(id: string, consent: boolean, phone = '+21260000000' + id): Partial<Customer> {
  return {
    id,
    business_id: BIZ_ID,
    first_name: 'Test',
    last_name: 'User',
    phone,
    email: `${id}@example.com`,
    customer_code: `CUST-${id}`,
    points_balance: 100,
    is_active: true,
    consent_marketing: consent,
  } as Customer;
}

function makeTemplate(overrides: Partial<NotificationTemplate> = {}): NotificationTemplate {
  return {
    id: TMPL_ID,
    business_id: BIZ_ID,
    business: null as any,
    channel: 'sms',
    name: 'Campaign',
    subject: null,
    body: 'Hi {{ customer_first_name }}!',
    whatsapp_template_id: null,
    is_transactional: false,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

function makeChannel(): Partial<NotificationChannel> {
  return {
    business_id: BIZ_ID,
    channel: 'sms',
    is_active: true,
    balance_cached: 500,
    default_sender_id: 'SHOP',
  } as NotificationChannel;
}

function makeJob(overrides: Partial<any> = {}) {
  return {
    data: {
      job_db_id: JOB_DB_ID,
      business_id: BIZ_ID,
      template_id: TMPL_ID,
      channel: 'sms',
      target_audience: 'all',
      ...overrides,
    },
  };
}

async function buildProcessor(overrides: Record<string, any> = {}) {
  const customers = [
    makeCustomer('c1', true),
    makeCustomer('c2', false),
    makeCustomer('c3', true),
  ];

  const customerRepo = {
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(customers),
    }),
    find: jest.fn().mockResolvedValue(customers.filter((c) => c.consent_marketing)),
    ...overrides.customerRepo,
  };
  const labelAssignRepo = {
    find: jest.fn().mockResolvedValue([]),
    ...overrides.labelAssignRepo,
  };
  const templateRepo = {
    findOne: jest.fn().mockResolvedValue(makeTemplate()),
    ...overrides.templateRepo,
  };
  const sendRepo = {
    save: jest.fn((e: any) => Promise.resolve({ id: 'send-x', ...e })),
    create: jest.fn((d: any) => d),
    ...overrides.sendRepo,
  };
  const channelRepo = {
    findOne: jest.fn().mockResolvedValue(makeChannel()),
    update: jest.fn().mockResolvedValue({}),
    ...overrides.channelRepo,
  };
  const jobService = {
    updateJobStatus: jest.fn().mockResolvedValue({}),
    ...overrides.jobService,
  };
  const providerService = {
    send: jest.fn().mockResolvedValue({ success: true, provider_message_id: 'stub-123' }),
    ...overrides.providerService,
  };
  // Minimal sendHelper — only renderTemplate is used by the processor
  const sendHelper = {
    renderTemplate: jest.fn((tmpl: string, customer: any) =>
      tmpl.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_: any, k: string) =>
        k === 'customer_first_name' ? (customer?.first_name ?? 'John') : k,
      ),
    ),
    ...overrides.sendHelper,
  };

  const module = await Test.createTestingModule({
    providers: [
      NotificationCampaignProcessor,
      { provide: JobService, useValue: jobService },
      { provide: NotificationProviderService, useValue: providerService },
      { provide: NotificationSendService, useValue: sendHelper },
      { provide: getRepositoryToken(Customer), useValue: customerRepo },
      { provide: getRepositoryToken(CustomerLabelAssignment), useValue: labelAssignRepo },
      { provide: getRepositoryToken(NotificationTemplate), useValue: templateRepo },
      { provide: getRepositoryToken(NotificationSend), useValue: sendRepo },
      { provide: getRepositoryToken(NotificationChannel), useValue: channelRepo },
    ],
  }).compile();

  return {
    processor: module.get(NotificationCampaignProcessor),
    customerRepo, labelAssignRepo, templateRepo, sendRepo, channelRepo,
    jobService, providerService, sendHelper,
  };
}

describe('NotificationCampaignProcessor', () => {

  describe('happy path — all-consenting customers', () => {
    it('sends to consenting customers and skips non-consenting', async () => {
      const consenting = [makeCustomer('c1', true), makeCustomer('c3', true)];
      const all = [makeCustomer('c1', true), makeCustomer('c2', false), makeCustomer('c3', true)];

      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(all),
      };

      const { processor, jobService, providerService, sendRepo } = await buildProcessor({
        customerRepo: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
      });

      await processor.process(makeJob() as any);

      // Only 2 consenting customers should receive sends
      expect(providerService.send).toHaveBeenCalledTimes(2);
      expect(sendRepo.save).toHaveBeenCalledTimes(2);

      const finalUpdate = jobService.updateJobStatus.mock.calls.find(
        ([, status]: [any, string]) => status === 'completed',
      );
      expect(finalUpdate).toBeDefined();
      const resultJson = finalUpdate[2].result_json;
      expect(resultJson.sent).toBe(2);
      expect(resultJson.skipped_no_consent).toBe(1);
      expect(resultJson.failed).toBe(0);
    });
  });

  describe('specific_customers audience', () => {
    it('only sends to the provided customer IDs', async () => {
      const target = [makeCustomer('c1', true)];
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(target),
      };
      const { processor, providerService } = await buildProcessor({
        customerRepo: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
      });

      await processor.process(makeJob({
        target_audience: 'specific_customers',
        target_customer_ids: ['c1'],
      }) as any);

      expect(providerService.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('per-item error isolation', () => {
    it('continues processing after a single provider failure', async () => {
      const all = [makeCustomer('c1', true), makeCustomer('c2', true)];
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(all),
      };
      let callCount = 0;
      const { processor, jobService } = await buildProcessor({
        customerRepo: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
        providerService: {
          send: jest.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) throw new Error('provider error');
            return Promise.resolve({ success: true, provider_message_id: 'stub-ok' });
          }),
        },
      });

      await processor.process(makeJob() as any);

      const finalUpdate = jobService.updateJobStatus.mock.calls.find(
        ([, status]: [any, string]) => status === 'completed',
      );
      const result = finalUpdate[2].result_json;
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('SMS balance mid-campaign guard', () => {
    it('halts and marks job failed when balance runs out', async () => {
      const all = [makeCustomer('c1', true), makeCustomer('c2', true)];
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(all),
      };
      const { processor, jobService } = await buildProcessor({
        customerRepo: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
        // balance = 1, so second customer will see balance = 0 and halt
        channelRepo: {
          findOne: jest.fn().mockResolvedValue({ ...makeChannel(), balance_cached: 1 }),
          update: jest.fn().mockResolvedValue({}),
        },
      });

      await processor.process(makeJob() as any);

      const failedCall = jobService.updateJobStatus.mock.calls.find(
        ([, status]: [any, string]) => status === 'failed',
      );
      expect(failedCall).toBeDefined();
      expect(failedCall[2].error_message).toContain('SMS balance exhausted');
    });
  });

  describe('job lifecycle', () => {
    it('marks job completed with correct counts on success', async () => {
      const consenting = [makeCustomer('c1', true)];
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(consenting),
      };
      const { processor, jobService } = await buildProcessor({
        customerRepo: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
      });

      await processor.process(makeJob() as any);

      const completedCall = jobService.updateJobStatus.mock.calls.find(
        ([, status]: [any, string]) => status === 'completed',
      );
      expect(completedCall).toBeDefined();
      expect(completedCall[2].result_json).toMatchObject({ sent: 1, skipped_no_consent: 0 });
    });
  });

  describe('cross-tenant isolation', () => {
    it('resolveSegment is scoped to business_id', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      const { processor, customerRepo } = await buildProcessor({
        customerRepo: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
      });

      await processor.process(makeJob() as any);

      expect(qb.where).toHaveBeenCalledWith('c.business_id = :businessId', { businessId: BIZ_ID });
    });
  });
});
