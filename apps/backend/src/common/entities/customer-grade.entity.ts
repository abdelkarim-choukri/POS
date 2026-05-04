import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';

@Entity('customer_grades')
export class CustomerGrade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'int', default: 0 })
  min_points: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  discount_percent: number;

  @Column({ type: 'numeric', precision: 4, scale: 2, default: 1 })
  points_multiplier: number;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color_hex: string;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
