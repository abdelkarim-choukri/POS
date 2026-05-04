import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { Business } from './business.entity';

@Entity('customer_attributes')
export class CustomerAttribute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'varchar', length: 200 })
  label: string;

  @Column({ type: 'varchar', length: 20, default: 'string' })
  data_type: string;

  @Column({ type: 'jsonb', nullable: true })
  enum_options: string[];

  @Column({ type: 'boolean', default: false })
  is_required: boolean;
}
