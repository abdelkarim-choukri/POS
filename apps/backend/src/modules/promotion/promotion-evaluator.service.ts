import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from '../../common/entities/promotion.entity';
import { PromotionRedemption } from '../../common/entities/promotion-redemption.entity';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerLabelAssignment } from '../../common/entities/customer-label-assignment.entity';

// Moroccan public holidays for 2026 (yyyy-MM-dd).
// Covers fixed and variable (Islamic) holidays based on projected dates.
const MOROCCAN_HOLIDAYS_2026: Set<string> = new Set([
  '2026-01-01', // New Year
  '2026-01-11', // Manifesto of Independence
  '2026-01-29', // Ramadan Eid-ul-Fitr projected
  '2026-01-30', // Eid-ul-Fitr day 2 projected
  '2026-04-05', // Eid-ul-Adha projected
  '2026-04-06', // Eid-ul-Adha day 2 projected
  '2026-04-26', // Islamic New Year projected
  '2026-05-01', // Labour Day
  '2026-06-05', // Mawlid an-Nabi projected
  '2026-07-30', // Throne Day
  '2026-08-14', // Oued Ed-Dahab Day
  '2026-08-20', // Revolution of the King and the People
  '2026-08-21', // Youth Day
  '2026-11-06', // Green March
  '2026-11-18', // Independence Day
]);

export interface CartItem {
  product_id: string;
  category_id?: string;
  quantity: number;
  unit_price_ttc: number;
  line_index: number;
}

export interface ApplicablePromotion {
  promotion_id: string;
  name: string;
  promotion_type: string;
  auto_apply: boolean;
  computed_discount: number;
  affected_line_indexes: number[];
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function scopeLevel(type: string): number {
  if (type === 'percent_off_product' || type === 'fixed_off_product') return 0;
  if (type === 'percent_off_category') return 1;
  return 2; // order-level
}

@Injectable()
export class PromotionEvaluatorService {
  constructor(
    @InjectRepository(Promotion) private promoRepo: Repository<Promotion>,
    @InjectRepository(PromotionRedemption) private redemptionRepo: Repository<PromotionRedemption>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(CustomerLabelAssignment) private claRepo: Repository<CustomerLabelAssignment>,
  ) {}

  async evaluate(
    businessId: string,
    cartItems: CartItem[],
    customerId: string | null,
    locationId: string,
    now: Date,
  ): Promise<ApplicablePromotion[]> {
    const todayStr = toDateString(now);
    const cartTotalTtc = cartItems.reduce(
      (sum, item) => sum + item.unit_price_ttc * item.quantity,
      0,
    );

    // Load customer info once if present
    let customer: Customer | null = null;
    let customerLabelIds: string[] = [];
    if (customerId) {
      customer = await this.customerRepo.findOne({ where: { id: customerId, business_id: businessId } });
      if (customer) {
        const assignments = await this.claRepo.find({ where: { customer_id: customerId } });
        customerLabelIds = assignments.map((a) => a.label_id);
      }
    }

    // Load active promotions for this business
    const promotions = await this.promoRepo
      .createQueryBuilder('p')
      .where('p.business_id = :businessId', { businessId })
      .andWhere("p.status = 'active'")
      .andWhere('p.start_date <= :today', { today: todayStr })
      .andWhere('p.end_date >= :today', { today: todayStr })
      .getMany();

    const applicable: ApplicablePromotion[] = [];

    for (const promo of promotions) {
      // Step 3: valid_date_type / valid_dates day check
      if (!this.matchesValidDate(promo, now)) continue;

      // Step 3.5a: adjust_for_holidays — skip if today is a Moroccan public holiday
      if (promo.adjust_for_holidays && MOROCCAN_HOLIDAYS_2026.has(todayStr)) continue;

      // Step 3.5b: invalid_date_periods blackout check
      if (promo.invalid_date_periods?.length && this.isInBlackout(todayStr, promo.invalid_date_periods)) continue;

      // Step 4: time_periods check
      if (!this.matchesTimePeriod(promo, now)) continue;

      // Step 5: target_audience
      if (!this.matchesAudience(promo, customer, customerLabelIds)) continue;

      // Step 6: location check
      if (
        promo.applicable_location_ids?.length > 0 &&
        !promo.applicable_location_ids.includes(locationId)
      ) continue;

      // Step 7: min_order_total_ttc
      if (cartTotalTtc < Number(promo.min_order_total_ttc)) continue;

      // Step 8: global cap
      if (promo.max_total_uses > 0 && promo.current_uses >= promo.max_total_uses) continue;

      // Steps 9-11: per-customer / per-day caps
      if (!(await this.meetsUsageCaps(promo, customerId, now))) continue;

      // Determine affected items and compute discount
      const affected = this.getAffectedLines(promo, cartItems);
      if (affected.affectedIndexes.length === 0 && this.requiresItemTarget(promo.promotion_type)) continue;

      const computedDiscount = this.computeDiscount(promo, cartItems, affected.affectedIndexes, cartTotalTtc);

      applicable.push({
        promotion_id: promo.id,
        name: promo.name,
        promotion_type: promo.promotion_type,
        auto_apply: true,
        computed_discount: Math.round(computedDiscount * 100) / 100,
        affected_line_indexes: affected.affectedIndexes,
      });
    }

    return this.applyStackingMode(applicable, promotions);
  }

