import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Business } from './business.entity';
import { Transaction } from './transaction.entity';
import { Terminal } from './terminal.entity';
import { Coupon } from './coupon.entity';

@Entity('discount_write_offs')
export class DiscountWriteOff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'uuid' })
  transaction_id: string;

  @ManyToOne(() => Transaction)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({ type: 'uuid', nullable: true })
  terminal_id: string;

  @ManyToOne(() => Terminal, { nullable: true })
  @JoinColumn({ name: 'terminal_id' })
  terminal: Terminal;

  @Column({ type: 'uuid', nullable: true })
  coupon_id: string;

  @ManyToOne(() => Coupon, { nullable: true })
  @JoinColumn({ name: 'coupon_id' })
  coupon: Coupon;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  written_off_amount: number;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
