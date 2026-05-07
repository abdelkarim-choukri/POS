import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { PointsExchangeRule } from './points-exchange-rule.entity';
import { CouponType } from './coupon-type.entity';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';

@Entity('points_exchange_rule_details')
export class PointsExchangeRuleDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  rule_id: string;

  @ManyToOne(() => PointsExchangeRule, (r) => r.details, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rule_id' })
  rule: PointsExchangeRule;

  @Column({ type: 'uuid', nullable: true })
  coupon_type_id: string;

  @ManyToOne(() => CouponType, { nullable: true })
  @JoinColumn({ name: 'coupon_type_id' })
  coupon_type: CouponType;

  @Column({ type: 'uuid', nullable: true })
  product_id: string;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'uuid', nullable: true })
  variant_id: string;

  @ManyToOne(() => ProductVariant, { nullable: true })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;

  @Column({ type: 'int', default: 1 })
  quantity_per_redemption: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  discount_amount_mad: number;
}
