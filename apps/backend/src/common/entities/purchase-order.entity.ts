import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { Business } from './business.entity';
import { Vendor } from './vendor.entity';
import { Warehouse } from './warehouse.entity';
import { User } from './user.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { StockBatch } from './stock-batch.entity';

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'varchar', length: 100 })
  po_number: string;

  @Column({ type: 'uuid', nullable: true })
  vendor_id: string | null;

  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor | null;

  @Column({ type: 'uuid' })
  warehouse_id: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ type: 'uuid', nullable: true })
  parent_business_id: string | null;

  @Column({ type: 'varchar', length: 30, default: 'draft' })
  status: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  order_date: string;

  @Column({ type: 'date', nullable: true })
  expected_delivery_date: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  subtotal_ht: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  total_tva: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  total_ttc: number;

  @Column({ type: 'uuid', nullable: true })
  created_by_user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User | null;

  @Column({ type: 'uuid', nullable: true })
  approved_by_user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_user_id' })
  approvedBy: User | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder)
  items: PurchaseOrderItem[];

  @OneToMany(() => StockBatch, (batch) => batch.purchaseOrder)
  batches: StockBatch[];
}
