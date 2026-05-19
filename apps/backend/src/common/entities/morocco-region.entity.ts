import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';

@Entity('morocco_regions')
export class MoroccoRegion {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  parent_id: string | null;

  @ManyToOne(() => MoroccoRegion, (r) => r.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: MoroccoRegion | null;

  @OneToMany(() => MoroccoRegion, (r) => r.parent)
  children: MoroccoRegion[];

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 20 })
  level: string;

  @Column({ type: 'int', default: 0 })
  sort_order: number;
}
