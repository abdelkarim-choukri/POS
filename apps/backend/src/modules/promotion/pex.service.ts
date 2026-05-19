import {
  Injectable, NotFoundException, ConflictException,
  UnprocessableEntityException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PointsExchangeRule } from '../../common/entities/points-exchange-rule.entity';
import { PointsExchangeRuleDetail } from '../../common/entities/points-exchange-rule-detail.entity';
import { PointsExchangeRedemption } from '../../common/entities/points-exchange-redemption.entity';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerPointsHistory } from '../../common/entities/customer-points-history.entity';
import { CouponType } from '../../common/entities/coupon-type.entity';
import { CouponService } from './coupon.service';
import {
  CreatePexRuleDto, UpdatePexRuleDto, ListPexRulesQueryDto,
  CheckPointValueQueryDto, PexReportQueryDto,
} from './dto/pex.dto';

@Injectable()
export class PointsExchangeService {
  constructor(
    @InjectRepository(PointsExchangeRule) private ruleRepo: Repository<PointsExchangeRule>,
    @InjectRepository(PointsExchangeRuleDetail) private detailRepo: Repository<PointsExchangeRuleDetail>,
    @InjectRepository(PointsExchangeRedemption) private redemptionRepo: Repository<PointsExchangeRedemption>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectDataSource() private dataSource: DataSource,
    private couponService: CouponService,
  ) {}

