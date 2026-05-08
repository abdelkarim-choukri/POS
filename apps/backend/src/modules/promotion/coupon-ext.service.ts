import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CouponType } from '../../common/entities/coupon-type.entity';
import { Coupon } from '../../common/entities/coupon.entity';
import { CouponRedemption } from '../../common/entities/coupon-redemption.entity';
import { DiscountWriteOff } from '../../common/entities/discount-write-off.entity';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerLabelAssignment } from '../../common/entities/customer-label-assignment.entity';
import { JobService } from '../jobs/job.service';
import {
  BulkIssueCouponDto, IssueToSegmentDto,
  CouponReportQueryDto, DiscountWriteOffReportQueryDto,
} from './dto/coupon.dto';
import { CouponService } from './coupon.service';

export const COUPON_BULK_QUEUE = 'coupon-bulk-issue';

@Injectable()
export class CouponExtService {
  constructor(
    @InjectRepository(CouponType) private couponTypeRepo: Repository<CouponType>,
    @InjectRepository(Coupon) private couponRepo: Repository<Coupon>,
    @InjectRepository(CouponRedemption) private redemptionRepo: Repository<CouponRedemption>,
    @InjectRepository(DiscountWriteOff) private writeOffRepo: Repository<DiscountWriteOff>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(CustomerLabelAssignment) private labelAssignRepo: Repository<CustomerLabelAssignment>,
    private readonly jobService: JobService,
    @InjectQueue(COUPON_BULK_QUEUE) private bulkQueue: Queue,
    private readonly couponService: CouponService,
  ) {}

  // [CPN-021] Bulk coupon issuance
  async bulkIssueCoupons(businessId: string, dto: BulkIssueCouponDto) {
    const ct = await this.couponTypeRepo.findOne({
      where: { id: dto.coupon_type_id, business_id: businessId, is_active: true },
    });
    if (!ct) throw new NotFoundException('Coupon type not found or inactive');

    if (dto.customer_ids.length <= 100) {
      // Synchronous path — issue inline, return results
      const issued: Coupon[] = [];
      for (const customerId of dto.customer_ids) {
        const coupon = await this.couponService.issueCoupon(
          dto.coupon_type_id, businessId, { customer_id: customerId },
        );
        issued.push(coupon);
      }
      return { issued_coupons: issued, total: issued.length };
    }

    // Async path — queue a background job
    const job = await this.jobService.createJob({
      business_id: businessId,
      job_type: 'bulk_coupon_issue',
      payload_json: {
        coupon_type_id: dto.coupon_type_id,
        customer_ids: dto.customer_ids,
        note: dto.note ?? null,
        mode: 'bulk',
      },
    });

    await this.bulkQueue.add('bulk', {
      job_db_id: job.id,
      business_id: businessId,
      coupon_type_id: dto.coupon_type_id,
      customer_ids: dto.customer_ids,
    });

    return { job_id: job.id, total_queued: dto.customer_ids.length };
  }

  // [CPN-022] Issue coupons to a customer segment — always async
  async issueToSegment(businessId: string, dto: IssueToSegmentDto) {
    const ct = await this.couponTypeRepo.findOne({
      where: { id: dto.coupon_type_id, business_id: businessId, is_active: true },
    });
    if (!ct) throw new NotFoundException('Coupon type not found or inactive');

    const job = await this.jobService.createJob({
      business_id: businessId,
      job_type: 'bulk_coupon_issue',
      payload_json: {
        coupon_type_id: dto.coupon_type_id,
        target_audience: dto.target_audience,
        target_grade_ids: dto.target_grade_ids ?? [],
        target_label_ids: dto.target_label_ids ?? [],
        note: dto.note ?? null,
        mode: 'segment',
      },
    });

    await this.bulkQueue.add('segment', {
      job_db_id: job.id,
      business_id: businessId,
      coupon_type_id: dto.coupon_type_id,
      target_audience: dto.target_audience,
      target_grade_ids: dto.target_grade_ids ?? [],
      target_label_ids: dto.target_label_ids ?? [],
    });

    return { job_id: job.id };
  }

