import {
  Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomBytes } from 'crypto';
import { NotificationTemplate } from '../../common/entities/notification-template.entity';
import { NotificationSend } from '../../common/entities/notification-send.entity';
import { NotificationChannel } from '../../common/entities/notification-channel.entity';
import { Customer } from '../../common/entities/customer.entity';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { JobService } from '../jobs/job.service';
import { NotificationProviderService } from './notification-provider.service';
import {
  CreateTemplateDto, UpdateTemplateDto, PreviewTemplateDto,
  SendSingleDto, SendToSegmentDto, SendHistoryQueryDto,
} from './dto/notifications.dto';

export const NOTIFICATION_CAMPAIGN_QUEUE = 'notification-campaign';

@Injectable()
export class NotificationSendService {
  constructor(
    @InjectRepository(NotificationTemplate)
    private templateRepo: Repository<NotificationTemplate>,
    @InjectRepository(NotificationSend)
    private sendRepo: Repository<NotificationSend>,
    @InjectRepository(NotificationChannel)
    private channelRepo: Repository<NotificationChannel>,
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    @InjectRepository(AuditLog)
    private auditLogRepo: Repository<AuditLog>,
    private readonly jobService: JobService,
    private readonly providerService: NotificationProviderService,
    @InjectQueue(NOTIFICATION_CAMPAIGN_QUEUE) private campaignQueue: Queue,
  ) {}

  // ── COM-040: List templates ────────────────────────────────────────────────

  listTemplates(businessId: string) {
    return this.templateRepo.find({
      where: { business_id: businessId },
      order: { created_at: 'DESC' },
    });
  }

  // ── COM-041: Create template ───────────────────────────────────────────────

  createTemplate(businessId: string, dto: CreateTemplateDto) {
    const t = this.templateRepo.create({
      business_id: businessId,
      channel: dto.channel,
      name: dto.name,
      subject: dto.subject ?? null,
      body: dto.body,
      whatsapp_template_id: dto.whatsapp_template_id ?? null,
      is_transactional: dto.is_transactional ?? false,
      is_active: dto.is_active ?? true,
    });
    return this.templateRepo.save(t);
  }

  // ── COM-042: Update template ───────────────────────────────────────────────

  async updateTemplate(id: string, businessId: string, dto: UpdateTemplateDto) {
    const t = await this.templateRepo.findOne({ where: { id, business_id: businessId } });
    if (!t) throw new NotFoundException({ error: 'COM_TEMPLATE_NOT_FOUND', message: 'Template not found' });

    if (dto.name !== undefined) t.name = dto.name;
    if (dto.subject !== undefined) t.subject = dto.subject ?? null;
    if (dto.body !== undefined) t.body = dto.body;
    if (dto.whatsapp_template_id !== undefined) t.whatsapp_template_id = dto.whatsapp_template_id ?? null;
    if (dto.is_transactional !== undefined) t.is_transactional = dto.is_transactional;
    if (dto.is_active !== undefined) t.is_active = dto.is_active;

    return this.templateRepo.save(t);
  }

  // ── COM-043: Delete template ───────────────────────────────────────────────

  async deleteTemplate(id: string, businessId: string) {
    const t = await this.templateRepo.findOne({ where: { id, business_id: businessId } });
    if (!t) throw new NotFoundException({ error: 'COM_TEMPLATE_NOT_FOUND', message: 'Template not found' });

    const usageCount = await this.sendRepo.count({ where: { template_id: id } });
    if (usageCount > 0) {
      throw new UnprocessableEntityException({
        error: 'COM_TEMPLATE_HAS_SENDS',
        message: 'Template has been used in sends and cannot be deleted',
      });
    }

    await this.templateRepo.remove(t);
    return { deleted: true };
  }

  // ── COM-044: Template preview ──────────────────────────────────────────────

  async previewTemplate(id: string, businessId: string, dto: PreviewTemplateDto) {
    const t = await this.templateRepo.findOne({ where: { id, business_id: businessId } });
    if (!t) throw new NotFoundException({ error: 'COM_TEMPLATE_NOT_FOUND', message: 'Template not found' });

    let customer: Customer | null = null;
    if (dto.customer_id) {
      customer = await this.customerRepo.findOne({
        where: { id: dto.customer_id, business_id: businessId },
      });
    }

    return {
      subject: t.subject ? this.renderTemplate(t.subject, customer) : null,
      body: this.renderTemplate(t.body, customer),
      channel: t.channel,
      is_transactional: t.is_transactional,
    };
  }

  // ── COM-050: Single send ───────────────────────────────────────────────────

