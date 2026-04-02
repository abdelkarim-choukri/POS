import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { RefundMethod } from '../enums';
import { Transaction } from './transaction.entity';

@Entity('refunds')
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  transaction_id: string;

  @ManyToOne(() => Transaction, (t) => t.refunds)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({ type: 'uuid' })
  refunded_by: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'enum', enum: RefundMethod })
  refund_method: RefundMethod;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  refunded_at: Date;
}
