import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { Warehouse } from './warehouse.entity';
import { User } from './user.entity';
import { StockTransferItem } from './stock-transfer-item.entity';

@Entity('stock_transfers')
export class StockTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'varchar', length: 50 })
  transfer_number: string;

  @Column({ type: 'uuid' })
  source_warehouse_id: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'source_warehouse_id' })
  sourceWarehouse: Warehouse;

  @Column({ type: 'uuid' })
  target_warehouse_id: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'target_warehouse_id' })
  targetWarehouse: Warehouse;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User;

  @Column({ type: 'timestamptz', nullable: true })
  posted_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  posted_by_user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'posted_by_user_id' })
  postedBy: User | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => StockTransferItem, (i) => i.transfer, { cascade: true })
  items: StockTransferItem[];
}
