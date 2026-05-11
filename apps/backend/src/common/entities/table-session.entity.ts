import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { Location } from './location.entity';
import { RestaurantTable } from './table.entity';
import { User } from './user.entity';
import { Customer } from './customer.entity';

@Entity('table_sessions')
export class TableSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'uuid' })
  location_id: string;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ type: 'uuid' })
  table_id: string;

  @ManyToOne(() => RestaurantTable)
  @JoinColumn({ name: 'table_id' })
  table: RestaurantTable;

  @CreateDateColumn({ type: 'timestamptz' })
  opened_at: Date;

  @Column({ type: 'uuid' })
  opened_by_user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'opened_by_user_id' })
  opened_by_user: User;

  @Column({ type: 'timestamptz', nullable: true })
  closed_at: Date | null;

  // Set to the completing transaction when the session is fully paid
  @Column({ type: 'uuid', nullable: true })
  closed_in_transaction_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  customer_id: string | null;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @Column({ type: 'int', nullable: true })
  guest_count: number | null;

  @Column({ type: 'int', default: 1 })
  expected_split_count: number;

  @Column({ type: 'boolean', default: false })
  partial_payment: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // valid: 'open' | 'awaiting_payment' | 'paid' | 'cancelled'
  @Column({ type: 'varchar', length: 20, default: 'open' })
  status: string;
}
