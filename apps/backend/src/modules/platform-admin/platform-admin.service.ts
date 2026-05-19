import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TradeCategory } from '../../common/entities/trade-category.entity';
import { Courier } from '../../common/entities/courier.entity';
import { BusinessCourierLink } from '../../common/entities/business-courier-link.entity';
import { BusinessCustomAuthority } from '../../common/entities/business-custom-authority.entity';
import { VersionLogMenu } from '../../common/entities/version-log-menu.entity';
import { VersionLogEntry } from '../../common/entities/version-log-entry.entity';
import { SystemParameter } from '../../common/entities/system-parameter.entity';
import { MoroccoRegion } from '../../common/entities/morocco-region.entity';
import { Business } from '../../common/entities/business.entity';
import {
  CreateTradeCategoryDto, UpdateTradeCategoryDto,
  CreateCourierDto, UpdateCourierDto, LinkCourierDto,
  SetCustomAuthorityDto,
  CreateVersionLogEntryDto, UpdateVersionLogEntryDto, ListVersionLogEntriesQueryDto,
  UpdateSystemParameterDto, ListSystemParametersQueryDto,
  UpdateSettlementCutoffDto,
  ValidateAddressDto,
} from './dto/platform-admin.dto';

@Injectable()
export class PlatformAdminService {
  private permissionsCache = new Map<string, { data: Record<string, boolean>; expiresAt: number }>();

  constructor(
    @InjectRepository(TradeCategory) private tradeCatRepo: Repository<TradeCategory>,
    @InjectRepository(Courier) private courierRepo: Repository<Courier>,
    @InjectRepository(BusinessCourierLink) private courierLinkRepo: Repository<BusinessCourierLink>,
    @InjectRepository(BusinessCustomAuthority) private customAuthRepo: Repository<BusinessCustomAuthority>,
    @InjectRepository(VersionLogMenu) private versionMenuRepo: Repository<VersionLogMenu>,
    @InjectRepository(VersionLogEntry) private versionEntryRepo: Repository<VersionLogEntry>,
    @InjectRepository(SystemParameter) private sysParamRepo: Repository<SystemParameter>,
    @InjectRepository(MoroccoRegion) private regionRepo: Repository<MoroccoRegion>,
    @InjectRepository(Business) private businessRepo: Repository<Business>,
  ) {}

  // ── Trade Categories ───────────────────────────────────────────────────────

  listTradeCategoryTree() {
    return this.tradeCatRepo.find({
      where: { parent_id: null as any, is_active: true },
      relations: ['children', 'children.children'],
      order: { sort_order: 'ASC' },
    });
  }

  createTradeCategory(dto: CreateTradeCategoryDto) {
    const cat = this.tradeCatRepo.create(dto);
    return this.tradeCatRepo.save(cat);
  }

  async updateTradeCategory(id: string, dto: UpdateTradeCategoryDto) {
    const cat = await this.tradeCatRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException({ error: 'ADM_TRADE_CATEGORY_NOT_FOUND' });
    Object.assign(cat, dto);
    return this.tradeCatRepo.save(cat);
  }

  async deleteTradeCategory(id: string) {
    const cat = await this.tradeCatRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException({ error: 'ADM_TRADE_CATEGORY_NOT_FOUND' });
    await this.tradeCatRepo.delete(id);
    return { deleted: true };
  }

  async getTradeCategoryOptions() {
    const roots = await this.tradeCatRepo.find({
      where: { parent_id: null as any, is_active: true },
      relations: ['children', 'children.children'],
      order: { sort_order: 'ASC' },
    });
    const flat: { id: string; code: string; full_path: string }[] = [];
    const flatten = (nodes: TradeCategory[], prefix: string) => {
      for (const node of nodes) {
        const path = prefix ? `${prefix} > ${node.name}` : node.name;
        flat.push({ id: node.id, code: node.code, full_path: path });
        if (node.children?.length) flatten(node.children, path);
      }
    };
    flatten(roots, '');
    return flat;
  }

