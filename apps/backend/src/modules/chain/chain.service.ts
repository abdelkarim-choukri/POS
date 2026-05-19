import { Injectable, NotFoundException, UnprocessableEntityException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { Business } from '../../common/entities/business.entity';
import { User } from '../../common/entities/user.entity';
import { UserBusinessRole } from '../../common/entities/user-business-role.entity';
import { ChainSyncConfig } from '../../common/entities/chain-sync-config.entity';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { SyncConfigDto, ChainTransactionsQueryDto } from './dto/chain.dto';

export const CHAIN_SYNC_QUEUE = 'chain-sync';

@Injectable()
export class ChainService {
  constructor(
    @InjectRepository(Business) private bizRepo: Repository<Business>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(UserBusinessRole) private ubrRepo: Repository<UserBusinessRole>,
    @InjectRepository(ChainSyncConfig) private syncConfigRepo: Repository<ChainSyncConfig>,
    @InjectRepository(AuditLog) private auditLogRepo: Repository<AuditLog>,
    private dataSource: DataSource,
    private jwtService: JwtService,
    @InjectQueue(CHAIN_SYNC_QUEUE) private syncQueue: Queue,
  ) {}

  // ── CHN-001 ───────────────────────────────────────────────────────────────
  async getChainTree() {
    const parents = await this.dataSource.query(
      `SELECT b.id, b.name, b.chain_role, b.is_active,
              (SELECT COUNT(*) FROM locations WHERE business_id = b.id)::int AS location_count
       FROM businesses b WHERE b.chain_role = 'parent' ORDER BY b.name`,
    );
    for (const parent of parents) {
      parent.children = await this.dataSource.query(
        `SELECT b.id, b.name, b.chain_role, b.is_active,
                (SELECT COUNT(*) FROM locations WHERE business_id = b.id)::int AS location_count
         FROM businesses b WHERE b.parent_business_id = $1 ORDER BY b.name`,
        [parent.id],
      );
    }
    return parents;
  }

  // ── CHN-002 ───────────────────────────────────────────────────────────────
  async promoteToParent(businessId: string) {
    const biz = await this.bizRepo.findOne({ where: { id: businessId } });
    if (!biz) throw new NotFoundException({ error: 'CHN_BUSINESS_NOT_FOUND', message: 'Business not found' });
    if (biz.chain_role === 'child') throw new UnprocessableEntityException({ error: 'CHN_CANNOT_PROMOTE_CHILD', message: 'A child business cannot be promoted to parent' });
    biz.chain_role = 'parent';
    return this.bizRepo.save(biz);
  }

  // ── CHN-003 ───────────────────────────────────────────────────────────────
  async linkChild(childId: string, parentId: string) {
    if (childId === parentId) throw new UnprocessableEntityException({ error: 'CHN_SELF_PARENT', message: 'A business cannot be its own parent' });
    const child = await this.bizRepo.findOne({ where: { id: childId } });
    if (!child) throw new NotFoundException({ error: 'CHN_BUSINESS_NOT_FOUND', message: 'Child business not found' });
    const parent = await this.bizRepo.findOne({ where: { id: parentId } });
    if (!parent) throw new NotFoundException({ error: 'CHN_PARENT_NOT_FOUND', message: 'Parent business not found' });
    if (parent.chain_role !== 'parent') throw new UnprocessableEntityException({ error: 'CHN_NOT_PARENT', message: 'Target business is not a chain parent — promote it first' });
    child.parent_business_id = parentId;
    child.chain_role = 'child';
    return this.bizRepo.save(child);
  }

  // ── CHN-004 ───────────────────────────────────────────────────────────────
  async unlinkChild(childId: string) {
    const child = await this.bizRepo.findOne({ where: { id: childId } });
    if (!child) throw new NotFoundException({ error: 'CHN_BUSINESS_NOT_FOUND', message: 'Business not found' });
    child.parent_business_id = null;
    child.chain_role = 'standalone';
    return this.bizRepo.save(child);
  }

  // ── CHN-010 ───────────────────────────────────────────────────────────────
  async getAccessibleBusinesses(userId: string) {
    return this.dataSource.query(
      `SELECT ubr.business_id, b.name, ubr.role
       FROM user_business_roles ubr
       JOIN businesses b ON b.id = ubr.business_id
       WHERE ubr.user_id = $1
       ORDER BY b.name`,
      [userId],
    );
  }

  // ── CHN-011 ───────────────────────────────────────────────────────────────
  async switchBusiness(userId: string, targetBusinessId: string, callerRole?: string) {
    if (callerRole !== 'super_admin') {
      const [{ has_access }] = await this.dataSource.query(
        `SELECT (
           EXISTS(SELECT 1 FROM user_business_roles WHERE user_id = $1 AND business_id = $2)
           OR
           EXISTS(SELECT 1 FROM users WHERE id = $1 AND business_id = $2)
         )::boolean AS has_access`,
        [userId, targetBusinessId],
      );
      if (!has_access) throw new ForbiddenException({ error: 'CHN_ACCESS_DENIED', message: 'You do not have access to this business' });
    }

    const [roleRow] = await this.dataSource.query(
      `SELECT COALESCE(ubr.role, u.role::text) AS role
       FROM users u
       LEFT JOIN user_business_roles ubr ON ubr.user_id = u.id AND ubr.business_id = $2
       WHERE u.id = $1`,
      [userId, targetBusinessId],
    );

    const payload = { sub: userId, business_id: targetBusinessId, role: roleRow.role, type: 'user' };
    return { access_token: this.jwtService.sign(payload) };
  }

  // ── CHN-012 ───────────────────────────────────────────────────────────────
  async grantBusinessAccess(
    targetUserId: string,
    grantingBusinessId: string,
    businessIds: string[],
    rolePerBusiness: Record<string, string>,
    grantedByUserId?: string,
  ) {
    const user = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException({ error: 'CHN_USER_NOT_FOUND', message: 'User not found' });

    if (businessIds.length > 0) {
      const [{ cnt }] = await this.dataSource.query(
        `SELECT COUNT(*)::int AS cnt FROM businesses
         WHERE id = ANY($1::uuid[]) AND (parent_business_id = $2 OR id = $2)`,
        [businessIds, grantingBusinessId],
      );
      if (cnt !== businessIds.length) throw new UnprocessableEntityException({ error: 'CHN_NOT_IN_CHAIN', message: 'One or more businesses are not children of this chain' });
    }

    await this.ubrRepo.upsert(
      businessIds.map((bizId) => ({
        user_id: targetUserId,
        business_id: bizId,
        role: rolePerBusiness[bizId] ?? 'employee',
        granted_by_user_id: grantedByUserId ?? null,
      })),
      { conflictPaths: ['user_id', 'business_id'] },
    );

    const existing = new Set(user.accessible_business_ids);
    businessIds.forEach((id) => existing.add(id));
    user.accessible_business_ids = Array.from(existing);
    return this.userRepo.save(user);
  }

  // ── CHN-020 ───────────────────────────────────────────────────────────────
  async setSyncConfig(parentBusinessId: string, dto: SyncConfigDto) {
    await this.syncConfigRepo.upsert(
      { parent_business_id: parentBusinessId, ...dto },
      { conflictPaths: ['parent_business_id'] },
    );
    return this.syncConfigRepo.findOne({ where: { parent_business_id: parentBusinessId } });
  }

  async getSyncConfig(parentBusinessId: string) {
    return this.syncConfigRepo.findOne({ where: { parent_business_id: parentBusinessId } });
  }

  // ── CHN-021 ───────────────────────────────────────────────────────────────
  async triggerSync(parentBusinessId: string, dto: { child_business_ids: string[]; sync_what: string[] }) {
    const jobId = randomUUID();
    await this.dataSource.query(
      `INSERT INTO background_jobs (id, business_id, job_type, status, created_at)
       VALUES ($1, $2, 'chain_sync', 'pending', NOW())`,
      [jobId, parentBusinessId],
    );
    await this.syncQueue.add('sync', {
      parentBusinessId,
      childBusinessIds: dto.child_business_ids,
      syncWhat: dto.sync_what,
      jobId,
    });
    return { job_id: jobId };
  }

  // ── CHN-022 ───────────────────────────────────────────────────────────────
  async getSyncJobStatus(jobId: string, businessId: string) {
    const [job] = await this.dataSource.query(
      `SELECT * FROM background_jobs WHERE id = $1 AND business_id = $2`,
      [jobId, businessId],
    );
    if (!job) throw new NotFoundException({ error: 'CHN_SYNC_JOB_NOT_FOUND', message: 'Sync job not found' });
    return job;
  }

  // ── CHN-023 ───────────────────────────────────────────────────────────────
  async getUnmappedProducts(childBusinessId: string) {
    const child = await this.bizRepo.findOne({ where: { id: childBusinessId } });
    if (!child || !child.parent_business_id) throw new UnprocessableEntityException({ error: 'CHN_NO_PARENT', message: 'Business has no parent' });

    return this.dataSource.query(
      `SELECT p.id, p.name, p.sku, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.business_id = $1
         AND p.is_active = true
         AND NOT EXISTS (
           SELECT 1 FROM products cp
           WHERE cp.business_id = $2 AND cp.synced_from_parent_id = p.id
         )`,
      [child.parent_business_id, childBusinessId],
    );
  }

  // ── CHN-024 ───────────────────────────────────────────────────────────────
  async pullProduct(childBusinessId: string, parentProductId: string) {
    const child = await this.bizRepo.findOne({ where: { id: childBusinessId } });
    if (!child || !child.parent_business_id) throw new UnprocessableEntityException({ error: 'CHN_NO_PARENT', message: 'Business has no parent' });

    const [parentProduct] = await this.dataSource.query(
      `SELECT p.*, c.name AS category_name, c.sort_order AS category_sort_order,
              c.default_tva_rate AS category_tva_rate
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1 AND p.business_id = $2`,
      [parentProductId, child.parent_business_id],
    );
    if (!parentProduct) throw new NotFoundException({ error: 'CHN_PRODUCT_NOT_FOUND', message: 'Product not found in parent catalogue' });

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const [existingCat] = await qr.query(
        `SELECT id FROM categories WHERE business_id = $1 AND synced_from_parent_id = $2`,
        [childBusinessId, parentProduct.category_id],
      );
      let childCatId: string;
      if (existingCat) {
        childCatId = existingCat.id;
      } else {
        const [newCat] = await qr.query(
          `INSERT INTO categories (id, business_id, name, sort_order, is_active, default_tva_rate, synced_from_parent_id)
           VALUES (gen_random_uuid(), $1, $2, $3, true, $4, $5) RETURNING id`,
          [childBusinessId, parentProduct.category_name, parentProduct.category_sort_order, parentProduct.category_tva_rate, parentProduct.category_id],
        );
        childCatId = newCat.id;
      }

      const [childProd] = await qr.query(
        `INSERT INTO products (id, business_id, category_id, name, description, price, sku, image_url,
                               is_active, sort_order, tva_rate, tva_exempt, synced_from_parent_id)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, true, $8, NULL, false, $9)
         ON CONFLICT (business_id, synced_from_parent_id) DO UPDATE
           SET name = EXCLUDED.name, description = EXCLUDED.description,
               price = EXCLUDED.price, sku = EXCLUDED.sku, sort_order = EXCLUDED.sort_order
         RETURNING id`,
        [childBusinessId, childCatId, parentProduct.name, parentProduct.description,
         parentProduct.price, parentProduct.sku, parentProduct.image_url,
         parentProduct.sort_order, parentProductId],
      );

      const variants = await qr.query(
        `SELECT * FROM product_variants WHERE product_id = $1`,
        [parentProductId],
      );
      for (const v of variants) {
        await qr.query(
          `INSERT INTO product_variants (id, product_id, name, price_override, sku, is_active, synced_from_parent_id)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, true, $5)
           ON CONFLICT (product_id, synced_from_parent_id) DO UPDATE
             SET name = EXCLUDED.name, price_override = EXCLUDED.price_override, sku = EXCLUDED.sku`,
          [childProd.id, v.name, v.price_override, v.sku, v.id],
        );
      }

      await qr.commitTransaction();
      return { product_id: childProd.id };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // ── CHN-030 ───────────────────────────────────────────────────────────────
  async rolloutPromotion(
    parentBusinessId: string,
    promotionId: string,
    childBusinessIds: string[],
    skipValidation: boolean,
  ) {
    const [promo] = await this.dataSource.query(
      `SELECT * FROM promotions WHERE id = $1 AND business_id = $2`,
      [promotionId, parentBusinessId],
    );
    if (!promo) throw new NotFoundException({ error: 'PROM_NOT_FOUND', message: 'Promotion not found' });

    const results: Array<{ child_business_id: string; promotion_id: string; tva_warnings: any[] }> = [];

    for (const childId of childBusinessIds) {
      const tva_warnings = (skipValidation ?? false) ? [] : await this._getTvaMismatchWarnings(childId);

      const [newPromo] = await this.dataSource.query(
        `INSERT INTO promotions (id, business_id, name, type, discount_value, discount_type,
                                 min_order_amount, max_uses, is_active, start_date, end_date,
                                 conditions, synced_from_parent_id)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [childId, promo.name, promo.type, promo.discount_value, promo.discount_type,
         promo.min_order_amount, promo.max_uses, false, promo.start_date, promo.end_date,
         promo.conditions, promotionId],
      );

      results.push({ child_business_id: childId, promotion_id: newPromo.id, tva_warnings });
    }

    return results;
  }

  // ── PROM-040 ──────────────────────────────────────────────────────────────
  async validateSubStores(parentBusinessId: string, promotionId: string, childBusinessIds: string[]) {
    const [promo] = await this.dataSource.query(
      `SELECT * FROM promotions WHERE id = $1 AND business_id = $2`,
      [promotionId, parentBusinessId],
    );
    if (!promo) throw new NotFoundException({ error: 'PROM_NOT_FOUND', message: 'Promotion not found' });

    const results = [];
    for (const childId of childBusinessIds) {
      const tva_warnings = await this._getTvaMismatchWarnings(childId);
      const [childBiz] = await this.dataSource.query(
        `SELECT id FROM businesses WHERE id = $1 AND parent_business_id = $2`,
        [childId, parentBusinessId],
      );
      results.push({
        child_business_id: childId,
        is_linked_child: !!childBiz,
        tva_warnings,
        can_rollout: !!childBiz && tva_warnings.length === 0,
      });
    }
    return results;
  }

  private async _getTvaMismatchWarnings(childBusinessId: string) {
    return this.dataSource.query(
      `SELECT p.id, p.name, p.synced_from_parent_id
       FROM products p
       WHERE p.business_id = $1 AND p.synced_from_parent_id IS NOT NULL AND p.tva_rate IS NULL`,
      [childBusinessId],
    );
  }

  // ── CHN-040 ───────────────────────────────────────────────────────────────
  async getChainDashboard(parentBusinessId: string, fromDate: string, toDate: string) {
    const children = await this.dataSource.query(
      `SELECT
         b.id AS business_id, b.name,
         COALESCE(SUM(t.total), 0) AS revenue,
         COUNT(t.id)::int AS transaction_count,
         COUNT(DISTINCT t.customer_id)::int AS customer_count
       FROM businesses b
       LEFT JOIN transactions t
         ON t.business_id = b.id
         AND t.status = 'completed'
         AND DATE(t.created_at) BETWEEN $2 AND $3
       WHERE b.parent_business_id = $1
       GROUP BY b.id, b.name
       ORDER BY b.name`,
      [parentBusinessId, fromDate, toDate],
    );

    const totals = {
      revenue: children.reduce((s: number, c: any) => s + Number(c.revenue), 0),
      transaction_count: children.reduce((s: number, c: any) => s + c.transaction_count, 0),
      customer_count: children.reduce((s: number, c: any) => s + c.customer_count, 0),
    };

    return { children, totals };
  }

  // ── CHN-041 ───────────────────────────────────────────────────────────────
  async getChainTransactions(parentBusinessId: string, query: ChainTransactionsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    let sql = `
      SELECT t.id, t.business_id, b.name AS business_name, t.total, t.status, t.created_at
      FROM transactions t
      JOIN businesses b ON b.id = t.business_id
      WHERE b.parent_business_id = $1
    `;
    const params: any[] = [parentBusinessId];
    let idx = 2;

    if (query.child_business_id) { sql += ` AND t.business_id = $${idx}`; params.push(query.child_business_id); idx++; }
    if (query.from_date) { sql += ` AND DATE(t.created_at) >= $${idx}`; params.push(query.from_date); idx++; }
    if (query.to_date) { sql += ` AND DATE(t.created_at) <= $${idx}`; params.push(query.to_date); idx++; }

    const [{ cnt }] = await this.dataSource.query(`SELECT COUNT(*) AS cnt FROM (${sql}) sub`, params);
    const total = Number(cnt);

    sql += ` ORDER BY t.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, (page - 1) * limit);

    const records = await this.dataSource.query(sql, params);
    return { records, total, page, limit };
  }

  // ── CHN-050 ───────────────────────────────────────────────────────────────
  async getParentVendorInfo(childBusinessId: string) {
    const child = await this.bizRepo.findOne({ where: { id: childBusinessId } });
    if (!child) throw new NotFoundException({ error: 'CHN_BUSINESS_NOT_FOUND', message: 'Business not found' });
    if (!child.parent_business_id) throw new UnprocessableEntityException({ error: 'CHN_NO_PARENT', message: 'This business has no parent' });

    const parent = await this.bizRepo.findOne({ where: { id: child.parent_business_id } });
    if (!parent) throw new NotFoundException({ error: 'CHN_PARENT_NOT_FOUND', message: 'Parent business not found' });

    return {
      parent_business_id: parent.id,
      parent_name: parent.name,
      ice: parent.ice_number,
      if_number: parent.if_number,
      address: parent.address,
    };
  }

  // ── CHN-051 ───────────────────────────────────────────────────────────────
  async getIncomingPoRequests(parentBusinessId: string) {
    return this.dataSource.query(
      `SELECT po.*, b.name AS child_business_name
       FROM purchase_orders po
       JOIN businesses b ON b.id = po.business_id
       WHERE b.parent_business_id = $1
         AND po.status NOT IN ('draft', 'cancelled')
       ORDER BY po.created_at DESC`,
      [parentBusinessId],
    );
  }

  // ── CHN-052 ───────────────────────────────────────────────────────────────
  async fulfillChildPo(parentBusinessId: string, poId: string, sourceWarehouseId: string, performedBy: string) {
    const [po] = await this.dataSource.query(
      `SELECT po.*, b.id AS child_biz_id
       FROM purchase_orders po
       JOIN businesses b ON b.id = po.business_id
       WHERE po.id = $1 AND b.parent_business_id = $2
         AND po.status IN ('confirmed', 'sent', 'partially_received')`,
      [poId, parentBusinessId],
    );
    if (!po) throw new NotFoundException({ error: 'CHN_PO_NOT_FOUND', message: 'Purchase order not found or not accessible' });

    const poItems = await this.dataSource.query(
      `SELECT * FROM purchase_order_items WHERE purchase_order_id = $1`,
      [poId],
    );

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      for (const item of poItems) {
        const qty = item.quantity_ordered;
        let remaining = qty;

        while (remaining > 0) {
          const [sourceBatch] = await qr.query(
            `SELECT id, quantity_remaining FROM stock_batches
             WHERE business_id = $1 AND warehouse_id = $2 AND product_id = $3
               AND is_active = true AND quantity_remaining > 0
             ORDER BY expires_at ASC NULLS LAST, received_at ASC
             LIMIT 1 FOR UPDATE`,
            [parentBusinessId, sourceWarehouseId, item.product_id],
          );
          if (!sourceBatch) break;

          const deduct = Math.min(remaining, sourceBatch.quantity_remaining);
          await qr.query(
            `UPDATE stock_batches SET quantity_remaining = quantity_remaining - $1 WHERE id = $2`,
            [deduct, sourceBatch.id],
          );
          await qr.query(
            `INSERT INTO stock_movements (id, business_id, batch_id, movement_type, quantity, reference_type, reference_id, source_origin)
             VALUES (gen_random_uuid(), $1, $2, 'transfer_out', $3, 'chain_po', $4, 'chain_fulfillment')`,
            [parentBusinessId, sourceBatch.id, deduct, poId],
          );
          remaining -= deduct;
        }

        const actualQty = qty - remaining;
        if (actualQty > 0) {
          const [childBatch] = await qr.query(
            `INSERT INTO stock_batches (id, business_id, warehouse_id, product_id, batch_code, quantity_initial,
                                        quantity_remaining, unit_cost, received_at, is_active, purchase_order_id)
             SELECT gen_random_uuid(), $1,
                    (SELECT id FROM warehouses WHERE business_id = $1 ORDER BY created_at ASC LIMIT 1),
                    $2, $3, $4, $4, $5, NOW(), true, $6
             RETURNING id`,
            [po.child_biz_id, item.product_id, `CHAIN-${poId.slice(0, 8)}`, actualQty, item.unit_cost_ht, poId],
          );
          if (childBatch) {
            await qr.query(
              `INSERT INTO stock_movements (id, business_id, batch_id, movement_type, quantity, reference_type, reference_id, source_origin)
               VALUES (gen_random_uuid(), $1, $2, 'receive', $3, 'chain_po', $4, 'chain_fulfillment')`,
              [po.child_biz_id, childBatch.id, actualQty, poId],
            );
          }
        }
      }

      await qr.query(
        `UPDATE purchase_orders SET status = 'received' WHERE id = $1`,
        [poId],
      );

      await qr.commitTransaction();
      await this.auditLogRepo.save(this.auditLogRepo.create({
        business_id: parentBusinessId,
        user_id: performedBy,
        action: 'fulfill',
        entity_type: 'purchase_order',
        entity_id: poId,
        details_json: { source_warehouse_id: sourceWarehouseId },
      }));
      return { fulfilled: true, po_id: poId };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }
}
