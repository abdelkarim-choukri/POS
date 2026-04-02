import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, OneToOne,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { TransactionStatus, PaymentMethod } from '../enums';
import { Business } from './business.entity';
import { Location } from './location.entity';
import { Terminal } from './terminal.entity';
import { User } from './user.entity';
import { TransactionItem } from './transaction-item.entity';
import { Void } from './void.entity';
import { Refund } from './refund.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business, (b) => b.transactions)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'uuid' })
  location_id: string;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ type: 'uuid' })
  terminal_id: string;

  @ManyToOne(() => Terminal, (t) => t.transactions)
  @JoinColumn({ name: 'terminal_id' })
  terminal: Terminal;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, (u) => u.transactions)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 30, unique: true })
  transaction_number: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.COMPLETED })
  status: TransactionStatus;

  @Column({ type: 'enum', enum: PaymentMethod })
  payment_method: PaymentMethod;

  @Column({ type: 'timestamp', nullable: true })
  payment_confirmed_at: Date;

  @Column({ type: 'boolean', default: true })
  receipt_printed: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'boolean', default: false })
  is_offline: boolean;

  @Column({ type: 'timestamp', nullable: true })
  synced_at: Date;

  @OneToMany(() => TransactionItem, (ti) => ti.transaction)
  items: TransactionItem[];

  @OneToOne(() => Void, (v) => v.transaction)
  void: Void;

  @OneToMany(() => Refund, (r) => r.transaction)
  refunds: Refund[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