  async sendSingle(businessId: string, dto: SendSingleDto) {
    const channel = await this.channelRepo.findOne({
      where: { business_id: businessId, channel: dto.channel },
    });
    if (!channel || !channel.is_active) {
      throw new UnprocessableEntityException({
        error: 'COM_NO_CHANNEL_CREDENTIALS',
        message: `Channel '${dto.channel}' is not configured or inactive`,
      });
    }

    const customer = await this.customerRepo.findOne({
      where: { id: dto.to_customer_id, business_id: businessId },
    });
    if (!customer) throw new NotFoundException({ error: 'CUST_NOT_FOUND', message: 'Customer not found' });

    let template: NotificationTemplate | null = null;
    if (dto.template_id) {
      template = await this.templateRepo.findOne({
        where: { id: dto.template_id, business_id: businessId },
      });
      if (!template) throw new NotFoundException({ error: 'COM_TEMPLATE_NOT_FOUND', message: 'Template not found' });
    }

    const isMarketing = template ? !template.is_transactional : false;
    if (isMarketing && !customer.consent_marketing) {
      throw new UnprocessableEntityException({
        error: 'COM_CONSENT_REQUIRED',
        message: 'Customer has not consented to marketing communications',
      });
    }

    if (dto.channel === 'sms' && (channel.balance_cached ?? 0) <= 0) {
      throw new UnprocessableEntityException({ error: 'COM_SMS_INSUFFICIENT_BALANCE', message: 'Insufficient SMS balance' });
    }

    const recipientAddress = dto.to_address ?? this.resolveAddress(customer, dto.channel);
    if (!recipientAddress) {
      throw new UnprocessableEntityException(
        `Customer has no ${dto.channel} address on file`,
      );
    }

    const subject = dto.subject ?? (template ? this.renderTemplate(template.subject ?? '', customer) : null);
    const body = template
      ? this.renderTemplate(template.body, customer)
      : (dto.body ?? '');

    // Generate opt-out token for marketing sends
    const optOutToken = isMarketing ? randomBytes(32).toString('hex') : null;

    const sendRow = await this.sendRepo.save(
      this.sendRepo.create({
        business_id: businessId,
        channel: dto.channel,
        template_id: dto.template_id ?? null,
        recipient_customer_id: customer.id,
        recipient_address: recipientAddress,
        subject: subject || null,
        body_rendered: body,
        status: 'queued',
        linked_promotion_id: dto.linked_promotion_id ?? null,
        linked_coupon_id: dto.linked_coupon_id ?? null,
        opt_out_token: optOutToken,
      }),
    );

    let providerResult: { success: boolean; provider_message_id: string; error?: string };
    try {
      providerResult = await this.providerService.send({
        channel: dto.channel,
        to: recipientAddress,
        subject: subject ?? undefined,
        body,
        fromAddress: channel.default_sender_id ?? undefined,
      });
    } catch (err) {
      await this.sendRepo.update(sendRow.id, {
        status: 'failed',
        error_message: (err as Error).message,
      });
      return { ...sendRow, status: 'failed' };
    }

    await this.sendRepo.update(sendRow.id, {
      status: 'sent',
      provider_message_id: providerResult.provider_message_id,
      sent_at: new Date(),
    });

    return { ...sendRow, status: 'sent', provider_message_id: providerResult.provider_message_id };
  }

  // ── COM-051: Bulk campaign (enqueue) ───────────────────────────────────────

  async sendToSegment(businessId: string, dto: SendToSegmentDto) {
    const template = await this.templateRepo.findOne({
      where: { id: dto.template_id, business_id: businessId },
    });
    if (!template) throw new NotFoundException({ error: 'COM_TEMPLATE_NOT_FOUND', message: 'Template not found' });

    const estimatedRecipients = await this.estimateSegmentSize(businessId, dto);

    const job = await this.jobService.createJob({
      business_id: businessId,
      job_type: 'notification_campaign',
      payload_json: {
        template_id: dto.template_id,
        channel: dto.channel,
        target_audience: dto.target_audience,
        target_grade_ids: dto.target_grade_ids,
        target_label_ids: dto.target_label_ids,
        target_customer_ids: dto.target_customer_ids,
        linked_promotion_id: dto.linked_promotion_id,
        linked_coupon_id: dto.linked_coupon_id,
      },
    });

    const delay = dto.schedule_at
      ? Math.max(0, new Date(dto.schedule_at).getTime() - Date.now())
      : 0;

    await this.campaignQueue.add(
      'send-campaign',
      { job_db_id: job.id, business_id: businessId, ...dto },
      { delay },
    );

    return {
      job_id: job.id,
      estimated_recipients: estimatedRecipients,
      estimated_cost: `${estimatedRecipients} ${dto.channel} credits`,
    };
  }

