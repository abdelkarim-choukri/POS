import {
  Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';

@Entity('voids')
export class Void {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  transaction_id: string;

  @OneToOne(() => Transaction, (t) => t.void)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({ type: 'uuid' })
  voided_by: string;

  @Column({ type: 'uuid', nullable: true })
  approved_by: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  voided_at: Date;
}
