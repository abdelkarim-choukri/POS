import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Business } from './business.entity';
import { CouponType } from './coupon-type.entity';
import { Customer } from './customer.entity';
import { User } from './user.entity';
import { Transaction } from './transaction.entity';
import { Terminal } from './terminal.entity';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'uuid' })
  coupon_type_id: string;

  @ManyToOne(() => CouponType)
  @JoinColumn({ name: 'coupon_type_id' })
  coupon_type: CouponType;

  @Column({ type: 'varchar', length: 50 })
  coupon_code: string;

  @Column({ type: 'uuid', nullable: true })
  customer_id: string;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  issued_at: Date;

  @Column({ type: 'uuid', nullable: true })
  issued_by_user_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'issued_by_user_id' })
  issued_by: User;

  @Column({ type: 'varchar', length: 40, default: 'manual' })
  issue_source: string;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  redeemed_at: Date;

  @Column({ type: 'uuid', nullable: true })
  redeemed_in_transaction_id: string;

  @ManyToOne(() => Transaction, { nullable: true })
  @JoinColumn({ name: 'redeemed_in_transaction_id' })
  redeemed_in_transaction: Transaction;

  @Column({ type: 'uuid', nullable: true })
  redeemed_by_terminal_id: string;

  @ManyToOne(() => Terminal, { nullable: true })
  @JoinColumn({ name: 'redeemed_by_terminal_id' })
  redeemed_by_terminal: Terminal;

  @Column({ type: 'varchar', length: 20, default: 'available' })
  status: string;
}
