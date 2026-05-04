import {
  Entity, ManyToOne, JoinColumn, Column, PrimaryColumn, CreateDateColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { CustomerLabel } from './customer-label.entity';

@Entity('customer_label_assignments')
export class CustomerLabelAssignment {
  @PrimaryColumn({ type: 'uuid' })
  customer_id: string;

  @PrimaryColumn({ type: 'uuid' })
  label_id: string;

  @ManyToOne(() => Customer, (c) => c.label_assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => CustomerLabel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'label_id' })
  label: CustomerLabel;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  assigned_at: Date;
}
