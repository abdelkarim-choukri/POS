import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { randomBytes } from 'crypto';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerLabelAssignment } from '../../common/entities/customer-label-assignment.entity';
import { NotificationTemplate } from '../../common/entities/notification-template.entity';
import { NotificationSend } from '../../common/entities/notification-send.entity';
import { NotificationChannel } from '../../common/entities/notification-channel.entity';
import { JobService } from '../jobs/job.service';
import { NotificationProviderService } from './notification-provider.service';
import { NotificationSendService, NOTIFICATION_CAMPAIGN_QUEUE } from './notification-send.service';

interface CampaignJobData {
  job_db_id: string;
  business_id: string;
  template_id: string;
  channel: string;
  target_audience: string;
  target_grade_ids?: string[];
  target_label_ids?: string[];
  target_customer_ids?: string[];
  linked_promotion_id?: string;
  linked_coupon_id?: string;
}

const PROGRESS_INTERVAL = 25;

@Processor(NOTIFICATION_CAMPAIGN_QUEUE)
export class NotificationCampaignProcessor extends WorkerHost {
  constructor(
    private readonly jobService: JobService,
    private readonly providerService: NotificationProviderService,
    private readonly sendHelper: NotificationSendService,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(CustomerLabelAssignment) private labelAssignRepo: Repository<CustomerLabelAssignment>,
    @InjectRepository(NotificationTemplate) private templateRepo: Repository<NotificationTemplate>,
    @InjectRepository(NotificationSend) private sendRepo: Repository<NotificationSend>,
    @InjectRepository(NotificationChannel) private channelRepo: Repository<NotificationChannel>,
  ) {
    super();
  }

  async process(job: Job<CampaignJobData>): Promise<void> {
    const { job_db_id, business_id, template_id, channel } = job.data;

    await this.jobService.updateJobStatus(job_db_id, 'running');

    // Load template
    const template = await this.templateRepo.findOne({
      where: { id: template_id, business_id },
    });
    if (!template) {
      await this.jobService.updateJobStatus(job_db_id, 'failed', {
        error_message: 'Template not found',
      });
      return;
    }

    // Load channel config (needed to check/decrement SMS balance)
    const channelConfig = await this.channelRepo.findOne({
      where: { business_id, channel },
    });
    if (!channelConfig || !channelConfig.is_active) {
      await this.jobService.updateJobStatus(job_db_id, 'failed', {
        error_message: `Channel '${channel}' is not configured or inactive`,
      });
      return;
    }

    // Resolve all candidates in the target segment
    let allCandidates: Customer[];
    try {
      allCandidates = await this.resolveSegment(job.data, business_id);
    } catch (err) {
      await this.jobService.updateJobStatus(job_db_id, 'failed', {
        error_message: `Segment resolution failed: ${(err as Error).message}`,
      });
      return;
    }

    // Partition by consent_marketing
    const consenting = allCandidates.filter((c) => c.consent_marketing);
    const skippedNoConsent = allCandidates.length - consenting.length;
    const total = consenting.length;

    const isMarketing = !template.is_transactional;
    let sent = 0;
    let failed = 0;
    const errors: { customer_id: string; error: string }[] = [];

    // Running SMS balance counter (avoid DB read on every send)
    let smsBalance: number = channelConfig.balance_cached ?? 0;

    for (const customer of consenting) {
      // Mid-campaign SMS balance guard
      if (channel === 'sms' && smsBalance <= 0) {
        await this.jobService.updateJobStatus(job_db_id, 'failed', {
          result_json: { sent, skipped_no_consent: skippedNoConsent, failed, total, halt_reason: 'insufficient_sms_balance' },
          error_message: 'Campaign halted: SMS balance exhausted',
          completed_at: new Date(),
        });
        return;
      }

      const address = channel === 'email' ? customer.email : customer.phone;
      if (!address) {
        failed++;
        errors.push({ customer_id: customer.id, error: `No ${channel} address on file` });
      } else {
        const subject = template.subject
          ? this.sendHelper.renderTemplate(template.subject, customer)
          : null;
        const body = this.sendHelper.renderTemplate(template.body, customer);
        const optOutToken = isMarketing ? randomBytes(32).toString('hex') : null;

        try {
          const result = await this.providerService.send({
            channel,
            to: address,
            subject: subject ?? undefined,
            body,
            fromAddress: channelConfig.default_sender_id ?? undefined,
          });

          await this.sendRepo.save(
            this.sendRepo.create({
              business_id,
              channel,
              template_id,
              recipient_customer_id: customer.id,
              recipient_address: address,
              subject,
              body_rendered: body,
              status: 'sent',
              provider_message_id: result.provider_message_id,
              sent_at: new Date(),
              linked_promotion_id: job.data.linked_promotion_id ?? null,
              linked_coupon_id: job.data.linked_coupon_id ?? null,
              opt_out_token: optOutToken,
            }),
          );

          sent++;
          if (channel === 'sms') smsBalance--;
        } catch (err) {
          failed++;
          errors.push({ customer_id: customer.id, error: (err as Error).message });
        }
      }

      // Persist progress + SMS balance every PROGRESS_INTERVAL sends
      if ((sent + failed) % PROGRESS_INTERVAL === 0) {
        await this.jobService.updateJobStatus(job_db_id, 'running', {
          result_json: {
            sent, skipped_no_consent: skippedNoConsent, failed, total,
            errors: errors.slice(-10),
          },
        });
        // Persist decremented SMS balance to DB
        if (channel === 'sms') {
          await this.channelRepo.update(
            { business_id, channel: 'sms' },
            { balance_cached: smsBalance },
          );
        }
      }
    }

    // Final SMS balance flush
    if (channel === 'sms' && sent > 0) {
      await this.channelRepo.update(
        { business_id, channel: 'sms' },
        { balance_cached: smsBalance },
      );
    }

    await this.jobService.updateJobStatus(job_db_id, 'completed', {
      result_json: { sent, skipped_no_consent: skippedNoConsent, failed, total, errors },
      completed_at: new Date(),
    });
  }

  private async resolveSegment(data: CampaignJobData, businessId: string): Promise<Customer[]> {
    const base = this.customerRepo
      .createQueryBuilder('c')
      .where('c.business_id = :businessId', { businessId })
      .andWhere('c.is_active = true');

    if (data.target_audience === 'specific_customers' && data.target_customer_ids?.length) {
      base.andWhere('c.id IN (:...ids)', { ids: data.target_customer_ids });
      return base.getMany();
    }

    if (data.target_audience === 'grade' && data.target_grade_ids?.length) {
      base.andWhere('c.grade_id IN (:...gradeIds)', { gradeIds: data.target_grade_ids });
      return base.getMany();
    }

    if (data.target_audience === 'label' && data.target_label_ids?.length) {
      const assignments = await this.labelAssignRepo.find({
        where: { label_id: In(data.target_label_ids) },
        select: ['customer_id'],
      });
      const ids = [...new Set(assignments.map((a) => a.customer_id))];
      if (!ids.length) return [];
      base.andWhere('c.id IN (:...ids)', { ids });
      return base.getMany();
    }

    // 'all'
    return base.getMany();
  }
}