  // ── Date/time filters ──────────────────────────────────────────────────────

  private matchesValidDate(promo: Promotion, now: Date): boolean {
    if (promo.valid_date_type === 'D') return true; // daily = always matches

    if (!promo.valid_dates) return true;
    const allowed = promo.valid_dates.split(',').map((s) => parseInt(s.trim()));

    if (promo.valid_date_type === 'W') {
      // JS getDay(): 0=Sun…6=Sat; spec uses 1=Mon…7=Sun
      const jsDay = now.getDay();
      const specDay = jsDay === 0 ? 7 : jsDay;
      return allowed.includes(specDay);
    }

    if (promo.valid_date_type === 'M') {
      return allowed.includes(now.getDate());
    }

    return true;
  }

  private isInBlackout(todayStr: string, periods: Array<{ start: string; end: string }>): boolean {
    return periods.some((p) => todayStr >= p.start && todayStr <= p.end);
  }

  private matchesTimePeriod(promo: Promotion, now: Date): boolean {
    if (promo.day_type === 'A') return true;
    if (!promo.time_periods?.length) return true;

    const nowMins = now.getHours() * 60 + now.getMinutes();
    return promo.time_periods.some((tp) => {
      const startMins = timeToMinutes(tp.start);
      const endMins = timeToMinutes(tp.end);
      return nowMins >= startMins && nowMins <= endMins;
    });
  }

  // ── Audience filter ────────────────────────────────────────────────────────

  private matchesAudience(
    promo: Promotion,
    customer: Customer | null,
    labelIds: string[],
  ): boolean {
    if (promo.target_audience === 'all') return true;

    if (!customer) return false; // grade/label/specific requires a known customer

    if (promo.target_audience === 'grade') {
      return !!(customer.grade_id && promo.target_grade_ids?.includes(customer.grade_id));
    }
    if (promo.target_audience === 'label') {
      return promo.target_label_ids?.some((lid) => labelIds.includes(lid)) ?? false;
    }
    if (promo.target_audience === 'specific_customers') {
      return promo.target_customer_ids?.includes(customer.id) ?? false;
    }
    return false;
  }

  // ── Usage cap checks (DB queries) ─────────────────────────────────────────

  private async meetsUsageCaps(
    promo: Promotion,
    customerId: string | null,
    now: Date,
  ): Promise<boolean> {
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    // Per-day cap
    if (promo.max_uses_per_day > 0) {
      const dayCount = await this.redemptionRepo.count({
        where: { promotion_id: promo.id, redeemed_at: dayStart as any },
      });
      // Use raw query for date comparison
      const dayCountRaw = await this.redemptionRepo
        .createQueryBuilder('r')
        .where('r.promotion_id = :id', { id: promo.id })
        .andWhere('r.redeemed_at >= :dayStart', { dayStart })
        .getCount();
      if (dayCountRaw >= promo.max_uses_per_day) return false;
    }

    if (!customerId) return true;

    // Per-customer cap
    if (promo.max_uses_per_customer > 0) {
      const customerCount = await this.redemptionRepo
        .createQueryBuilder('r')
        .where('r.promotion_id = :id', { id: promo.id })
        .andWhere('r.customer_id = :cid', { cid: customerId })
        .getCount();
      if (customerCount >= promo.max_uses_per_customer) return false;
    }

    // Per-customer-per-day cap
    if (promo.max_uses_per_customer_day > 0) {
      const customerDayCount = await this.redemptionRepo
        .createQueryBuilder('r')
        .where('r.promotion_id = :id', { id: promo.id })
        .andWhere('r.customer_id = :cid', { cid: customerId })
        .andWhere('r.redeemed_at >= :dayStart', { dayStart })
        .getCount();
      if (customerDayCount >= promo.max_uses_per_customer_day) return false;
    }

    return true;
  }

