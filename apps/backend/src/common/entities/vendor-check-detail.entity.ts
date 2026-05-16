import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { Vendor } from './vendor.entity';

@Entity('vendor_check_details')
export class VendorCheckDetail {
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

  @Column({ type: 'date' })
  check_date: string;

  @Column({ type: 'uuid' })
  checked_by_user_id: string;

  @Column({ type: 'int', nullable: true })
  quality_score: number | null;

  @Column({ type: 'int', nullable: true })
  delivery_score: number | null;

  @Column({ type: 'int', nullable: true })
  price_score: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', nullable: true })
  attachments_json: any;

  @CreateDateColumn()
  created_at: Date;
}
