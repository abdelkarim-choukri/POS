import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Business } from './business.entity';
import { Location } from './location.entity';
import { DiningArea } from './dining-area.entity';
import { TableType } from './table-type.entity';

@Entity('tables')
export class RestaurantTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'uuid' })
  location_id: string;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ type: 'uuid' })
  area_id: string;

  @ManyToOne(() => DiningArea)
  @JoinColumn({ name: 'area_id' })
  area: DiningArea;

  @Column({ type: 'uuid', nullable: true })
  table_type_id: string | null;

  @ManyToOne(() => TableType, { nullable: true })
  @JoinColumn({ name: 'table_type_id' })
  table_type: TableType | null;

  @Column({ type: 'varchar', length: 20 })
  table_number: string;

  @Column({ type: 'int', default: 4 })
  capacity: number;

  @Column({ type: 'int', nullable: true })
  position_x: number | null;

  @Column({ type: 'int', nullable: true })
  position_y: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  qr_code: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
