import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('couriers')
export class Courier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo_url: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  api_endpoint: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  tracking_url_template: string | null;

  @Column({ type: 'boolean', default: false })
  supports_cash_on_delivery: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
