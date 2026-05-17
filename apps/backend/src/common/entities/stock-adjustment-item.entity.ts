import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { StockAdjustment } from './stock-adjustment.entity';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';
import { StockBatch } from './stock-batch.entity';

@Entity('stock_adjustment_items')
export class StockAdjustmentItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  adjustment_id: string;

  @ManyToOne(() => StockAdjustment, (a) => a.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'adjustment_id' })
  adjustment: StockAdjustment;

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

  @Column({ type: 'uuid' })
  batch_id: string;

  @ManyToOne(() => StockBatch)
  @JoinColumn({ name: 'batch_id' })
  batch: StockBatch;

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  proposed_delta: number;

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  current_quantity: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes: string | null;
}
