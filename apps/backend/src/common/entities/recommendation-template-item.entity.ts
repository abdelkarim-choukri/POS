import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn,
} from 'typeorm';
import { RecommendationTemplate } from './recommendation-template.entity';

@Entity('recommendation_template_items')
export class RecommendationTemplateItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  template_id: string;

  @ManyToOne(() => RecommendationTemplate, (t) => t.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: RecommendationTemplate;

  @Column({ type: 'uuid' })
  product_id: string;

  @Column({ type: 'uuid', nullable: true })
  variant_id: string | null;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;
}
