import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, OneToOne,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { BusinessType } from './business-type.entity';
import { Location } from './location.entity';
import { User } from './user.entity';
import { Category } from './category.entity';
import { Product } from './product.entity';
import { ModifierGroup } from './modifier-group.entity';
import { Transaction } from './transaction.entity';
import { Subscription } from './subscription.entity';

@Entity('businesses')
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_type_id: string;

  @ManyToOne(() => BusinessType, (bt) => bt.businesses)
  @JoinColumn({ name: 'business_type_id' })
  business_type: BusinessType;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  legal_name: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo_url: string;

  @Column({ type: 'varchar', length: 3, default: 'MAD' })
  currency: string;

  @Column({ type: 'varchar', length: 50, default: 'Africa/Casablanca' })
  timezone: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'jsonb', nullable: true })
  settings_json: Record<string, any>;

  @Column({ type: 'varchar', length: 30, nullable: true })
  ice_number: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  if_number: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'int', default: 0 })
  invoice_counter: number;

  @Column({ type: 'varchar', length: 10 })
  business_code: string;

  @Column({ type: 'smallint', nullable: true })
  last_invoice_year: number;

  @OneToMany(() => Location, (l) => l.business)
  locations: Location[];

  @OneToMany(() => User, (u) => u.business)
  users: User[];

  @OneToMany(() => Category, (c) => c.business)
  categories: Category[];

  @OneToMany(() => Product, (p) => p.business)
  products: Product[];

  @OneToMany(() => ModifierGroup, (mg) => mg.business)
  modifier_groups: ModifierGroup[];

  @OneToMany(() => Transaction, (t) => t.business)
  transactions: Transaction[];

  @OneToOne(() => Subscription, (s) => s.business)
  subscription: Subscription;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
