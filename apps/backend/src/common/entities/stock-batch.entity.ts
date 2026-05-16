import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { Business } from './business.entity';
import { Warehouse } from './warehouse.entity';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';
import { Vendor } from './vendor.entity';
import { StockMovement } from './stock-movement.entity';
import { PurchaseOrder } from './purchase-order.entity';

@Entity('stock_batches')
export class StockBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'uuid' })
  warehouse_id: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ type: 'uuid' })
  product_id: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'uuid', nullable: true })
  variant_id: string | null;

  @ManyToOne(() => ProductVariant, { nullable: true })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant | null;

  @Column({ type: 'varchar', length: 100 })
  batch_code: string;

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  quantity_initial: number;

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  quantity_remaining: number;

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  unit_cost: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  unit_cost_tva_rate: number;

  @Column({ type: 'varchar', length: 20, default: 'unit' })
  unit_of_measure: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  received_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  vendor_id: string | null;

  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor | null;

  @Column({ type: 'uuid', nullable: true })
  purchase_order_id: string | null;

  @ManyToOne(() => PurchaseOrder, { nullable: true })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => StockMovement, (movement) => movement.batch)
  movements: StockMovement[];
}
