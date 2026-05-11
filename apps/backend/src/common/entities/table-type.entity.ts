import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Business } from './business.entity';

@Entity('table_types')
export class TableType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'int', default: 4 })
  default_capacity: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
