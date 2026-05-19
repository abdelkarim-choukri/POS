import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { VersionLogEntry } from './version-log-entry.entity';

@Entity('version_log_menus')
export class VersionLogMenu {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @OneToMany(() => VersionLogEntry, (e) => e.menu)
  entries: VersionLogEntry[];
}
