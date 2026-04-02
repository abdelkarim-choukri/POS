import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { ModifierGroup } from './modifier-group.entity';

@Entity('product_modifier_groups')
export class ProductModifierGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  product_id: string;

  @ManyToOne(() => Product, (p) => p.product_modifier_groups, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'uuid' })
  modifier_group_id: string;

  @ManyToOne(() => ModifierGroup, (mg) => mg.product_modifier_groups, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'modifier_group_id' })
  modifier_group: ModifierGroup;

  @CreateDateColumn()
  created_at: Date;
}
