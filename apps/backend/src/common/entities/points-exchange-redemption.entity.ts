import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { PointsExchangeRule } from './points-exchange-rule.entity';
import { Customer } from './customer.entity';
import { Coupon } from './coupon.entity';
import { Transaction } from './transaction.entity';

@Entity('points_exchange_redemptions')
export class PointsExchangeRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'uuid' })
  rule_id: string;

  @ManyToOne(() => PointsExchangeRule, (r) => r.redemptions)
  @JoinColumn({ name: 'rule_id' })
  rule: PointsExchangeRule;

  @Column({ type: 'uuid' })
  customer_id: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'int' })
  points_spent: number;

  @Column({ type: 'uuid', nullable: true })
  granted_coupon_id: string | null;

  @ManyToOne(() => Coupon, { nullable: true })
  @JoinColumn({ name: 'granted_coupon_id' })
  granted_coupon: Coupon;

  @Column({ type: 'uuid', nullable: true })
  granted_in_transaction_id: string | null;

  @ManyToOne(() => Transaction, { nullable: true })
  @JoinColumn({ name: 'granted_in_transaction_id' })
  granted_in_transaction: Transaction;

  @CreateDateColumn({ type: 'timestamptz' })
  redeemed_at: Date;
}
