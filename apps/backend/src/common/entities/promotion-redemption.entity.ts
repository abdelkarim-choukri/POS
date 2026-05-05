import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Business } from './business.entity';
import { Promotion } from './promotion.entity';
import { Transaction } from './transaction.entity';
import { Customer } from './customer.entity';

@Entity('promotion_redemptions')
export class PromotionRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'uuid' })
  promotion_id: string;

  @ManyToOne(() => Promotion, (p) => p.redemptions)
  @JoinColumn({ name: 'promotion_id' })
  promotion: Promotion;

  @Column({ type: 'uuid' })
  transaction_id: string;

  @ManyToOne(() => Transaction)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({ type: 'uuid', nullable: true })
  customer_id: string;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  discount_applied: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  redeemed_at: Date;
}
