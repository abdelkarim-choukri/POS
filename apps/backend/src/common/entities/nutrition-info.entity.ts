import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { Product } from './product.entity';

@Entity('nutrition_info')
export class NutritionInfo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'uuid', unique: true })
  product_id: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true })
  serving_size_g: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true })
  calories_kcal: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true })
  protein_g: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true })
  carbs_g: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true })
  sugar_g: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true })
  fat_g: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true })
  saturated_fat_g: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true })
  fiber_g: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true })
  sodium_mg: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  allergens: string | null;

  @Column({ type: 'boolean', default: false })
  is_vegetarian: boolean;

  @Column({ type: 'boolean', default: false })
  is_vegan: boolean;

  @Column({ type: 'boolean', default: false })
  is_halal: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
