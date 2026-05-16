import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { StockTemplate } from './stock-template.entity';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';

@Entity('stock_template_items')
export class StockTemplateItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  template_id: string;

  @ManyToOne(() => StockTemplate)
  @JoinColumn({ name: 'template_id' })
  template: StockTemplate;

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

  @Column({ type: 'numeric', precision: 12, scale: 4, default: 1 })
  default_quantity: number;

  @CreateDateColumn()
  created_at: Date;
}
