import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('business_custom_authority')
export class BusinessCustomAuthority {
  @PrimaryColumn({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'jsonb', default: {} })
  feature_overrides_json: Record<string, boolean>;

  @Column({ type: 'jsonb', default: {} })
  permission_overrides_json: Record<string, string[]>;

  @Column({ type: 'uuid', nullable: true })
  set_by_super_admin_id: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @UpdateDateColumn()
  updated_at: Date;
}
