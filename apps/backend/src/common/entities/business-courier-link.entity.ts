import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Courier } from './courier.entity';

@Entity('business_courier_links')
export class BusinessCourierLink {
  @PrimaryColumn({ type: 'uuid' })
  business_id: string;

  @PrimaryColumn({ type: 'uuid' })
  courier_id: string;

  @ManyToOne(() => Courier)
  @JoinColumn({ name: 'courier_id' })
  courier: Courier;

  @Column({ type: 'jsonb', nullable: true })
  account_credentials_json: Record<string, any> | null;

  @Column({ type: 'boolean', default: false })
  is_default: boolean;
}
