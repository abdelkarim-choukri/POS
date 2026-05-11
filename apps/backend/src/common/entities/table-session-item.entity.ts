import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { TableSession } from './table-session.entity';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';
import { Customer } from './customer.entity';
import { User } from './user.entity';

@Entity('table_session_items')
export class TableSessionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'uuid' })
  table_session_id: string;

  @ManyToOne(() => TableSession)
  @JoinColumn({ name: 'table_session_id' })
  table_session: TableSession;

  @Column({ type: 'uuid' })
  product_id: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'uuid', nullable: true })
  variant_id: string | null;

  @ManyToOne(() => ProductVariant, { nullable: true })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant | null;

  @Column({ type: 'uuid', nullable: true })
  customer_id: string | null;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  unit_price_ttc: number;

  @Column({ type: 'jsonb', default: {} })
  modifiers_json: Record<string, any>;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  added_at: Date;

  @Column({ type: 'uuid' })
  added_by_user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'added_by_user_id' })
  added_by_user: User;

  // valid: 'new' | 'preparing' | 'ready' | 'served' | 'cancelled'
  @Column({ type: 'varchar', length: 20, default: 'new' })
  kds_status: string;
}
