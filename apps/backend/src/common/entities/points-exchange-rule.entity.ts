import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { PointsExchangeRuleDetail } from './points-exchange-rule-detail.entity';
import { PointsExchangeRedemption } from './points-exchange-redemption.entity';

@Entity('points_exchange_rules')
export class PointsExchangeRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'int' })
  point_value: number;

  @Column({ type: 'varchar', length: 20 })
  rule_type: string;

  @Column({ type: 'varchar', length: 1, default: 'D' })
  validity_date_type: string;

  @Column({ type: 'int', default: 30 })
  validity_days: number;

  @Column({ type: 'date', nullable: true })
  rule_start_date: string;

  @Column({ type: 'date', nullable: true })
  rule_end_date: string;

  @Column({ type: 'uuid', array: true, default: '{}' })
  applicable_location_ids: string[];

  @Column({ type: 'int', default: 0 })
  total_redemptions_limit: number;

  @Column({ type: 'int', default: 0 })
  per_customer_limit: number;

  @Column({ type: 'int', default: 0 })
  per_customer_per_day_limit: number;

  @Column({ type: 'int', default: 0 })
  current_redemptions: number;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => PointsExchangeRuleDetail, (d) => d.rule, { cascade: true })
  details: PointsExchangeRuleDetail[];

  @OneToMany(() => PointsExchangeRedemption, (r) => r.rule)
  redemptions: PointsExchangeRedemption[];
}
