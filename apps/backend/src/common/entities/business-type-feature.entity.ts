import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { BusinessType } from './business-type.entity';

@Entity('business_type_features')
export class BusinessTypeFeature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_type_id: string;

  @ManyToOne(() => BusinessType, (bt) => bt.features, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_type_id' })
  business_type: BusinessType;

  @Column({ type: 'varchar', length: 50 })
  feature_key: string;

  @Column({ type: 'boolean', default: true })
  is_enabled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  config_json: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
