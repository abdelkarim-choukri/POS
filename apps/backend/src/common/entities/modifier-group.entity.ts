import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { Modifier } from './modifier.entity';
import { ProductModifierGroup } from './product-modifier-group.entity';

@Entity('modifier_groups')
export class ModifierGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business, (b) => b.modifier_groups)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'boolean', default: false })
  is_required: boolean;

  @Column({ type: 'int', default: 0 })
  max_selections: number;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @OneToMany(() => Modifier, (m) => m.modifier_group)
  modifiers: Modifier[];

  @OneToMany(() => ProductModifierGroup, (pmg) => pmg.modifier_group)
  product_modifier_groups: ProductModifierGroup[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
