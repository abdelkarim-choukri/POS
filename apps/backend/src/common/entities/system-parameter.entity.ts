import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('system_parameters')
export class SystemParameter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  key: string;

  @Column({ type: 'varchar', length: 40 })
  param_type: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: false })
  is_overridable_per_business: boolean;
}
