import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { Business } from './business.entity';
import { Vendor } from './vendor.entity';
import { Warehouse } from './warehouse.entity';
import { StockTemplateItem } from './stock-template-item.entity';

@Entity('stock_templates')
export class StockTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'uuid', nullable: true })
  default_vendor_id: string | null;

  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'default_vendor_id' })
  defaultVendor: Vendor | null;

  @Column({ type: 'uuid', nullable: true })
  default_warehouse_id: string | null;

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'default_warehouse_id' })
  defaultWarehouse: Warehouse | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => StockTemplateItem, (item) => item.template)
  items: StockTemplateItem[];
}
