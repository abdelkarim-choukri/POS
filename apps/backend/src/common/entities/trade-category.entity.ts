import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';

@Entity('trade_categories')
export class TradeCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  parent_id: string | null;

  @ManyToOne(() => TradeCategory, (tc) => tc.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: TradeCategory | null;

  @OneToMany(() => TradeCategory, (tc) => tc.parent)
  children: TradeCategory[];

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'uuid', nullable: true })
  default_business_type_id: string | null;

  @Column({ type: 'jsonb', nullable: true })
  default_settings_json: Record<string, any> | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order: number;
}
