import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';
import { PurchaseOrder } from './purchase-order.entity';

@Entity('purchase_order_items')
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  purchase_order_id: string;

  @ManyToOne(() => PurchaseOrder)
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

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

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  quantity_ordered: number;

  @Column({ type: 'numeric', precision: 12, scale: 4, default: 0 })
  quantity_received: number;

  @Column({ type: 'varchar', length: 20, default: 'unit' })
  unit_of_measure: string;

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  unit_cost_ht: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  tva_rate: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  line_total_ht: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  line_total_tva: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  line_total_ttc: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
