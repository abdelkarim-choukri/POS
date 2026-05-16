import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { StockBatch } from './stock-batch.entity';
import { Warehouse } from './warehouse.entity';
import { Product } from './product.entity';
import { User } from './user.entity';

@Entity('stock_discrepancy_alerts')
export class StockDiscrepancyAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'uuid', nullable: true })
  batch_id: string | null;

  @ManyToOne(() => StockBatch, { nullable: true })
  @JoinColumn({ name: 'batch_id' })
  batch: StockBatch | null;

  @Column({ type: 'uuid', nullable: true })
  warehouse_id: string | null;

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse | null;

  @Column({ type: 'uuid', nullable: true })
  product_id: string | null;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product: Product | null;

  @Column({ type: 'numeric', precision: 12, scale: 4, default: 0 })
  expected_remaining: number;

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  actual_remaining: number;

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  discrepancy_quantity: number;

  @Column({ type: 'varchar', length: 30 })
  source: string;

  @Column({ type: 'timestamptz', nullable: true })
  resolved_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  resolved_by_user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by_user_id' })
  resolvedBy: User | null;

  @Column({ type: 'text', nullable: true })
  resolution_notes: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
