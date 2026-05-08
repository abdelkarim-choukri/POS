import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { SuperAdmin } from './super-admin.entity';

@Entity('platform_announcements')
export class PlatformAnnouncement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', length: 20, default: 'info' })
  severity: string;

  @Column({ type: 'uuid', array: true, default: '{}' })
  target_business_type_ids: string[];

  @Column({ type: 'uuid', array: true, default: '{}' })
  target_business_ids: string[];

  @Column({ type: 'boolean', default: false })
  display_on_homepage: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  display_until: Date | null;

  @Column({ type: 'uuid', nullable: true })
  created_by_user_id: string | null;

  @ManyToOne(() => SuperAdmin, { nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  created_by: SuperAdmin;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
