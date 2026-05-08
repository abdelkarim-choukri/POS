import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Business } from './business.entity';

@Entity('notification_channels')
export class NotificationChannel {
  @PrimaryColumn({ type: 'uuid' })
  business_id: string;

  @PrimaryColumn({ type: 'varchar', length: 20 })
  channel: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'varchar', length: 40, nullable: true })
  provider: string | null;

  // TODO: encrypt credentials at rest using per-business key
  @Column({ type: 'jsonb', nullable: true })
  provider_config_json: Record<string, any> | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  default_sender_id: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  default_sender_name: string | null;

  @Column({ type: 'int', nullable: true })
  balance_cached: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  balance_refreshed_at: Date | null;

  @Column({ type: 'boolean', default: false })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
