import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { Vendor } from './vendor.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { User } from './user.entity';

@Entity('vendor_payments')
export class VendorPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'uuid' })
  vendor_id: string;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ type: 'uuid', nullable: true })
  purchase_order_id: string | null;

  @ManyToOne(() => PurchaseOrder, { nullable: true })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder | null;

  @Column({ type: 'varchar', length: 50 })
  payment_number: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount_paid: number;

  @Column({ type: 'date' })
  payment_date: string;

  @Column({ type: 'varchar', length: 30 })
  payment_method: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference_number: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User;

  @Column({ type: 'uuid', nullable: true })
  confirmed_by_user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'confirmed_by_user_id' })
  confirmedBy: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  confirmed_at: Date | null;

  @CreateDateColumn()
  created_at: Date;
}
