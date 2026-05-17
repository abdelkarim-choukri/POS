import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { StockTransfer } from './stock-transfer.entity';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';
import { StockBatch } from './stock-batch.entity';

@Entity('stock_transfer_items')
export class StockTransferItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  transfer_id: string;

  @ManyToOne(() => StockTransfer, (t) => t.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transfer_id' })
  transfer: StockTransfer;

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
  quantity: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes: string | null;
}
