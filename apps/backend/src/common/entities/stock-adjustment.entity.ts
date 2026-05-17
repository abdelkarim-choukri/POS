import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { Warehouse } from './warehouse.entity';
import { User } from './user.entity';
import { StockAdjustmentItem } from './stock-adjustment-item.entity';

@Entity('stock_adjustments')
export class StockAdjustment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'varchar', length: 50 })
  adjustment_number: string;

  @Column({ type: 'uuid' })
  warehouse_id: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'uuid' })
  proposed_by_user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'proposed_by_user_id' })
  proposedBy: User;

  @Column({ type: 'uuid', nullable: true })
  approved_by_user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_user_id' })
  approvedBy: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  approved_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  posted_at: Date | null;

  @Column({ type: 'text', nullable: true })
  rejected_reason: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => StockAdjustmentItem, (i) => i.adjustment, { cascade: true })
  items: StockAdjustmentItem[];
}
