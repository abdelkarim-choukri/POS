import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { Category } from './category.entity';
import { Product } from './product.entity';
import { User } from './user.entity';
import { PromotionRedemption } from './promotion-redemption.entity';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'varchar', length: 40 })
  code: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 40 })
  promotion_type: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  value: number;

  @Column({ type: 'uuid', nullable: true })
  target_category_id: string | null;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'target_category_id' })
  target_category: Category;

  @Column({ type: 'uuid', nullable: true })
  target_product_id: string | null;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'target_product_id' })
  target_product: Product;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  min_order_total_ttc: number;

  @Column({ type: 'date' })
  start_date: string;

  @Column({ type: 'date' })
  end_date: string;

  @Column({ type: 'varchar', length: 1, default: 'D' })
  valid_date_type: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  valid_dates: string | null;

  @Column({ type: 'varchar', length: 1, default: 'A' })
  day_type: string;

  @Column({ type: 'jsonb', nullable: true })
  time_periods: Array<{ start: string; end: string }> | null;

  @Column({ type: 'boolean', default: false })
  adjust_for_holidays: boolean;

  @Column({ type: 'jsonb', nullable: true })
  invalid_date_periods: Array<{ start: string; end: string }> | null;

  @Column({ type: 'varchar', length: 20, default: 'all' })
  target_audience: string;

  @Column({ type: 'uuid', array: true, default: '{}' })
  target_grade_ids: string[];

  @Column({ type: 'uuid', array: true, default: '{}' })
  target_label_ids: string[];

  @Column({ type: 'uuid', array: true, default: '{}' })
  target_customer_ids: string[];

  @Column({ type: 'uuid', array: true, default: '{}' })
  applicable_location_ids: string[];

  @Column({ type: 'int', default: 0 })
  max_total_uses: number;

  @Column({ type: 'int', default: 0 })
  max_uses_per_day: number;

  @Column({ type: 'int', default: 0 })
  max_uses_per_customer: number;

  @Column({ type: 'int', default: 0 })
  max_uses_per_customer_day: number;

  @Column({ type: 'int', default: 0 })
  current_uses: number;

  @Column({ type: 'boolean', default: false })
  notify_sms: boolean;

  @Column({ type: 'boolean', default: false })
  notify_email: boolean;

  @Column({ type: 'boolean', default: false })
  notify_whatsapp: boolean;

  @Column({ type: 'int', default: 0 })
  advance_notify_days: number;

  @Column({ type: 'boolean', default: false })
  share_enabled: boolean;

  @Column({ type: 'varchar', length: 200, nullable: true })
  share_main_title: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  share_subtitle: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  share_poster_url: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  share_landing_url: string | null;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: string;

  @Column({ type: 'text', nullable: true })
  remark: string | null;

  @Column({ type: 'uuid', nullable: true })
  created_by_user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  created_by: User;

  @OneToMany(() => PromotionRedemption, (r) => r.promotion)
  redemptions: PromotionRedemption[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
