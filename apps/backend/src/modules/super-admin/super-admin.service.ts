import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Business } from '../../common/entities/business.entity';
import { BusinessType } from '../../common/entities/business-type.entity';
import { BusinessTypeFeature } from '../../common/entities/business-type-feature.entity';
import { Location } from '../../common/entities/location.entity';
import { Terminal } from '../../common/entities/terminal.entity';
import { User } from '../../common/entities/user.entity';
import { Subscription } from '../../common/entities/subscription.entity';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { PlatformAnnouncement } from '../../common/entities/platform-announcement.entity';
import { UserRole, SubscriptionStatus } from '../../common/enums';
import { PaginationDto, PaginatedResult } from '../../common/dto';
import {
  CreateBusinessDto, UpdateBusinessDto, UpdateBusinessStatusDto,
  CreateTerminalDto, AssignTerminalDto,
  CreateBusinessTypeDto, UpdateFeaturesDto,
  CreateSubscriptionDto, UpdateSubscriptionDto,
} from './dto';
import {
  CreatePlatformAnnouncementDto, UpdatePlatformAnnouncementDto, ListPlatformAnnouncementsQueryDto,
} from '../communications/dto/communications.dto';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectRepository(Business) private businessRepo: Repository<Business>,
    @InjectRepository(BusinessType) private businessTypeRepo: Repository<BusinessType>,
    @InjectRepository(BusinessTypeFeature) private featureRepo: Repository<BusinessTypeFeature>,
    @InjectRepository(Location) private locationRepo: Repository<Location>,
    @InjectRepository(Terminal) private terminalRepo: Repository<Terminal>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Subscription) private subscriptionRepo: Repository<Subscription>,
    @InjectRepository(AuditLog) private auditLogRepo: Repository<AuditLog>,
    @InjectRepository(PlatformAnnouncement)
    private platformAnnouncementRepo: Repository<PlatformAnnouncement>,
  ) {}

  // ---- Business Management ----

  async listBusinesses(pagination: PaginationDto) {
    const { page, limit } = pagination;
    const [data, total] = await this.businessRepo.findAndCount({
      relations: ['business_type', 'subscription'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return new PaginatedResult(data, total, page, limit);
  }

  /** Generate a unique business_code (<= 10 chars) from the business name. */
  private async generateBusinessCode(name: string): Promise<string> {
    const base = (name || 'BIZ').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'BIZ';
    for (let i = 0; i < 25; i++) {
      const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
      const code = `${base}${rand}`.slice(0, 10);
      if ((await this.businessRepo.count({ where: { business_code: code } })) === 0) return code;
    }
    // Extremely unlikely fallback: timestamp-based code.
    return `B${Date.now().toString(36).toUpperCase()}`.slice(0, 10);
  }

  /** Write a platform audit-log entry. Never blocks the main operation. */
  private async audit(userId: string, action: string, entityType: string, entityId: string, businessId?: string | null, details?: Record<string, any>) {
    try {
      await this.auditLogRepo.save(this.auditLogRepo.create({
        business_id: businessId ?? undefined,
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details_json: details ?? undefined,
      }));
    } catch {
      /* audit failure must not break the action */
    }
  }

  async createBusiness(dto: CreateBusinessDto, superAdminId?: string) {
    // Create business. business_code is varchar(10) NOT NULL UNIQUE and has no
    // DB default — generate a unique one (derive a short prefix from the name,
    // append random chars, verify uniqueness) so concurrent/repeated creates
    // don't collide on an empty string.
    const business = this.businessRepo.create({
      business_type_id: dto.business_type_id,
      name: dto.name,
      legal_name: dto.legal_name,
      email: dto.email,
      phone: dto.phone,
      business_code: await this.generateBusinessCode(dto.name),
    });
    const saved = await this.businessRepo.save(business);

    // Create owner account
    const passwordHash = await bcrypt.hash(dto.owner_password, 10);
    const owner = this.userRepo.create({
      business_id: saved.id,
      email: dto.owner_email,
      password_hash: passwordHash,
      first_name: dto.owner_first_name,
      last_name: dto.owner_last_name,
      role: UserRole.OWNER,
      dashboard_access: true,
      permissions: { can_void: true, can_refund: true },
    });
    await this.userRepo.save(owner);

    // Create default subscription
    const subscription = this.subscriptionRepo.create({
      business_id: saved.id,
      plan_name: dto.plan_name || 'trial',
      status: SubscriptionStatus.TRIAL,
      start_date: new Date(),
      price_mad: 0,
    });
    await this.subscriptionRepo.save(subscription);

    // Create default location
    const location = this.locationRepo.create({
      business_id: saved.id,
      name: 'Main Location',
    });
    await this.locationRepo.save(location);

    if (superAdminId) {
      await this.audit(superAdminId, 'create', 'business', saved.id, saved.id, { name: dto.name });
    }

    return this.businessRepo.findOne({
      where: { id: saved.id },
      relations: ['business_type', 'subscription', 'locations', 'users'],
    });
  }

  async getBusiness(id: string) {
    const business = await this.businessRepo.findOne({
      where: { id },
      relations: ['business_type', 'subscription', 'locations', 'users'],
    });
    if (!business) throw new NotFoundException({ error: 'SA_BUSINESS_NOT_FOUND', message: 'Business not found' });
    return business;
  }

  async updateBusiness(id: string, dto: UpdateBusinessDto) {
    const business = await this.getBusiness(id);
    Object.assign(business, dto);
    return this.businessRepo.save(business);
  }

  async updateBusinessStatus(id: string, dto: UpdateBusinessStatusDto, superAdminId?: string) {
    const business = await this.getBusiness(id);
    business.is_active = dto.is_active;
    const saved = await this.businessRepo.save(business);
    if (superAdminId) {
      await this.audit(superAdminId, dto.is_active ? 'activate' : 'suspend', 'business', id, id);
    }
    return saved;
  }

  // ---- Business Type Management ----

  async listBusinessTypes() {
    return this.businessTypeRepo.find({ relations: ['features'], order: { name: 'ASC' } });
  }

  async createBusinessType(dto: CreateBusinessTypeDto) {
    const businessType = this.businessTypeRepo.create(dto);
    return this.businessTypeRepo.save(businessType);
  }

  async updateFeatures(businessTypeId: string, dto: UpdateFeaturesDto) {
    const businessType = await this.businessTypeRepo.findOne({ where: { id: businessTypeId } });
    if (!businessType) throw new NotFoundException({ error: 'SA_BUSINESS_TYPE_NOT_FOUND', message: 'Business type not found' });

    for (const feature of dto.features) {
      const existing = await this.featureRepo.findOne({
        where: { business_type_id: businessTypeId, feature_key: feature.feature_key },
      });
      if (existing) {
        existing.is_enabled = feature.is_enabled;
        existing.config_json = feature.config_json || existing.config_json;
        await this.featureRepo.save(existing);
      } else {
        await this.featureRepo.save(this.featureRepo.create({
          business_type_id: businessTypeId,
          feature_key: feature.feature_key,
          is_enabled: feature.is_enabled,
          config_json: feature.config_json,
        }));
      }
    }

    return this.businessTypeRepo.findOne({
      where: { id: businessTypeId },
      relations: ['features'],
    });
  }

  // ---- Terminal Management ----

  async listTerminals() {
    return this.terminalRepo.find({
      relations: ['location', 'location.business'],
      order: { created_at: 'DESC' },
    });
  }

  async createTerminal(dto: CreateTerminalDto) {
    const exists = await this.terminalRepo.findOne({ where: { terminal_code: dto.terminal_code } });
    if (exists) throw new ConflictException({ error: 'SA_TERMINAL_CODE_CONFLICT', message: 'Terminal code already exists' });

    // Create unassigned terminal (needs a temporary location — assign later)
    const terminal = this.terminalRepo.create({
      terminal_code: dto.terminal_code,
      device_name: dto.device_name,
    });
    return this.terminalRepo.save(terminal);
  }

  async assignTerminal(terminalId: string, dto: AssignTerminalDto) {
    const terminal = await this.terminalRepo.findOne({ where: { id: terminalId } });
    if (!terminal) throw new NotFoundException({ error: 'SA_TERMINAL_NOT_FOUND', message: 'Terminal not found' });

    const location = await this.locationRepo.findOne({ where: { id: dto.location_id } });
    if (!location) throw new NotFoundException({ error: 'SA_LOCATION_NOT_FOUND', message: 'Location not found' });

    terminal.location_id = dto.location_id;
    return this.terminalRepo.save(terminal);
  }

  async getTerminalHealth() {
    const terminals = await this.terminalRepo.find({
      relations: ['location', 'location.business'],
    });
    return {
      total: terminals.length,
      online: terminals.filter((t) => t.is_online).length,
      offline: terminals.filter((t) => !t.is_online).length,
      terminals: terminals.map((t) => ({
        id: t.id,
        terminal_code: t.terminal_code,
        is_online: t.is_online,
        last_seen_at: t.last_seen_at,
        business_name: t.location?.business?.name,
        location_name: t.location?.name,
      })),
    };
  }

  // ---- Subscriptions ----

  async listSubscriptions() {
    return this.subscriptionRepo.find({ relations: ['business'], order: { created_at: 'DESC' } });
  }

  async createSubscription(dto: CreateSubscriptionDto, superAdminId?: string) {
    // A business may have at most one subscription (UQ_subscriptions_business).
    // Surface the conflict cleanly instead of leaking a raw 500.
    const existing = await this.subscriptionRepo.count({ where: { business_id: dto.business_id } });
    if (existing > 0) {
      throw new ConflictException({ error: 'SA_SUBSCRIPTION_EXISTS', message: 'This business already has a subscription' });
    }
    const sub = this.subscriptionRepo.create({ ...dto, status: SubscriptionStatus.ACTIVE });
    try {
      const saved = await this.subscriptionRepo.save(sub);
      if (superAdminId) {
        await this.audit(superAdminId, 'create', 'subscription', saved.id, dto.business_id, { plan_name: dto.plan_name });
      }
      return saved;
    } catch (e: any) {
      if (e?.code === '23505' || e?.driverError?.code === '23505') {
        throw new ConflictException({ error: 'SA_SUBSCRIPTION_EXISTS', message: 'This business already has a subscription' });
      }
      throw e;
    }
  }

  async updateSubscription(id: string, dto: UpdateSubscriptionDto) {
    const sub = await this.subscriptionRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException({ error: 'SA_SUBSCRIPTION_NOT_FOUND', message: 'Subscription not found' });
    Object.assign(sub, dto);
    return this.subscriptionRepo.save(sub);
  }

  // ---- Dashboard Stats ----

  async getDashboardStats() {
    const totalBusinesses = await this.businessRepo.count({ where: { is_active: true } });
    const totalTerminals = await this.terminalRepo.count();
    const onlineTerminals = await this.terminalRepo.count({ where: { is_online: true } });

    return { totalBusinesses, totalTerminals, onlineTerminals };
  }

  async getAuditLogs(pagination: PaginationDto) {
    const { page, limit } = pagination;
    const [data, total] = await this.auditLogRepo.findAndCount({
      order: { performed_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return new PaginatedResult(data, total, page, limit);
  }

  // ── COM-001: List platform announcements ────────────────────────────────────

  async listPlatformAnnouncements(query: ListPlatformAnnouncementsQueryDto) {
    const { page = 1, limit = 20, severity } = query;
    const qb = this.platformAnnouncementRepo
      .createQueryBuilder('a')
      .orderBy('a.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (severity) qb.where('a.severity = :severity', { severity });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  // ── COM-002: Create platform announcement ───────────────────────────────────

  async createPlatformAnnouncement(dto: CreatePlatformAnnouncementDto, superAdminId: string) {
    const a = this.platformAnnouncementRepo.create({
      title: dto.title,
      body: dto.body,
      severity: dto.severity ?? 'info',
      target_business_type_ids: dto.target_business_type_ids ?? [],
      target_business_ids: dto.target_business_ids ?? [],
      display_on_homepage: dto.display_on_homepage ?? false,
      display_until: dto.display_until ? new Date(dto.display_until) : null,
      created_by_user_id: superAdminId,
    });
    return this.platformAnnouncementRepo.save(a);
  }

  // ── COM-003: Update platform announcement ───────────────────────────────────

  async updatePlatformAnnouncement(id: string, dto: UpdatePlatformAnnouncementDto) {
    const a = await this.platformAnnouncementRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException({ error: 'SA_ANNOUNCEMENT_NOT_FOUND', message: 'Announcement not found' });

    if (dto.title !== undefined) a.title = dto.title;
    if (dto.body !== undefined) a.body = dto.body;
    if (dto.severity !== undefined) a.severity = dto.severity;
    if (dto.target_business_type_ids !== undefined) a.target_business_type_ids = dto.target_business_type_ids;
    if (dto.target_business_ids !== undefined) a.target_business_ids = dto.target_business_ids;
    if (dto.display_on_homepage !== undefined) a.display_on_homepage = dto.display_on_homepage;
    if (dto.display_until !== undefined) a.display_until = dto.display_until ? new Date(dto.display_until) : null;

    return this.platformAnnouncementRepo.save(a);
  }

  // ── COM-004: Delete platform announcement (hard delete) ─────────────────────

  async deletePlatformAnnouncement(id: string) {
    const a = await this.platformAnnouncementRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException({ error: 'SA_ANNOUNCEMENT_NOT_FOUND', message: 'Announcement not found' });
    await this.platformAnnouncementRepo.remove(a);
    return { deleted: true };
  }
}