  // ── Scope / discount computation ───────────────────────────────────────────

  private requiresItemTarget(type: string): boolean {
    return [
      'percent_off_category', 'percent_off_product',
      'fixed_off_product', 'bogo',
    ].includes(type);
  }

  private getAffectedLines(
    promo: Promotion,
    items: CartItem[],
  ): { affectedIndexes: number[] } {
    const type = promo.promotion_type;

    if (type === 'percent_off_order' || type === 'fixed_off_order' || type === 'points_multiplier') {
      return { affectedIndexes: items.map((_, i) => i) };
    }

    if (type === 'percent_off_category' || type === 'bundle') {
      if (!promo.target_category_id) return { affectedIndexes: [] };
      const indexes = items
        .map((item, i) => ({ item, i }))
        .filter(({ item }) => item.category_id === promo.target_category_id)
        .map(({ i }) => i);
      return { affectedIndexes: indexes };
    }

    if (type === 'percent_off_product' || type === 'fixed_off_product' || type === 'bogo') {
      if (!promo.target_product_id) return { affectedIndexes: [] };
      const indexes = items
        .map((item, i) => ({ item, i }))
        .filter(({ item }) => item.product_id === promo.target_product_id)
        .map(({ i }) => i);
      return { affectedIndexes: indexes };
    }

    return { affectedIndexes: [] };
  }

  private computeDiscount(
    promo: Promotion,
    items: CartItem[],
    affectedIndexes: number[],
    cartTotalTtc: number,
  ): number {
    const affectedItems = affectedIndexes.map((i) => items[i]);
    const affectedTotal = affectedItems.reduce(
      (sum, item) => sum + item.unit_price_ttc * item.quantity,
      0,
    );
    const val = Number(promo.value);

    switch (promo.promotion_type) {
      case 'percent_off_order':
        return cartTotalTtc * (val / 100);
      case 'percent_off_category':
      case 'percent_off_product':
        return affectedTotal * (val / 100);
      case 'fixed_off_order':
        return Math.min(val, cartTotalTtc);
      case 'fixed_off_product':
        return Math.min(val * affectedItems.reduce((n, i) => n + i.quantity, 0), affectedTotal);
      case 'bogo': {
        // Buy-one-get-one: for each 2 items, one is free (lowest qty gets discount)
        const totalQty = affectedItems.reduce((n, i) => n + i.quantity, 0);
        const freeQty = Math.floor(totalQty / 2);
        if (!affectedItems.length) return 0;
        const cheapestPrice = Math.min(...affectedItems.map((i) => i.unit_price_ttc));
        return freeQty * cheapestPrice;
      }
      case 'points_multiplier':
        return 0; // points multiplier affects points, not the cart price
      default:
        return 0;
    }
  }

  // ── Stacking mode ──────────────────────────────────────────────────────────

  private applyStackingMode(
    applicable: ApplicablePromotion[],
    promotions: Promotion[],
  ): ApplicablePromotion[] {
    if (applicable.length === 0) return [];

    const promoMap = new Map(promotions.map((p) => [p.id, p]));

    // Sort: product-level (0) → category-level (1) → order-level (2)
    const sorted = [...applicable].sort((a, b) => {
      const la = scopeLevel(a.promotion_type);
      const lb = scopeLevel(b.promotion_type);
      if (la !== lb) return la - lb;
      return b.computed_discount - a.computed_discount;
    });

    // Determine stacking mode from the business — we compare against the first promo's business
    // The business-level setting is loaded by the caller; here we need to infer it.
    // Since all promotions belong to the same business, we can check from the promoMap.
    // However, we don't have the business entity here. We'll rely on caller to filter,
    // OR we add a stacking mode parameter. To keep the interface clean, the controller
    // passes it in via evaluateWithMode.
    // For now: return sorted (caller applies mode). The public evaluate() returns sorted,
    // and the controller/service applies best_only logic.
    return sorted;
  }

  async evaluateWithStackingMode(
    businessId: string,
    cartItems: CartItem[],
    customerId: string | null,
    locationId: string,
    now: Date,
    stackingMode: 'best_only' | 'stack',
  ): Promise<{ applicable_promotions: ApplicablePromotion[]; stackable: boolean }> {
    const sorted = await this.evaluate(businessId, cartItems, customerId, locationId, now);

    if (stackingMode === 'best_only') {
      const best = sorted.length > 0
        ? [sorted.reduce((a, b) => a.computed_discount >= b.computed_discount ? a : b)]
        : [];
      return { applicable_promotions: best, stackable: false };
    }

    return { applicable_promotions: sorted, stackable: true };
  }
}
