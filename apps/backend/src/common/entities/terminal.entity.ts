import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Location } from './location.entity';
import { ClockEntry } from './clock-entry.entity';
import { Transaction } from './transaction.entity';
import { SyncQueue } from './sync-queue.entity';

@Entity('terminals')
export class Terminal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  location_id: string;

  @ManyToOne(() => Location, (l) => l.terminals)
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ type: 'varchar', length: 20, unique: true })
  terminal_code: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  device_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  hardware_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  os_version: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  app_version: string;

  @Column({ type: 'boolean', default: false })
  is_online: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_seen_at: Date;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @OneToMany(() => ClockEntry, (c) => c.terminal)
  clock_entries: ClockEntry[];

  @OneToMany(() => Transaction, (t) => t.terminal)
  transactions: Transaction[];

  @OneToMany(() => SyncQueue, (s) => s.terminal)
  sync_queue: SyncQueue[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
