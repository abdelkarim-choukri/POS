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
import { UserRole, SubscriptionStatus } from '../../common/enums';
import { PaginationDto, PaginatedResult } from '../../common/dto';
import {
  CreateBusinessDto, UpdateBusinessDto, UpdateBusinessStatusDto,
  CreateTerminalDto, AssignTerminalDto,
  CreateBusinessTypeDto, UpdateFeaturesDto,
  CreateSubscriptionDto, UpdateSubscriptionDto,
} from './dto';

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

  async createBusiness(dto: CreateBusinessDto) {
    // Create business
    const business = this.businessRepo.create({
      business_type_id: dto.business_type_id,
      name: dto.name,
      legal_name: dto.legal_name,
      email: dto.email,
      phone: dto.phone,
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
      can_void: true,
      can_refund: true,
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
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async updateBusiness(id: string, dto: UpdateBusinessDto) {
    const business = await this.getBusiness(id);
    Object.assign(business, dto);
    return this.businessRepo.save(business);
  }

  async updateBusinessStatus(id: string, dto: UpdateBusinessStatusDto) {
    const business = await this.getBusiness(id);
    business.is_active = dto.is_active;
    return this.businessRepo.save(business);
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
    if (!businessType) throw new NotFoundException('Business type not found');

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
    if (exists) throw new ConflictException('Terminal code already exists');

    // Create unassigned terminal (needs a temporary location — assign later)
    const terminal = this.terminalRepo.create({
      terminal_code: dto.terminal_code,
      device_name: dto.device_name,
    });
    return this.terminalRepo.save(terminal);
  }

  async assignTerminal(terminalId: string, dto: AssignTerminalDto) {
    const terminal = await this.terminalRepo.findOne({ where: { id: terminalId } });
    if (!terminal) throw new NotFoundException('Terminal not found');

    const location = await this.locationRepo.findOne({ where: { id: dto.location_id } });
    if (!location) throw new NotFoundException('Location not found');

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

  async createSubscription(dto: CreateSubscriptionDto) {
    const sub = this.subscriptionRepo.create({ ...dto, status: SubscriptionStatus.ACTIVE });
    return this.subscriptionRepo.save(sub);
  }

  async updateSubscription(id: string, dto: UpdateSubscriptionDto) {
    const sub = await this.subscriptionRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException('Subscription not found');
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
}
