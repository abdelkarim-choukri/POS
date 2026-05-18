import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { RecommendationTemplateItem } from './recommendation-template-item.entity';

@Entity('recommendation_templates')
export class RecommendationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 40, default: 'manual' })
  template_type: string;

  @Column({ type: 'time', nullable: true })
  time_window_start: string | null;

  @Column({ type: 'time', nullable: true })
  time_window_end: string | null;

  @Column({ type: 'int', array: true, nullable: true })
  applicable_days_of_week: number[] | null;

  @Column({ type: 'uuid', array: true, nullable: true })
  target_grade_ids: string[] | null;

  @Column({ type: 'int', default: 3 })
  min_recommendations: number;

  @Column({ type: 'int', default: 10 })
  max_recommendations: number;

  @Column({ type: 'int', nullable: true })
  whole_price_tier: number | null;

  @Column({ type: 'uuid', array: true, nullable: true })
  applicable_location_ids: string[] | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 0 })
  display_order: number;

  @OneToMany(() => RecommendationTemplateItem, (item) => item.template)
  items: RecommendationTemplateItem[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