  // ── Couriers ───────────────────────────────────────────────────────────────

  listCouriers() {
    return this.courierRepo.find({ order: { name: 'ASC' } });
  }

  createCourier(dto: CreateCourierDto) {
    const c = this.courierRepo.create(dto);
    return this.courierRepo.save(c);
  }

  async updateCourier(id: string, dto: UpdateCourierDto) {
    const c = await this.courierRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException({ error: 'ADM_COURIER_NOT_FOUND' });
    Object.assign(c, dto);
    return this.courierRepo.save(c);
  }

  async deleteCourier(id: string) {
    const c = await this.courierRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException({ error: 'ADM_COURIER_NOT_FOUND' });
    await this.courierRepo.delete(id);
    return { deleted: true };
  }

  listBusinessCouriers(businessId: string) {
    return this.courierLinkRepo.find({
      where: { business_id: businessId },
      relations: ['courier'],
    });
  }

  async linkCourierToBusiness(businessId: string, dto: LinkCourierDto) {
    const courier = await this.courierRepo.findOne({ where: { id: dto.courier_id } });
    if (!courier) throw new NotFoundException({ error: 'ADM_COURIER_NOT_FOUND' });
    const link = this.courierLinkRepo.create({
      business_id: businessId,
      courier_id: dto.courier_id,
      account_credentials_json: dto.credentials ?? null,
      is_default: dto.is_default ?? false,
    });
    return this.courierLinkRepo.save(link);
  }

  async unlinkCourierFromBusiness(businessId: string, courierId: string) {
    const link = await this.courierLinkRepo.findOne({
      where: { business_id: businessId, courier_id: courierId },
    });
    if (!link) throw new NotFoundException({ error: 'ADM_COURIER_LINK_NOT_FOUND' });
    await this.courierLinkRepo.delete({ business_id: businessId, courier_id: courierId });
    return { deleted: true };
  }

  // ── Custom Authority ───────────────────────────────────────────────────────

  async getBusinessCustomAuthority(businessId: string) {
    const record = await this.customAuthRepo.findOne({ where: { business_id: businessId } });
    if (!record) {
      return { business_id: businessId, feature_overrides_json: {}, permission_overrides_json: {} };
    }
    return record;
  }

  async setBusinessCustomAuthority(businessId: string, superAdminId: string, dto: SetCustomAuthorityDto) {
    let record = await this.customAuthRepo.findOne({ where: { business_id: businessId } });
    if (!record) {
      record = this.customAuthRepo.create({ business_id: businessId });
    }
    if (dto.feature_overrides !== undefined) record.feature_overrides_json = dto.feature_overrides;
    if (dto.permission_overrides !== undefined) record.permission_overrides_json = dto.permission_overrides;
    if (dto.notes !== undefined) record.notes = dto.notes;
    record.set_by_super_admin_id = superAdminId;
    const saved = await this.customAuthRepo.save(record);
    this.permissionsCache.delete(businessId);
    return saved;
  }

  async resolveEffectiveFeatures(
    businessId: string,
    baseFeatures: Array<{ feature_key: string; is_enabled: boolean }>,
  ): Promise<Record<string, boolean>> {
    const cached = this.permissionsCache.get(businessId);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const base: Record<string, boolean> = {};
    for (const f of baseFeatures) base[f.feature_key] = f.is_enabled;

    const override = await this.customAuthRepo.findOne({ where: { business_id: businessId } });
    if (override?.feature_overrides_json) {
      Object.assign(base, override.feature_overrides_json);
    }

    this.permissionsCache.set(businessId, { data: base, expiresAt: Date.now() + 5 * 60 * 1000 });
    return base;
  }

  // ── Version Log ────────────────────────────────────────────────────────────

  listVersionLogMenus() {
    return this.versionMenuRepo.find({ order: { sort_order: 'ASC' } });
  }

  createVersionLogEntry(dto: CreateVersionLogEntryDto) {
    const entry = this.versionEntryRepo.create({
      ...dto,
      published_at: dto.published_at ? new Date(dto.published_at) : new Date(),
      expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
    });
    return this.versionEntryRepo.save(entry);
  }

