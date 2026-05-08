import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerLabelAssignment } from '../../common/entities/customer-label-assignment.entity';
import { JobService } from '../jobs/job.service';
import { CouponService } from './coupon.service';
import { COUPON_BULK_QUEUE } from './coupon-ext.service';

interface BulkJobData {
  job_db_id: string;
  business_id: string;
  coupon_type_id: string;
  // bulk mode
  customer_ids?: string[];
  // segment mode
  target_audience?: string;
  target_grade_ids?: string[];
  target_label_ids?: string[];
}

@Processor(COUPON_BULK_QUEUE)
export class CouponBulkIssueProcessor extends WorkerHost {
  constructor(
    private readonly couponService: CouponService,
    private readonly jobService: JobService,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(CustomerLabelAssignment) private labelAssignRepo: Repository<CustomerLabelAssignment>,
  ) {
    super();
  }

  async process(job: Job<BulkJobData>): Promise<void> {
    const { job_db_id, business_id, coupon_type_id } = job.data;

    await this.jobService.updateJobStatus(job_db_id, 'running', { started_at: new Date() });

    let customerIds: string[];
    try {
      customerIds = await this.resolveCustomerIds(job.data, business_id);
    } catch (err) {
      await this.jobService.updateJobStatus(job_db_id, 'failed', {
        error_message: `Segment resolution failed: ${(err as Error).message}`,
      });
      return;
    }

    const total = customerIds.length;
    let issued = 0;
    let failed = 0;
    const errors: { customer_id: string; error: string }[] = [];

    for (const customerId of customerIds) {
      try {
        await this.couponService.issueCoupon(coupon_type_id, business_id, { customer_id: customerId });
        issued++;
      } catch (err) {
        failed++;
        errors.push({ customer_id: customerId, error: (err as Error).message });
      }

      // Report progress every 25 coupons
      if ((issued + failed) % 25 === 0) {
        await this.jobService.updateJobStatus(job_db_id, 'running', {
          result_json: { issued, failed, total, errors: errors.slice(-10) },
        });
      }
    }

    await this.jobService.updateJobStatus(job_db_id, 'completed', {
      result_json: { issued, failed, total, errors },
      completed_at: new Date(),
    });
  }

  private async resolveCustomerIds(data: BulkJobData, businessId: string): Promise<string[]> {
    // Bulk mode — customer IDs provided directly
    if (data.customer_ids?.length) {
      return data.customer_ids;
    }

    const audience = data.target_audience ?? 'all';

    if (audience === 'all') {
      const customers = await this.customerRepo.find({
        where: { business_id: businessId, is_active: true },
        select: ['id'],
      });
      return customers.map((c) => c.id);
    }

    if (audience === 'grade' && data.target_grade_ids?.length) {
      const customers = await this.customerRepo.find({
        where: {
          business_id: businessId,
          is_active: true,
          grade_id: In(data.target_grade_ids),
        },
        select: ['id'],
      });
      return customers.map((c) => c.id);
    }

    if (audience === 'label' && data.target_label_ids?.length) {
      const assignments = await this.labelAssignRepo.find({
        where: { label_id: In(data.target_label_ids) },
        select: ['customer_id'],
      });
      const uniqueIds = [...new Set(assignments.map((a) => a.customer_id))];
      // Verify customers belong to this business and are active
      const customers = await this.customerRepo.find({
        where: { id: In(uniqueIds), business_id: businessId, is_active: true },
        select: ['id'],
      });
      return customers.map((c) => c.id);
    }

    return [];
  }
}
