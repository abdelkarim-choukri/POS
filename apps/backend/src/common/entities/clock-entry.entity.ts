import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Terminal } from './terminal.entity';

@Entity('clock_entries')
export class ClockEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, (u) => u.clock_entries)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  terminal_id: string;

  @ManyToOne(() => Terminal, (t) => t.clock_entries)
  @JoinColumn({ name: 'terminal_id' })
  terminal: Terminal;

  @Column({ type: 'timestamp' })
  clock_in: Date;

  @Column({ type: 'timestamp', nullable: true })
  clock_out: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  total_hours: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
