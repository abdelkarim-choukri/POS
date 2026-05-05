import {
  Injectable, NotFoundException, ConflictException,
  UnprocessableEntityException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Promotion } from '../../common/entities/promotion.entity';
import { PromotionRedemption } from '../../common/entities/promotion-redemption.entity';
import { Category } from '../../common/entities/category.entity';
import { Product } from '../../common/entities/product.entity';
import { CustomerGrade } from '../../common/entities/customer-grade.entity';
import { CustomerLabel } from '../../common/entities/customer-label.entity';
import { Customer } from '../../common/entities/customer.entity';
import { Location } from '../../common/entities/location.entity';
import { CreatePromotionDto, UpdatePromotionDto, ListPromotionsQueryDto } from './dto/promotion.dto';

// Fields that become immutable once a promotion has been redeemed at least once
const LOCKED_FIELDS = ['value', 'promotion_type', 'target_category_id', 'target_product_id',
  'target_audience', 'target_grade_ids', 'target_label_ids', 'target_customer_ids',
  'start_date', 'end_date'] as const;

function isCurrentlyRunning(p: Promotion, now: Date): boolean {
  if (p.status !== 'active') return false;
  const today = now.toISOString().slice(0, 10);
  return today >= p.start_date && today <= p.end_date;
}

function generateCode(): string {
  return 'PROM-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

@Injectable()
export class PromotionService {
  constructor(
    @InjectRepository(Promotion) private promoRepo: Repository<Promotion>,
    @InjectRepository(PromotionRedemption) private redemptionRepo: Repository<PromotionRedemption>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(CustomerGrade) private gradeRepo: Repository<CustomerGrade>,
    @InjectRepository(CustomerLabel) private labelRepo: Repository<CustomerLabel>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(Location) private locationRepo: Repository<Location>,
  ) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async findOrFail(id: string, businessId: string): Promise<Promotion> {
    const p = await this.promoRepo.findOne({ where: { id, business_id: businessId } });
    if (!p) throw new NotFoundException();
    return p;
  }

  private async validateForeignIds(
    businessId: string,
    dto: CreatePromotionDto | UpdatePromotionDto,
  ): Promise<void> {
    if (dto.target_category_id) {
      const cat = await this.categoryRepo.findOne({
        where: { id: dto.target_category_id, business_id: businessId },
      });
      if (!cat) throw new BadRequestException(`target_category_id not found in this business`);
    }
    if (dto.target_product_id) {
      const prod = await this.productRepo.findOne({
        where: { id: dto.target_product_id, business_id: businessId },
      });
      if (!prod) throw new BadRequestException(`target_product_id not found in this business`);
    }
    if (dto.target_grade_ids?.length) {
      const grades = await this.gradeRepo.findByIds(dto.target_grade_ids);
      const wrongBiz = grades.filter((g) => g.business_id !== businessId);
      if (wrongBiz.length) throw new BadRequestException(`Some target_grade_ids do not belong to this business`);
    }
    if (dto.target_label_ids?.length) {
      const labels = await this.labelRepo.findByIds(dto.target_label_ids);
      const wrongBiz = labels.filter((l) => l.business_id !== businessId);
      if (wrongBiz.length) throw new BadRequestException(`Some target_label_ids do not belong to this business`);
    }
    if (dto.target_customer_ids?.length) {
      const customers = await this.customerRepo.findByIds(dto.target_customer_ids);
      const wrongBiz = customers.filter((c) => c.business_id !== businessId);
      if (wrongBiz.length) throw new BadRequestException(`Some target_customer_ids do not belong to this business`);
    }
    if (dto.applicable_location_ids?.length) {
      const locs = await this.locationRepo.findByIds(dto.applicable_location_ids);
      const wrongBiz = locs.filter((l) => l.business_id !== businessId);
      if (wrongBiz.length) throw new BadRequestException(`Some applicable_location_ids do not belong to this business`);
    }
  }

  private validatePercentage(dto: CreatePromotionDto | UpdatePromotionDto): void {
    const percentTypes = ['percent_off_order', 'percent_off_category', 'percent_off_product'];
    if (dto.promotion_type && percentTypes.includes(dto.promotion_type)) {
      if (dto.value !== undefined && (dto.value < 0 || dto.value > 100)) {
        throw new BadRequestException('value must be between 0 and 100 for percentage promotion types');
      }
    }
  }

  // ── PROM-001: List promotions ──────────────────────────────────────────────

  async list(businessId: string, query: ListPromotionsQueryDto) {
    const { page = 1, limit = 20, status, promotion_type, active_now, search } = query;
    const now = new Date();

    const qb = this.promoRepo.createQueryBuilder('p')
      .where('p.business_id = :businessId', { businessId })
      .orderBy('p.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) qb.andWhere('p.status = :status', { status });
    if (promotion_type) qb.andWhere('p.promotion_type = :promotion_type', { promotion_type });
    if (search) {
      qb.andWhere('(p.name ILIKE :s OR p.code ILIKE :s)', { s: `%${search}%` });
    }
    if (active_now === true) {
      const today = now.toISOString().slice(0, 10);
      qb.andWhere("p.status = 'active'")
        .andWhere('p.start_date <= :today', { today })
        .andWhere('p.end_date >= :today', { today });
    }

    const [data, total] = await qb.getManyAndCount();
    const items = data.map((p) => ({ ...p, is_currently_running: isCurrentlyRunning(p, now) }));
    return { data: items, total, page, limit };
  }

  // ── PROM-002: Get promotion detail ────────────────────────────────────────

  async getDetail(id: string, businessId: string) {
    const p = await this.findOrFail(id, businessId);
    const now = new Date();

    const stats = await this.redemptionRepo
      .createQueryBuilder('r')
      .select('COUNT(r.id)', 'total_redemptions')
      .addSelect('COALESCE(SUM(r.discount_applied), 0)', 'total_discount_given')
      .addSelect('COUNT(DISTINCT r.customer_id)', 'unique_customers')
      .where('r.promotion_id = :id', { id })
      .getRawOne();

    return {
      ...p,
      is_currently_running: isCurrentlyRunning(p, now),
      stats: {
        total_redemptions: parseInt(stats.total_redemptions ?? '0'),
        total_discount_given: parseFloat(stats.total_discount_given ?? '0'),
        unique_customers: parseInt(stats.unique_customers ?? '0'),
      },
    };
  }

  // ── PROM-003: Create promotion ────────────────────────────────────────────

  async create(businessId: string, dto: CreatePromotionDto, userId: string): Promise<Promotion> {
    if (dto.start_date && dto.end_date && dto.start_date > dto.end_date) {
      throw new BadRequestException('start_date must be <= end_date');
    }
    this.validatePercentage(dto);
    await this.validateForeignIds(businessId, dto);

    const code = dto.code ?? generateCode();
    const existing = await this.promoRepo.findOne({ where: { business_id: businessId, code } });
    if (existing) throw new ConflictException(`Promotion code "${code}" already exists in this business`);

    const promo = this.promoRepo.create({
      ...dto,
      code,
      business_id: businessId,
      status: 'draft',
      current_uses: 0,
      created_by_user_id: userId,
    });
    return this.promoRepo.save(promo);
  }

  // ── PROM-004: Update promotion ────────────────────────────────────────────

  async update(id: string, businessId: string, dto: UpdatePromotionDto): Promise<Promotion> {
    const p = await this.findOrFail(id, businessId);

    if (p.current_uses > 0) {
      const attemptedLocked = LOCKED_FIELDS.filter(
        (f) => dto[f as keyof UpdatePromotionDto] !== undefined,
      );
      if (attemptedLocked.length > 0) {
        throw new UnprocessableEntityException({
          message: 'Cannot update immutable fields once a promotion has been redeemed',
          locked_fields: attemptedLocked,
        });
      }
    }

    if (dto.start_date || dto.end_date) {
      const startDate = dto.start_date ?? p.start_date;
      const endDate = dto.end_date ?? p.end_date;
      if (startDate > endDate) throw new BadRequestException('start_date must be <= end_date');
    }

    this.validatePercentage({ promotion_type: p.promotion_type, ...dto });
    await this.validateForeignIds(businessId, dto);

    Object.assign(p, dto);
    return this.promoRepo.save(p);
  }

  // ── PROM-005: Activate ────────────────────────────────────────────────────

  async activate(id: string, businessId: string): Promise<Promotion> {
    const p = await this.findOrFail(id, businessId);
    if (p.status === 'archived') {
      throw new UnprocessableEntityException('Archived promotions cannot be reactivated');
    }
    p.status = 'active';
    const saved = await this.promoRepo.save(p);

    if (saved.notify_sms || saved.notify_email || saved.notify_whatsapp) {
      console.log(`[PromotionService] notification dispatch stubbed for promotion ${id}`);
    }

    return saved;
  }

  // ── PROM-006: Pause ───────────────────────────────────────────────────────

  async pause(id: string, businessId: string): Promise<Promotion> {
    const p = await this.findOrFail(id, businessId);
    if (p.status === 'archived') {
      throw new UnprocessableEntityException('Archived promotions cannot be paused');
    }
    p.status = 'paused';
    return this.promoRepo.save(p);
  }

  // ── PROM-007: Archive ─────────────────────────────────────────────────────

  async archive(id: string, businessId: string): Promise<Promotion> {
    const p = await this.findOrFail(id, businessId);
    if (p.status === 'archived') {
      throw new UnprocessableEntityException('Promotion is already archived');
    }
    p.status = 'archived';
    return this.promoRepo.save(p);
  }
}