  async updateVersionLogEntry(id: string, dto: UpdateVersionLogEntryDto) {
    const entry = await this.versionEntryRepo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException({ error: 'ADM_VERSION_ENTRY_NOT_FOUND' });
    if (dto.version !== undefined) entry.version = dto.version;
    if (dto.description !== undefined) entry.description = dto.description;
    if (dto.expires_at !== undefined) entry.expires_at = dto.expires_at ? new Date(dto.expires_at) : null;
    return this.versionEntryRepo.save(entry);
  }

  async deleteVersionLogEntry(id: string) {
    const entry = await this.versionEntryRepo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException({ error: 'ADM_VERSION_ENTRY_NOT_FOUND' });
    await this.versionEntryRepo.delete(id);
    return { deleted: true };
  }

  async listVersionLogEntries(query: ListVersionLogEntriesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.versionEntryRepo.createQueryBuilder('e')
      .where('(e.expires_at IS NULL OR e.expires_at > :now)', { now: new Date() })
      .orderBy('e.published_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.menu_id) qb.andWhere('e.menu_id = :menuId', { menuId: query.menu_id });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  // ── System Parameters ──────────────────────────────────────────────────────

  async listSystemParameters(query: ListSystemParametersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const where: any = {};
    if (query.param_type) where.param_type = query.param_type;
    const [data, total] = await this.sysParamRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { param_type: 'ASC', key: 'ASC' },
    });
    return { data, total, page, limit };
  }

  async updateSystemParameter(id: string, dto: UpdateSystemParameterDto) {
    const param = await this.sysParamRepo.findOne({ where: { id } });
    if (!param) throw new NotFoundException({ error: 'ADM_SYSTEM_PARAM_NOT_FOUND' });
    param.value = dto.value;
    return this.sysParamRepo.save(param);
  }

  // ── Settlement Cutoff ──────────────────────────────────────────────────────

  async getSettlementCutoff(businessId: string) {
    const biz = await this.businessRepo.findOne({ where: { id: businessId } });
    if (!biz) throw new NotFoundException({ error: 'BUSINESS_NOT_FOUND' });
    return { cutoff_time: biz.daily_settlement_cutoff_time ?? '02:00' };
  }

  async updateSettlementCutoff(businessId: string, dto: UpdateSettlementCutoffDto) {
    const biz = await this.businessRepo.findOne({ where: { id: businessId } });
    if (!biz) throw new NotFoundException({ error: 'BUSINESS_NOT_FOUND' });
    biz.daily_settlement_cutoff_time = dto.cutoff_time;
    await this.businessRepo.save(biz);
    return { cutoff_time: dto.cutoff_time };
  }

  // ── Morocco Address ────────────────────────────────────────────────────────

  getMoroccoRegionsTree() {
    return this.regionRepo.find({
      where: { parent_id: null as any },
      relations: ['children', 'children.children'],
      order: { sort_order: 'ASC' },
    });
  }

  async validateAddress(dto: ValidateAddressDto) {
    const parts: string[] = [];

    if (dto.region_code) {
      const region = await this.regionRepo.findOne({ where: { code: dto.region_code, level: 'region' } });
      if (!region) return { valid: false, full_path: null };
      parts.push(region.name);

      if (dto.prefecture_code) {
        const prefecture = await this.regionRepo.findOne({
          where: { code: dto.prefecture_code, level: 'prefecture', parent_id: region.id },
        });
        if (!prefecture) return { valid: false, full_path: null };
        parts.push(prefecture.name);

        if (dto.commune_code) {
          const commune = await this.regionRepo.findOne({
            where: { code: dto.commune_code, level: 'commune', parent_id: prefecture.id },
          });
          if (!commune) return { valid: false, full_path: null };
          parts.push(commune.name);
        }
      }
    }

    return { valid: true, full_path: parts.join(' / ') };
  }
}
