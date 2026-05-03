import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';

@Entity('transaction_items')
export class TransactionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  transaction_id: string;

  @ManyToOne(() => Transaction, (t) => t.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({ type: 'uuid' })
  product_id: string;

  @Column({ type: 'uuid', nullable: true })
  variant_id: string;

  @Column({ type: 'varchar', length: 200 })
  product_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  variant_name: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unit_price: number;

  @Column({ type: 'jsonb', nullable: true })
  modifiers_json: Record<string, any>;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  line_total: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 20.00 })
  tva_rate: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  item_ht: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  item_tva: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  item_ttc: number;

  @CreateDateColumn()
  created_at: Date;
}
