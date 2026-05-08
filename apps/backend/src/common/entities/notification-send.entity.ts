import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Business } from './business.entity';
import { NotificationTemplate } from './notification-template.entity';
import { Customer } from './customer.entity';
import { Promotion } from './promotion.entity';
import { Coupon } from './coupon.entity';
import { BackgroundJob } from './background-job.entity';

@Entity('notification_sends')
export class NotificationSend {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'varchar', length: 20 })
  channel: string;

  @Column({ type: 'uuid', nullable: true })
  template_id: string | null;

  @ManyToOne(() => NotificationTemplate, { nullable: true })
  @JoinColumn({ name: 'template_id' })
  template: NotificationTemplate;

  @Column({ type: 'uuid', nullable: true })
  recipient_customer_id: string | null;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'recipient_customer_id' })
  recipient_customer: Customer;

  @Column({ type: 'varchar', length: 255 })
  recipient_address: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  subject: string | null;

  @Column({ type: 'text' })
  body_rendered: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  provider_message_id: string | null;

  @Column({ type: 'varchar', length: 20, default: 'queued' })
  status: string;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  sent_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  delivered_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  read_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  linked_promotion_id: string | null;

  @ManyToOne(() => Promotion, { nullable: true })
  @JoinColumn({ name: 'linked_promotion_id' })
  linked_promotion: Promotion;

  @Column({ type: 'uuid', nullable: true })
  linked_coupon_id: string | null;

  @ManyToOne(() => Coupon, { nullable: true })
  @JoinColumn({ name: 'linked_coupon_id' })
  linked_coupon: Coupon;

  @Column({ type: 'uuid', nullable: true })
  campaign_job_id: string | null;

  @ManyToOne(() => BackgroundJob, { nullable: true })
  @JoinColumn({ name: 'campaign_job_id' })
  campaign_job: BackgroundJob;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