  // ── COM-052: Send history ──────────────────────────────────────────────────

  async getSendHistory(businessId: string, query: SendHistoryQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);

    const qb = this.sendRepo
      .createQueryBuilder('s')
      .where('s.business_id = :businessId', { businessId })
      .orderBy('s.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.channel) qb.andWhere('s.channel = :channel', { channel: query.channel });
    if (query.status) qb.andWhere('s.status = :status', { status: query.status });
    if (query.from_date) qb.andWhere('s.created_at >= :from', { from: query.from_date });
    if (query.to_date) qb.andWhere('s.created_at <= :to', { to: query.to_date });
    if (query.customer_id) qb.andWhere('s.recipient_customer_id = :cid', { cid: query.customer_id });
    if (query.template_id) qb.andWhere('s.template_id = :tid', { tid: query.template_id });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  // ── COM-053: Provider webhook ──────────────────────────────────────────────
  // TODO: verify provider signature before processing (provider-specific HMAC/token check)

  async handleWebhook(provider: string, body: { provider_message_id: string; status?: string; timestamp?: string }) {
    const send = await this.sendRepo.findOne({
      where: { provider_message_id: body.provider_message_id },
    });
    if (!send) return { ok: true, matched: false };

    const ts = body.timestamp ? new Date(body.timestamp) : new Date();
    const updates: Partial<NotificationSend> = {};

    const incomingStatus = body.status ?? 'delivered';
    if (incomingStatus === 'delivered') {
      updates.status = 'delivered';
      updates.delivered_at = ts;
    } else if (incomingStatus === 'read') {
      updates.status = 'read';
      updates.read_at = ts;
    } else if (incomingStatus === 'failed' || incomingStatus === 'bounced') {
      updates.status = incomingStatus;
    }

    if (Object.keys(updates).length > 0) {
      await this.sendRepo.update(send.id, updates);
    }

    return { ok: true, matched: true };
  }

  // ── COM-060: Customer opt-out ──────────────────────────────────────────────

  async optOut(token: string) {
    const send = await this.sendRepo.findOne({ where: { opt_out_token: token } });
    if (!send || !send.recipient_customer_id) {
      throw new NotFoundException({ error: 'COM_OPT_OUT_TOKEN_INVALID', message: 'Invalid opt-out token' });
    }

    const customer = await this.customerRepo.findOne({
      where: { id: send.recipient_customer_id },
    });
    if (!customer) throw new NotFoundException({ error: 'CUST_NOT_FOUND', message: 'Customer not found' });

    if (customer.consent_marketing) {
      customer.consent_marketing = false;
      await this.customerRepo.save(customer);
    }

    // Law 09-08 compliance audit trail
    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        business_id: customer.business_id,
        user_id: customer.id,
        action: 'opt_out',
        entity_type: 'customer',
        entity_id: customer.id,
        details_json: {
          channel: send.channel,
          notification_send_id: send.id,
          reason: 'customer_opt_out_link',
        },
      }),
    );

    return { opted_out: true };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  renderTemplate(template: string, customer: Customer | null): string {
    const vals: Record<string, string> = customer
      ? {
          customer_first_name: customer.first_name,
          customer_last_name: customer.last_name,
          customer_name: `${customer.first_name} ${customer.last_name}`.trim(),
          points_balance: String(customer.points_balance),
          customer_code: customer.customer_code,
        }
      : {
          customer_first_name: 'John',
          customer_last_name: 'Doe',
          customer_name: 'John Doe',
          points_balance: '250',
          customer_code: 'CUST-001',
        };

    return template.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, key) => vals[key] ?? `{{${key}}}`);
  }

  private resolveAddress(customer: Customer, channel: string): string | null {
    if (channel === 'email') return customer.email ?? null;
    return customer.phone ?? null;
  }

  private async estimateSegmentSize(businessId: string, dto: SendToSegmentDto): Promise<number> {
    const qb = this.customerRepo
      .createQueryBuilder('c')
      .where('c.business_id = :businessId', { businessId })
      .andWhere('c.is_active = true')
      .andWhere('c.consent_marketing = true');

    if (dto.target_audience === 'grade' && dto.target_grade_ids?.length) {
      qb.andWhere('c.grade_id IN (:...gradeIds)', { gradeIds: dto.target_grade_ids });
    } else if (dto.target_audience === 'specific_customers' && dto.target_customer_ids?.length) {
      qb.andWhere('c.id IN (:...customerIds)', { customerIds: dto.target_customer_ids });
    }
    // 'all' and 'label' segments are handled by the processor; estimate all-consenting here

    return qb.getCount();
  }
}
