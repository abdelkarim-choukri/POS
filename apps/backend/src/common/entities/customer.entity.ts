import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { CustomerGrade } from './customer-grade.entity';
import { CustomerLabelAssignment } from './customer-label-assignment.entity';
import { CustomerAttributeValue } from './customer-attribute-value.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'varchar', length: 50 })
  customer_code: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 100 })
  first_name: string;

  @Column({ type: 'varchar', length: 100 })
  last_name: string;

  @Column({ type: 'date', nullable: true })
  birthday: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'uuid', nullable: true })
  grade_id: string;

  @ManyToOne(() => CustomerGrade, { nullable: true })
  @JoinColumn({ name: 'grade_id' })
  grade: CustomerGrade;

  @Column({ type: 'int', default: 0 })
  points_balance: number;

  @Column({ type: 'int', default: 0 })
  lifetime_points: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  consent_marketing: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => CustomerLabelAssignment, (cla) => cla.customer)
  label_assignments: CustomerLabelAssignment[];

  @OneToMany(() => CustomerAttributeValue, (cav) => cav.customer)
  attribute_values: CustomerAttributeValue[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
