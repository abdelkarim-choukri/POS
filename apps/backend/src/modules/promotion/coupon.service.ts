import {
  Injectable, NotFoundException, ConflictException,
  UnprocessableEntityException, HttpException, HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CouponType } from '../../common/entities/coupon-type.entity';
import { Coupon } from '../../common/entities/coupon.entity';
import {
  CreateCouponTypeDto, UpdateCouponTypeDto, IssueCouponDto,
  COUPON_TYPE_LOCKED_FIELDS,
} from './dto/coupon.dto';

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomAlphanumeric(length: number): string {
  return Array.from(
    { length },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
  ).join('');
}

@Injectable()
export class CouponService {
  constructor(
    @InjectRepository(CouponType) private couponTypeRepo: Repository<CouponType>,
    @InjectRepository(Coupon) private couponRepo: Repository<Coupon>,
  ) {}

  // [CPN-001] List coupon types
  listCouponTypes(businessId: string) {
    return this.couponTypeRepo.find({
      where: { business_id: businessId },
      order: { created_at: 'DESC' },
    });
  }

  // [CPN-002] Get coupon type detail with issued count
  async getCouponType(id: string, businessId: string) {
    const ct = await this.couponTypeRepo.findOne({ where: { id, business_id: businessId } });
    if (!ct) throw new NotFoundException();
    const issuedCount = await this.couponRepo.count({ where: { coupon_type_id: id } });
    return { ...ct, issued_count: issuedCount };
  }

  // [CPN-003] Create coupon type
  async createCouponType(businessId: string, dto: CreateCouponTypeDto): Promise<CouponType> {
    const code = dto.code ?? ('CPN-' + randomAlphanumeric(6));
    const existing = await this.couponTypeRepo.findOne({ where: { business_id: businessId, code } });
    if (existing) throw new ConflictException(`Coupon type code "${code}" already exists`);

    const ct = this.couponTypeRepo.create({ ...dto, code, business_id: businessId });
    return this.couponTypeRepo.save(ct);
  }

  // [CPN-004] Update coupon type — locked fields guarded when coupons exist
  async updateCouponType(id: string, businessId: string, dto: UpdateCouponTypeDto): Promise<CouponType> {
    const ct = await this.couponTypeRepo.findOne({ where: { id, business_id: businessId } });
    if (!ct) throw new NotFoundException();

    const issuedCount = await this.couponRepo.count({ where: { coupon_type_id: id } });
    if (issuedCount > 0) {
      const attempted = COUPON_TYPE_LOCKED_FIELDS.filter((f) => (dto as any)[f] !== undefined);
      if (attempted.length > 0) {
        throw new UnprocessableEntityException({
          message: 'Cannot update locked fields once coupons have been issued',
          locked_fields: attempted,
        });
      }
    }

    Object.assign(ct, dto);
    return this.couponTypeRepo.save(ct);
  }

  // [CPN-005] Clone coupon type — name gets "(Copy)", is_active = false
  async cloneCouponType(id: string, businessId: string): Promise<CouponType> {
    const original = await this.couponTypeRepo.findOne({ where: { id, business_id: businessId } });
    if (!original) throw new NotFoundException();

    const clone = this.couponTypeRepo.create({
      business_id: original.business_id,
      code: 'CPN-' + randomAlphanumeric(6),
      name: `${original.name} (Copy)`,
      description: original.description,
      discount_type: original.discount_type,
      discount_value: original.discount_value,
      free_item_product_id: original.free_item_product_id,
      free_item_variant_id: original.free_item_variant_id,
      min_order_total_ttc: original.min_order_total_ttc,
      applicable_category_ids: [...(original.applicable_category_ids ?? [])],
      applicable_product_ids: [...(original.applicable_product_ids ?? [])],
      validity_days_from_issue: original.validity_days_from_issue,
      share_case: original.share_case,
      is_active: false,
    });
    return this.couponTypeRepo.save(clone);
  }

  // [CPN-006] Deactivate coupon type
  async deactivateCouponType(id: string, businessId: string): Promise<CouponType> {
    const ct = await this.couponTypeRepo.findOne({ where: { id, business_id: businessId } });
    if (!ct) throw new NotFoundException();
    ct.is_active = false;
    return this.couponTypeRepo.save(ct);
  }

  // [CPN-010] Issue coupon — 12-char alphanumeric code, linked to coupon_type + optional customer
  async issueCoupon(couponTypeId: string, businessId: string, dto: IssueCouponDto): Promise<Coupon> {
    const ct = await this.couponTypeRepo.findOne({
      where: { id: couponTypeId, business_id: businessId, is_active: true },
    });
    if (!ct) throw new NotFoundException('Coupon type not found or inactive');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ct.validity_days_from_issue);

    // Generate unique 12-char code; retry up to 5 times on collision
    let couponCode = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      couponCode = randomAlphanumeric(12);
      const dupe = await this.couponRepo.findOne({ where: { business_id: businessId, coupon_code: couponCode } });
      if (!dupe) break;
      if (attempt === 4) throw new ConflictException('Could not generate unique coupon code');
    }

    const coupon = this.couponRepo.create({
      business_id: businessId,
      coupon_type_id: couponTypeId,
      coupon_code: couponCode,
      customer_id: dto.customer_id,
      issued_at: new Date(),
      expires_at: expiresAt,
      status: 'available',
      issue_source: 'manual',
    });
    return this.couponRepo.save(coupon);
  }

  // [CPN-020] Lookup coupon by code — 404 if not found, 410 if redeemed
  async lookupCoupon(couponCode: string, businessId: string) {
    const coupon = await this.couponRepo.findOne({
      where: { coupon_code: couponCode, business_id: businessId },
      relations: ['coupon_type'],
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    if (coupon.status === 'redeemed') {
      throw new HttpException({ status: 'redeemed', message: 'Coupon already redeemed' }, HttpStatus.GONE);
    }

    const now = new Date();
    const isExpired = now > coupon.expires_at;

    return {
      id: coupon.id,
      coupon_code: coupon.coupon_code,
      status: isExpired ? 'expired' : coupon.status,
      discount_type: (coupon as any).coupon_type?.discount_type,
      discount_value: (coupon as any).coupon_type?.discount_value,
      expires_at: coupon.expires_at,
      customer_id: coupon.customer_id,
    };
  }
}
