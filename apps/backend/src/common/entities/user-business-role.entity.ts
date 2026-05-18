import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('user_business_roles')
export class UserBusinessRole {
  @PrimaryColumn({ type: 'uuid' })
  user_id: string;

  @PrimaryColumn({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'varchar', length: 20 })
  role: string;

  @Column({ type: 'uuid', nullable: true })
  granted_by_user_id: string | null;

  @CreateDateColumn()
  granted_at: Date;
}