  // [CPN-040] Coupon usage report
  async couponReport(businessId: string, query: CouponReportQueryDto) {
    const from = new Date(query.from_date);
    const to = new Date(query.to_date + 'T23:59:59.999Z');

    const qb = this.couponRepo
      .createQueryBuilder('c')
      .innerJoin('c.coupon_type', 'ct')
      .leftJoin(
        'coupon_redemptions',
        'cr',
        'cr.coupon_id = c.id AND cr.business_id = c.business_id',
      )
      .select('c.coupon_type_id', 'coupon_type_id')
      .addSelect('ct.name', 'coupon_type_name')
      .addSelect('COUNT(c.id)', 'total_issued')
      .addSelect("SUM(CASE WHEN c.status = 'redeemed' THEN 1 ELSE 0 END)", 'total_redeemed')
      .addSelect("SUM(CASE WHEN c.status = 'expired' THEN 1 ELSE 0 END)", 'total_expired')
      .addSelect("SUM(CASE WHEN c.status = 'voided' THEN 1 ELSE 0 END)", 'total_voided')
      .addSelect('COALESCE(SUM(cr.discount_applied), 0)', 'total_discount_given')
      .where('c.business_id = :businessId', { businessId })
      .andWhere('c.issued_at >= :from', { from })
      .andWhere('c.issued_at <= :to', { to })
      .groupBy('c.coupon_type_id, ct.name');

    if (query.coupon_type_id) {
      qb.andWhere('c.coupon_type_id = :ctId', { ctId: query.coupon_type_id });
    }
    if (query.issue_source) {
      qb.andWhere('c.issue_source = :src', { src: query.issue_source });
    }

    const rows = await qb.getRawMany();

    const perType = rows.map((r) => {
      const issued = parseInt(r.total_issued ?? '0');
      const redeemed = parseInt(r.total_redeemed ?? '0');
      return {
        coupon_type_id: r.coupon_type_id,
        coupon_type_name: r.coupon_type_name,
        total_issued: issued,
        total_redeemed: redeemed,
        total_expired: parseInt(r.total_expired ?? '0'),
        total_voided: parseInt(r.total_voided ?? '0'),
        total_discount_given: parseFloat(r.total_discount_given ?? '0'),
        redemption_rate: issued > 0 ? parseFloat(((redeemed / issued) * 100).toFixed(2)) : 0,
      };
    });

    const totals = perType.reduce(
      (acc, r) => ({
        total_issued: acc.total_issued + r.total_issued,
        total_redeemed: acc.total_redeemed + r.total_redeemed,
        total_expired: acc.total_expired + r.total_expired,
        total_voided: acc.total_voided + r.total_voided,
        total_discount_given: parseFloat((acc.total_discount_given + r.total_discount_given).toFixed(2)),
      }),
      { total_issued: 0, total_redeemed: 0, total_expired: 0, total_voided: 0, total_discount_given: 0 },
    );

    return { per_coupon_type: perType, totals };
  }

  // [XCC-040] Discount write-off report
  async discountWriteOffReport(businessId: string, query: DiscountWriteOffReportQueryDto) {
    const from = new Date(query.from_date);
    const to = new Date(query.to_date + 'T23:59:59.999Z');

    const qb = this.writeOffRepo
      .createQueryBuilder('w')
      .select('w.terminal_id', 'terminal_id')
      .addSelect('COUNT(w.id)', 'count')
      .addSelect('COALESCE(SUM(w.written_off_amount), 0)', 'total_written_off_amount')
      .where('w.business_id = :businessId', { businessId })
      .andWhere('w.created_at >= :from', { from })
      .andWhere('w.created_at <= :to', { to })
      .groupBy('w.terminal_id');

    if (query.terminal_id) {
      qb.andWhere('w.terminal_id = :terminalId', { terminalId: query.terminal_id });
    }
    if (query.coupon_id) {
      qb.andWhere('w.coupon_id = :couponId', { couponId: query.coupon_id });
    }

    const byTerminal = await qb.getRawMany();

    // Grand total across all terminals
    const grandTotalQb = this.writeOffRepo
      .createQueryBuilder('w')
      .select('COUNT(w.id)', 'count')
      .addSelect('COALESCE(SUM(w.written_off_amount), 0)', 'total_written_off_amount')
      .where('w.business_id = :businessId', { businessId })
      .andWhere('w.created_at >= :from', { from })
      .andWhere('w.created_at <= :to', { to });

    if (query.coupon_id) {
      grandTotalQb.andWhere('w.coupon_id = :couponId', { couponId: query.coupon_id });
    }

    const grandTotal = await grandTotalQb.getRawOne();

    return {
      by_terminal: byTerminal.map((r) => ({
        terminal_id: r.terminal_id,
        count: parseInt(r.count ?? '0'),
        total_written_off_amount: parseFloat(r.total_written_off_amount ?? '0'),
      })),
      totals: {
        count: parseInt(grandTotal?.count ?? '0'),
        total_written_off_amount: parseFloat(grandTotal?.total_written_off_amount ?? '0'),
      },
    };
  }
}
