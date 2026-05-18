import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('chain_sync_configs')
export class ChainSyncConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  parent_business_id: string;

  @Column({ type: 'uuid', array: true, default: '{}' })
  child_business_ids: string[];

  @Column({ type: 'boolean', default: true })
  sync_categories: boolean;

  @Column({ type: 'boolean', default: true })
  sync_products: boolean;

  @Column({ type: 'boolean', default: true })
  sync_variants: boolean;

  @Column({ type: 'boolean', default: true })
  sync_modifiers: boolean;

  @Column({ type: 'boolean', default: false })
  sync_prices: boolean;

  @Column({ type: 'boolean', default: false })
  auto_sync_on_change: boolean;

  @UpdateDateColumn()
  updated_at: Date;
}
