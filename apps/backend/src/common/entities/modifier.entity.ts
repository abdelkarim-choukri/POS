import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { ModifierGroup } from './modifier-group.entity';

@Entity('modifiers')
export class Modifier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  modifier_group_id: string;

  @ManyToOne(() => ModifierGroup, (mg) => mg.modifiers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'modifier_group_id' })
  modifier_group: ModifierGroup;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
