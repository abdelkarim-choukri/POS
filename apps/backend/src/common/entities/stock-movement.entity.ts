import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { StockBatch } from './stock-batch.entity';
import { User } from './user.entity';

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'uuid' })
  batch_id: string;

  @ManyToOne(() => StockBatch)
  @JoinColumn({ name: 'batch_id' })
  batch: StockBatch;

  @Column({ type: 'varchar', length: 30 })
  movement_type: string;

  @Column({ type: 'numeric', precision: 12, scale: 4 })
  quantity: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  reference_type: string | null;

  @Column({ type: 'uuid', nullable: true })
  reference_id: string | null;

  @Column({ type: 'varchar', length: 20, default: 'realtime' })
  source_origin: string;

  @Column({ type: 'uuid', nullable: true })
  performed_by_user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'performed_by_user_id' })
  performedBy: User | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;
}
