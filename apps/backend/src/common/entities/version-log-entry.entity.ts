import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { VersionLogMenu } from './version-log-menu.entity';

@Entity('version_log_entries')
export class VersionLogEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  menu_id: string;

  @ManyToOne(() => VersionLogMenu, (m) => m.entries)
  @JoinColumn({ name: 'menu_id' })
  menu: VersionLogMenu;

  @Column({ type: 'varchar', length: 20 })
  version: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  published_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at: Date | null;
}
