import {
  Entity, ManyToOne, JoinColumn, Column, PrimaryColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { CustomerAttribute } from './customer-attribute.entity';

@Entity('customer_attribute_values')
export class CustomerAttributeValue {
  @PrimaryColumn({ type: 'uuid' })
  customer_id: string;

  @PrimaryColumn({ type: 'uuid' })
  attribute_id: string;

  @ManyToOne(() => Customer, (c) => c.attribute_values, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => CustomerAttribute, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attribute_id' })
  attribute: CustomerAttribute;

  @Column({ type: 'text' })
  value: string;
}
