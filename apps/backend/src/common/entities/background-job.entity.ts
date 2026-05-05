import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Business } from './business.entity';

@Entity('background_jobs')
export class BackgroundJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  business_id: string;

  @ManyToOne(() => Business, { nullable: true })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'varchar', length: 60 })
  job_type: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  unique_lock_key: string;

  @Column({ type: 'varchar', length: 20, default: 'queued' })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  payload_json: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  result_json: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'int', default: 0 })
  retry_count: number;

  @Column({ type: 'int', default: 3 })
  max_retries: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date;
}