  // [PEX-001] List rules with optional filters
  async list(businessId: string, query: ListPexRulesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.ruleRepo.createQueryBuilder('r')
      .where('r.business_id = :businessId', { businessId })
      .orderBy('r.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.is_active !== undefined) {
      qb.andWhere('r.is_active = :is_active', { is_active: query.is_active });
    }
    if (query.rule_type) {
      qb.andWhere('r.rule_type = :rule_type', { rule_type: query.rule_type });
    }
    if (query.currently_valid) {
      const today = new Date().toISOString().slice(0, 10);
      qb.andWhere('(r.rule_start_date IS NULL OR r.rule_start_date <= :today)', { today })
        .andWhere('(r.rule_end_date IS NULL OR r.rule_end_date >= :today)', { today });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  // [PEX-002] Get rule detail with details + total_redemptions count
  async getDetail(id: string, businessId: string) {
    const rule = await this.ruleRepo.findOne({
      where: { id, business_id: businessId },
      relations: ['details'],
    });
    if (!rule) throw new NotFoundException({ error: 'PEX_RULE_NOT_FOUND', message: 'Exchange rule not found' });

    const total_redemptions = await this.redemptionRepo.count({ where: { rule_id: id } });
    return { ...rule, total_redemptions };
  }

  // [PEX-003] Check for duplicate point_value + rule_type within the business
  async checkPointValue(businessId: string, query: CheckPointValueQueryDto) {
    const qb = this.ruleRepo.createQueryBuilder('r')
      .where('r.business_id = :businessId', { businessId })
      .andWhere('r.point_value = :point_value', { point_value: query.point_value })
      .andWhere('r.rule_type = :rule_type', { rule_type: query.rule_type })
      .andWhere('r.is_active = true');

    if (query.exclude_rule_id) {
      qb.andWhere('r.id != :exclude', { exclude: query.exclude_rule_id });
    }

    const count = await qb.getCount();
    return { count };
  }

  // [PEX-004] Create rule with details — pre-flight duplicate check, atomic save
  async create(businessId: string, dto: CreatePexRuleDto) {
    const { rule: ruleBody, details } = dto;

    // Internal pre-flight for duplicate point_value+rule_type
    const dupCount = await this.checkPointValue(businessId, {
      point_value: ruleBody.point_value,
      rule_type: ruleBody.rule_type,
    });
    if (dupCount.count > 0) {
      throw new ConflictException({
        message: 'A rule with this point_value and rule_type already exists for this business',
        conflict: { point_value: ruleBody.point_value, rule_type: ruleBody.rule_type },
      });
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const rule = queryRunner.manager.create(PointsExchangeRule, {
        ...ruleBody,
        business_id: businessId,
      });
      const savedRule = await queryRunner.manager.save(PointsExchangeRule, rule);

      if (details && details.length > 0) {
        const detailEntities = details.map((d) =>
          queryRunner.manager.create(PointsExchangeRuleDetail, { ...d, rule_id: savedRule.id }),
        );
        await queryRunner.manager.save(PointsExchangeRuleDetail, detailEntities);
      }

      await queryRunner.commitTransaction();
      return this.getDetail(savedRule.id, businessId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // [PEX-005] Update rule — point_value/rule_type immutable once current_redemptions > 0
  async update(id: string, businessId: string, dto: UpdatePexRuleDto) {
    const rule = await this.ruleRepo.findOne({ where: { id, business_id: businessId } });
    if (!rule) throw new NotFoundException({ error: 'PEX_RULE_NOT_FOUND', message: 'Exchange rule not found' });

    if (rule.current_redemptions > 0) {
      const lockedAttempted = (['point_value'] as const).filter(
        (f) => (dto as any)[f] !== undefined,
      );
      if (lockedAttempted.length > 0) {
        throw new UnprocessableEntityException({
          error: 'PEX_POINT_VALUE_IMMUTABLE',
          message: 'Cannot change point_value once redemptions exist',
          locked_fields: lockedAttempted,
        });
      }
    }

    Object.assign(rule, dto);
    rule.updated_at = new Date();
    return this.ruleRepo.save(rule);
  }

  // [PEX-006] Deactivate rule — sets is_active=false
  async deactivate(id: string, businessId: string) {
    const rule = await this.ruleRepo.findOne({ where: { id, business_id: businessId } });
    if (!rule) throw new NotFoundException({ error: 'PEX_RULE_NOT_FOUND', message: 'Exchange rule not found' });
    rule.is_active = false;
    return this.ruleRepo.save(rule);
  }

  // [PEX-010] List rules redeemable by a specific customer right now
  async listRedeemableForCustomer(businessId: string, customerId: string) {
    const customer = await this.customerRepo.findOne({ where: { id: customerId, business_id: businessId } });
    if (!customer) throw new NotFoundException({ error: 'PEX_CUSTOMER_NOT_FOUND', message: 'Customer not found' });

    const today = new Date().toISOString().slice(0, 10);

    const rules = await this.ruleRepo.createQueryBuilder('r')
      .leftJoinAndSelect('r.details', 'details')
      .where('r.business_id = :businessId', { businessId })
      .andWhere('r.is_active = true')
      .andWhere('r.point_value <= :balance', { balance: customer.points_balance })
      .andWhere('(r.rule_start_date IS NULL OR r.rule_start_date <= :today)', { today })
      .andWhere('(r.rule_end_date IS NULL OR r.rule_end_date >= :today)', { today })
      .getMany();

    // Filter out rules where per-customer limits are already exceeded
    const redeemable: Array<PointsExchangeRule & { customer_redemptions: number }> = [];
    for (const rule of rules) {
      // Total limit check
      if (rule.total_redemptions_limit > 0 && rule.current_redemptions >= rule.total_redemptions_limit) {
        continue;
      }

      // Per-customer limit check
      if (rule.per_customer_limit > 0) {
        const customerCount = await this.redemptionRepo.count({
          where: { rule_id: rule.id, customer_id: customerId },
        });
        if (customerCount >= rule.per_customer_limit) continue;
      }

      // Per-customer-per-day limit check
      if (rule.per_customer_per_day_limit > 0) {
        const todayStart = new Date(today + 'T00:00:00Z');
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);

        const dayCount = await this.dataSource.manager.query(
          `SELECT COUNT(*) FROM points_exchange_redemptions
           WHERE rule_id = $1 AND customer_id = $2
             AND redeemed_at >= $3 AND redeemed_at < $4`,
          [rule.id, customerId, todayStart.toISOString(), tomorrowStart.toISOString()],
        );
        if (parseInt(dayCount[0].count, 10) >= rule.per_customer_per_day_limit) continue;
      }

      const customer_redemptions = await this.redemptionRepo.count({
        where: { rule_id: rule.id, customer_id: customerId },
      });
      redeemable.push({ ...rule, customer_redemptions });
    }

    return redeemable;
  }

  // [PEX-011] Redeem points for a customer — atomic QueryRunner flow
  async redeem(ruleId: string, businessId: string, customerId: string, canRedeemPoints: boolean) {
    if (!canRedeemPoints) throw new ForbiddenException('Permission can_redeem_points required');

    const rule = await this.ruleRepo.findOne({
      where: { id: ruleId, business_id: businessId, is_active: true },
      relations: ['details'],
    });
    if (!rule) throw new NotFoundException({ error: 'PEX_RULE_NOT_FOUND', message: 'Exchange rule not found' });

    // Date window check
    const today = new Date().toISOString().slice(0, 10);
    if (rule.rule_start_date && rule.rule_start_date > today) {
      throw new UnprocessableEntityException({ error: 'PEX_RULE_INACTIVE', message: 'Rule is not yet active' });
    }
    if (rule.rule_end_date && rule.rule_end_date < today) {
      throw new UnprocessableEntityException({ error: 'PEX_RULE_INACTIVE', message: 'Rule has expired' });
    }

    const detail = rule.details?.[0];
    if (!detail) throw new UnprocessableEntityException({ error: 'PEX_RULE_INACTIVE', message: 'Rule has no details configured' });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // Lock customer row
      const customerRows = await queryRunner.manager.query(
        `SELECT id, points_balance FROM customers WHERE id = $1 AND business_id = $2 FOR UPDATE`,
        [customerId, businessId],
      );
      if (!customerRows.length) throw new NotFoundException({ error: 'PEX_CUSTOMER_NOT_FOUND', message: 'Customer not found' });

      const pointsBalance: number = customerRows[0].points_balance;
      if (pointsBalance < rule.point_value) {
        throw new UnprocessableEntityException({
          error: 'PEX_POINTS_INSUFFICIENT',
          message: `Insufficient points: customer has ${pointsBalance}, rule requires ${rule.point_value}`,
        });
      }

      // Per-customer limit
      if (rule.per_customer_limit > 0) {
        const countRows = await queryRunner.manager.query(
          `SELECT COUNT(*) FROM points_exchange_redemptions WHERE rule_id = $1 AND customer_id = $2`,
          [ruleId, customerId],
        );
        if (parseInt(countRows[0].count, 10) >= rule.per_customer_limit) {
          throw new UnprocessableEntityException({ error: 'PEX_DAILY_LIMIT_EXCEEDED', message: 'Per-customer redemption limit reached' });
        }
      }

      // Per-customer-per-day limit
      if (rule.per_customer_per_day_limit > 0) {
        const dayRows = await queryRunner.manager.query(
          `SELECT COUNT(*) FROM points_exchange_redemptions
           WHERE rule_id = $1 AND customer_id = $2 AND DATE(redeemed_at) = CURRENT_DATE`,
          [ruleId, customerId],
        );
        if (parseInt(dayRows[0].count, 10) >= rule.per_customer_per_day_limit) {
          throw new UnprocessableEntityException({ error: 'PEX_DAILY_LIMIT_EXCEEDED', message: 'Daily redemption limit reached' });
        }
      }

      // Atomic total limit claim
      const claimRows = await queryRunner.manager.query(
        `UPDATE points_exchange_rules
         SET current_redemptions = current_redemptions + 1
         WHERE id = $1
           AND (total_redemptions_limit = 0 OR current_redemptions < total_redemptions_limit)
         RETURNING id`,
        [ruleId],
      );
      if (claimRows.length === 0) {
        throw new UnprocessableEntityException({ error: 'PEX_TOTAL_LIMIT_EXCEEDED', message: 'Total redemption limit reached (concurrent)' });
      }

      // Decrement customer points
      const updatedCustomer = await queryRunner.manager.query(
        `UPDATE customers SET points_balance = points_balance - $1 WHERE id = $2 RETURNING points_balance`,
        [rule.point_value, customerId],
      );
      const newBalance: number = updatedCustomer[0].points_balance;

      // Points history entry
      await queryRunner.manager.save(CustomerPointsHistory, {
        business_id: businessId,
        customer_id: customerId,
        delta: -rule.point_value,
        balance_after: newBalance,
        source: 'points_exchange',
        reason: `Redeemed rule: ${rule.name}`,
      } as any);

      // Determine / create CouponType for the granted reward
      let couponTypeId: string;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + rule.validity_days);

      if (rule.rule_type === 'coupon') {
        // Use the linked coupon_type directly — guaranteed non-null for coupon rule_type
        if (!detail.coupon_type_id) throw new UnprocessableEntityException({ error: 'PEX_RULE_INACTIVE', message: 'Rule detail missing coupon_type_id' });
        couponTypeId = detail.coupon_type_id;
      } else if (rule.rule_type === 'free_product') {
        // Create ephemeral CouponType with free_item discount type
        const ephemeralCt = await queryRunner.manager.save(CouponType, queryRunner.manager.create(CouponType, {
          business_id: businessId,
          code: 'PEX-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          name: `[PEX] Free product — ${rule.name}`,
          discount_type: 'free_item',
          discount_value: 0,
          free_item_product_id: detail.product_id,
          free_item_variant_id: detail.variant_id,
          validity_days_from_issue: rule.validity_days,
          is_active: true,
        }));
        couponTypeId = ephemeralCt.id;
      } else {
        // discount rule_type — create ephemeral CouponType with fixed_amount
        const ephemeralCt = await queryRunner.manager.save(CouponType, queryRunner.manager.create(CouponType, {
          business_id: businessId,
          code: 'PEX-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          name: `[PEX] Discount — ${rule.name}`,
          discount_type: 'fixed_amount',
          discount_value: detail.discount_amount_mad ?? 0,
          validity_days_from_issue: rule.validity_days,
          is_active: true,
        }));
        couponTypeId = ephemeralCt.id;
      }

      // Issue coupon inside the same QueryRunner transaction
      const grantedCoupon = await this.couponService.issueCouponInQr(
        queryRunner,
        couponTypeId,
        businessId,
        rule.validity_days,
        customerId,
        'points_exchange',
      );

      // Record the PEX redemption
      const redemption = await queryRunner.manager.save(PointsExchangeRedemption, {
        business_id: businessId,
        rule_id: ruleId,
        customer_id: customerId,
        points_spent: rule.point_value,
        granted_coupon_id: grantedCoupon.id,
      } as any);

      await queryRunner.commitTransaction();
      return { redemption, granted_coupon: grantedCoupon };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // [PEX-020] Points exchange report — per-rule aggregation
  async report(businessId: string, query: PexReportQueryDto) {
    const params: any[] = [businessId];
    let whereClauses = `r.business_id = $1`;
    let idx = 2;

    if (query.from_date) {
      whereClauses += ` AND red.redeemed_at >= $${idx++}`;
      params.push(query.from_date);
    }
    if (query.to_date) {
      whereClauses += ` AND red.redeemed_at < $${idx++}`;
      params.push(query.to_date + 'T23:59:59Z');
    }
    if (query.rule_id) {
      whereClauses += ` AND r.id = $${idx++}`;
      params.push(query.rule_id);
    }

    const rows = await this.dataSource.manager.query(
      `SELECT
         r.id                                          AS rule_id,
         r.name                                        AS rule_name,
         r.rule_type,
         r.point_value,
         COUNT(red.id)                                 AS total_redemptions,
         COALESCE(SUM(red.points_spent), 0)            AS points_spent_total,
         COUNT(DISTINCT red.customer_id)               AS customers_reached,
         COUNT(DISTINCT CASE WHEN c.status = 'redeemed' THEN c.id END)::float
           / NULLIF(COUNT(DISTINCT c.id), 0) * 100     AS granted_coupon_redemption_rate
       FROM points_exchange_rules r
       LEFT JOIN points_exchange_redemptions red ON red.rule_id = r.id
       LEFT JOIN coupons c ON c.id = red.granted_coupon_id
       WHERE ${whereClauses}
       GROUP BY r.id, r.name, r.rule_type, r.point_value
       ORDER BY total_redemptions DESC`,
      params,
    );

    return rows.map((row: any) => ({
      rule_id: row.rule_id,
      rule_name: row.rule_name,
      rule_type: row.rule_type,
      point_value: Number(row.point_value),
      total_redemptions: Number(row.total_redemptions),
      points_spent_total: Number(row.points_spent_total),
      customers_reached: Number(row.customers_reached),
      granted_coupon_redemption_rate: row.granted_coupon_redemption_rate
        ? Number(Number(row.granted_coupon_redemption_rate).toFixed(2))
        : null,
    }));
  }
}
