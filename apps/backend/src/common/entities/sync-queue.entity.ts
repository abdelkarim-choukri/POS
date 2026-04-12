import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { SyncOperationType, SyncStatus } from '../enums';
import { Terminal } from './terminal.entity';

@Entity('sync_queue')
export class SyncQueue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  terminal_id: string;

  @ManyToOne(() => Terminal, (t) => t.sync_queue)
  @JoinColumn({ name: 'terminal_id' })
  terminal: Terminal;

  @Column({ type: 'enum', enum: SyncOperationType })
  operation_type: SyncOperationType;

  @Column({ type: 'jsonb' })
  payload_json: Record<string, any>;

  @Column({ type: 'enum', enum: SyncStatus, default: SyncStatus.PENDING })
  status: SyncStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  queued_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  synced_at: Date;

  @Column({ type: 'text', nullable: true })
  error_message: string;
}
