import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { CHAIN_SYNC_QUEUE } from './chain.service';

@Processor(CHAIN_SYNC_QUEUE)
export class ChainSyncProcessor extends WorkerHost {
  constructor(private ds: DataSource) {
    super();
  }

  async process(job: Job) {
    const { parentBusinessId, childBusinessIds, syncWhat, jobId } = job.data;
    let itemsSynced = 0;
    const errors: string[] = [];

    for (const childId of childBusinessIds) {
      try {
        if (syncWhat.includes('categories')) {
          const cats = await this.ds.query(
            `SELECT * FROM categories WHERE business_id = $1 AND is_active = true`, [parentBusinessId],
          );
          for (const cat of cats) {
            await this.ds.query(
              `INSERT INTO categories (id, business_id, name, sort_order, is_active, default_tva_rate, synced_from_parent_id)
               VALUES (gen_random_uuid(), $1, $2, $3, true, $4, $5)
               ON CONFLICT (business_id, synced_from_parent_id) DO UPDATE
                 SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order`,
              [childId, cat.name, cat.sort_order, cat.default_tva_rate, cat.id],
            );
            itemsSynced++;
          }
        }

        if (syncWhat.includes('products')) {
          const products = await this.ds.query(
            `SELECT p.*, (SELECT id FROM categories WHERE business_id = $2 AND synced_from_parent_id = p.category_id) AS child_cat_id
             FROM products p WHERE p.business_id = $1 AND p.is_active = true`,
            [parentBusinessId, childId],
          );
          for (const prod of products) {
            if (!prod.child_cat_id) continue;
            await this.ds.query(
              `INSERT INTO products (id, business_id, category_id, name, description, price, sku,
                                    is_active, sort_order, tva_rate, tva_exempt, synced_from_parent_id)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, $7, NULL, false, $8)
               ON CONFLICT (business_id, synced_from_parent_id) DO UPDATE
                 SET name = EXCLUDED.name, price = EXCLUDED.price, sort_order = EXCLUDED.sort_order`,
              [childId, prod.child_cat_id, prod.name, prod.description, prod.price,
               prod.sku, prod.sort_order, prod.id],
            );
            itemsSynced++;
          }
        }
      } catch (err: any) {
        errors.push(`child ${childId}: ${err.message}`);
      }
    }

    const unhandled = syncWhat.filter((w: string) => !['categories', 'products'].includes(w));
    if (unhandled.length > 0) {
      console.warn(`[CHAIN] ChainSyncProcessor: sync_what values not yet implemented: ${unhandled.join(', ')}`);
    }

    await this.ds.query(
      `UPDATE background_jobs SET status = $1, result_json = $2 WHERE id = $3`,
      [errors.length ? 'completed_with_errors' : 'completed',
       JSON.stringify({ items_synced: itemsSynced, errors }), jobId],
    );
  }
}
