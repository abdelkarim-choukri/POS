import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { Customer } from './customer.entity';

@Entity('customer_points_history')
export class CustomerPointsHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'uuid' })
  customer_id: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'int' })
  delta: number;

  @Column({ type: 'int' })
  balance_after: number;

  @Column({ type: 'varchar', length: 40 })
  source: string;

  @Column({ type: 'uuid', nullable: true })
  transaction_id: string;

  @Column({ type: 'uuid', nullable: true })
  adjusted_by_user_id: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
