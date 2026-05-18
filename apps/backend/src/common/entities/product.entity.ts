import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { Category } from './category.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductModifierGroup } from './product-modifier-group.entity';
import { Brand } from './brand.entity';
import { Vendor } from './vendor.entity';
import { UnitOfMeasure } from './unit-of-measure.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business, (b) => b.products)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'uuid' })
  category_id: string;

  @ManyToOne(() => Category, (c) => c.products)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost_price: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sku: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url: string;

  @Column({ type: 'boolean', default: false })
  is_sold_out: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  tva_rate: number | null;

  @Column({ type: 'boolean', default: false })
  tva_exempt: boolean;

  @Column({ type: 'uuid', nullable: true })
  brand_id: string | null;

  @ManyToOne(() => Brand, { nullable: true })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand | null;

  @Column({ type: 'uuid', nullable: true })
  default_vendor_id: string | null;

  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'default_vendor_id' })
  default_vendor: Vendor | null;

  @Column({ type: 'varchar', length: 20, default: 'unit' })
  unit_of_measure: string;

  @Column({ type: 'uuid', nullable: true })
  unit_of_measure_id: string | null;

  @ManyToOne(() => UnitOfMeasure, { nullable: true })
  @JoinColumn({ name: 'unit_of_measure_id' })
  unit_of_measure_ref: UnitOfMeasure | null;

  @Column({ type: 'boolean', default: false })
  track_stock: boolean;

  @Column({ type: 'uuid', nullable: true })
  synced_from_parent_id: string | null;

  @OneToMany(() => ProductVariant, (v) => v.product)
  variants: ProductVariant[];

  @OneToMany(() => ProductModifierGroup, (pmg) => pmg.product)
  product_modifier_groups: ProductModifierGroup[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
