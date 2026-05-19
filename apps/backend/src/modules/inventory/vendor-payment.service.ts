import {
  Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { VendorPayment } from '../../common/entities/vendor-payment.entity';
import { Vendor } from '../../common/entities/vendor.entity';
import { PurchaseOrder } from '../../common/entities/purchase-order.entity';
import { AuditLog } from '../../common/entities/audit-log.entity';
import {
  ListVendorPaymentsQueryDto,
  CreateVendorPaymentDto,
  VoidVendorPaymentDto,
} from './dto/stock-engine.dto';

@Injectable()
export class VendorPaymentService {
  constructor(
    @InjectRepository(VendorPayment) private vpRepo: Repository<VendorPayment>,
    @InjectRepository(Vendor) private vendorRepo: Repository<Vendor>,
    @InjectRepository(PurchaseOrder) private poRepo: Repository<PurchaseOrder>,
    @InjectRepository(AuditLog) private auditLogRepo: Repository<AuditLog>,
    private dataSource: DataSource,
  ) {}

  private async generatePaymentNumber(businessId: string, qr: QueryRunner): Promise<string> {
    const year = new Date().getFullYear();
    const [row] = await qr.query(
      `SELECT COUNT(*)::int AS cnt FROM vendor_payments WHERE business_id = $1 AND EXTRACT(YEAR FROM created_at) = $2`,
      [businessId, year],
    );
    return `VP-${year}-${String((row.cnt ?? 0) + 1).padStart(5, '0')}`;
  }

  async listPayments(businessId: string, query: ListVendorPaymentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.vpRepo
      .createQueryBuilder('vp')
      .where('vp.business_id = :businessId', { businessId })
      .orderBy('vp.payment_date', 'DESC')
      .addOrderBy('vp.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.vendor_id) qb.andWhere('vp.vendor_id = :vendorId', { vendorId: query.vendor_id });
    if (query.purchase_order_id) qb.andWhere('vp.purchase_order_id = :poId', { poId: query.purchase_order_id });
    if (query.status) qb.andWhere('vp.status = :status', { status: query.status });
    if (query.from_date) qb.andWhere('vp.payment_date >= :fromDate', { fromDate: query.from_date });
    if (query.to_date) qb.andWhere('vp.payment_date <= :toDate', { toDate: query.to_date });

    const [records, total] = await qb.getManyAndCount();
    return { records, total, page, limit };
  }

  async getPayment(id: string, businessId: string) {
    const vp = await this.vpRepo.findOne({ where: { id, business_id: businessId } });
    if (!vp) throw new NotFoundException('Vendor payment not found');
    return vp;
  }

  async createPayment(businessId: string, userId: string, dto: CreateVendorPaymentDto) {
    const vendor = await this.vendorRepo.findOne({ where: { id: dto.vendor_id, business_id: businessId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    if (dto.purchase_order_id) {
      const po = await this.poRepo.findOne({
        where: { id: dto.purchase_order_id, business_id: businessId, vendor_id: dto.vendor_id },
      });
      if (!po) throw new NotFoundException('Purchase order not found or does not belong to this vendor');
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const paymentNumber = await this.generatePaymentNumber(businessId, qr);
      const vp = qr.manager.create(VendorPayment, {
        business_id: businessId,
        vendor_id: dto.vendor_id,
        purchase_order_id: dto.purchase_order_id ?? null,
        payment_number: paymentNumber,
        amount_paid: dto.amount_paid,
        payment_date: dto.payment_date,
        payment_method: dto.payment_method,
        reference_number: dto.reference_number ?? null,
        notes: dto.notes ?? null,
        status: 'pending',
        created_by_user_id: userId,
      });
      const saved = await qr.manager.save(VendorPayment, vp);
      await qr.commitTransaction();
      return this.vpRepo.findOne({ where: { id: saved.id, business_id: businessId } });
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  async confirmPayment(id: string, businessId: string, userId: string) {
    const vp = await this.vpRepo.findOne({ where: { id, business_id: businessId } });
    if (!vp) throw new NotFoundException('Vendor payment not found');
    if (vp.status !== 'pending') throw new UnprocessableEntityException('Only pending payments can be confirmed');
    await this.vpRepo.update(id, {
      status: 'confirmed',
      confirmed_by_user_id: userId,
      confirmed_at: new Date(),
    });
    return this.vpRepo.findOne({ where: { id, business_id: businessId } });
  }

  async voidPayment(id: string, businessId: string, dto: VoidVendorPaymentDto, performedBy: string) {
    const vp = await this.vpRepo.findOne({ where: { id, business_id: businessId } });
    if (!vp) throw new NotFoundException('Vendor payment not found');
    if (vp.status === 'voided') throw new UnprocessableEntityException('Payment is already voided');
    await this.vpRepo.update(id, { status: 'voided' });
    await this.auditLogRepo.save(this.auditLogRepo.create({
      business_id: businessId,
      user_id: performedBy,
      action: 'void',
      entity_type: 'vendor_payment',
      entity_id: id,
      details_json: { payment_number: vp.payment_number, reason: dto.reason },
    }));
    return this.vpRepo.findOne({ where: { id, business_id: businessId } });
  }

  async getVendorOutstanding(vendorId: string, businessId: string) {
    const vendor = await this.vendorRepo.findOne({ where: { id: vendorId, business_id: businessId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    return this.dataSource.query(
      `SELECT * FROM (
         SELECT
           po.id, po.po_number, po.status, po.order_date, po.expected_delivery_date,
           po.total_ttc,
           COALESCE(vp_sum.amount_paid, 0) AS amount_paid,
           po.total_ttc - COALESCE(vp_sum.amount_paid, 0) AS balance_due
         FROM purchase_orders po
         LEFT JOIN (
           SELECT purchase_order_id, SUM(amount_paid) AS amount_paid
           FROM vendor_payments
           WHERE business_id = $1 AND status IN ('pending', 'confirmed')
           GROUP BY purchase_order_id
         ) vp_sum ON vp_sum.purchase_order_id = po.id
         WHERE po.business_id = $1 AND po.vendor_id = $2
           AND po.status NOT IN ('cancelled', 'draft')
       ) sub
       WHERE balance_due > 0
       ORDER BY expected_delivery_date ASC NULLS LAST`,
      [businessId, vendorId],
    );
  }

  async getVendorPaymentSummary(vendorId: string, businessId: string) {
    const vendor = await this.vendorRepo.findOne({ where: { id: vendorId, business_id: businessId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const [paymentStats] = await this.dataSource.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status IN ('pending','confirmed') THEN amount_paid ELSE 0 END), 0) AS total_paid,
         COUNT(CASE WHEN status != 'voided' THEN 1 END)::int AS payment_count
       FROM vendor_payments
       WHERE business_id = $1 AND vendor_id = $2`,
      [businessId, vendorId],
    );

    const [outstandingStats] = await this.dataSource.query(
      `SELECT COALESCE(SUM(
         po.total_ttc - COALESCE((
           SELECT SUM(vp2.amount_paid) FROM vendor_payments vp2
           WHERE vp2.purchase_order_id = po.id AND vp2.business_id = $1
             AND vp2.status IN ('pending','confirmed')
         ), 0)
       ), 0) AS total_outstanding
       FROM purchase_orders po
       WHERE po.business_id = $1 AND po.vendor_id = $2
         AND po.status NOT IN ('cancelled', 'draft')`,
      [businessId, vendorId],
    );

    const [avgStats] = await this.dataSource.query(
      `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (vp.payment_date::timestamptz - po.order_date::timestamptz)) / 86400))::int AS avg_days_to_pay
       FROM vendor_payments vp
       JOIN purchase_orders po ON po.id = vp.purchase_order_id
       WHERE vp.business_id = $1 AND vp.vendor_id = $2
         AND vp.status != 'voided' AND vp.purchase_order_id IS NOT NULL`,
      [businessId, vendorId],
    );

    return {
      total_paid: Number(paymentStats.total_paid),
      total_outstanding: Number(outstandingStats.total_outstanding),
      payment_count: paymentStats.payment_count,
      avg_days_to_pay: avgStats.avg_days_to_pay ?? null,
    };
  }
}
