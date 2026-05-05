import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';

@Entity('coupon_types')
export class CouponType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'varchar', length: 40 })
  code: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 20 })
  discount_type: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  discount_value: number;

  @Column({ type: 'uuid', nullable: true })
  free_item_product_id: string;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'free_item_product_id' })
  free_item_product: Product;

  @Column({ type: 'uuid', nullable: true })
  free_item_variant_id: string;

  @ManyToOne(() => ProductVariant, { nullable: true })
  @JoinColumn({ name: 'free_item_variant_id' })
  free_item_variant: ProductVariant;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  min_order_total_ttc: number;

  @Column({ type: 'uuid', array: true, default: '{}' })
  applicable_category_ids: string[];

  @Column({ type: 'uuid', array: true, default: '{}' })
  applicable_product_ids: string[];

  @Column({ type: 'int', default: 30 })
  validity_days_from_issue: number;

  @Column({ type: 'varchar', length: 1, default: 'N' })
  share_case: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
