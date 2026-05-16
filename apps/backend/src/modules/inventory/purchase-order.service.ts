import {
  Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { PurchaseOrder } from '../../common/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../common/entities/purchase-order-item.entity';
import { StockBatch } from '../../common/entities/stock-batch.entity';
import { StockMovement } from '../../common/entities/stock-movement.entity';
import {
  ListPurchaseOrdersQueryDto,
  CreatePurchaseOrderDto,
  CreatePurchaseOrderItemDto,
  UpdatePurchaseOrderDto,
  ReceivePurchaseOrderDto,
} from './dto/stock-engine.dto';

@Injectable()
export class PurchaseOrderService {
  constructor(
    @InjectRepository(PurchaseOrder) private poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem) private poItemRepo: Repository<PurchaseOrderItem>,
    @InjectRepository(StockBatch) private batchRepo: Repository<StockBatch>,
    @InjectRepository(StockMovement) private movementRepo: Repository<StockMovement>,
    private dataSource: DataSource,
  ) {}

  private async generatePoNumber(businessId: string, qr: QueryRunner): Promise<string> {
    const year = new Date().getFullYear();
    const [row] = await qr.query(
      `SELECT COUNT(*)::int AS cnt FROM purchase_orders WHERE business_id = $1 AND EXTRACT(YEAR FROM order_date) = $2`,
      [businessId, year],
    );
    return `PO-${year}-${String((row.cnt ?? 0) + 1).padStart(4, '0')}`;
  }

  private computeLineTotals(items: CreatePurchaseOrderItemDto[]) {
    let subtotalHt = 0, totalTva = 0, totalTtc = 0;
    const computed = items.map((item) => {
      const rate = item.tva_rate ?? 0;
      const lineHt = Math.round(item.quantity_ordered * item.unit_cost_ht * 100) / 100;
      const lineTva = Math.round(lineHt * rate / 100 * 100) / 100;
      const lineTtc = Math.round((lineHt + lineTva) * 100) / 100;
      subtotalHt += lineHt; totalTva += lineTva; totalTtc += lineTtc;
      return { ...item, line_total_ht: lineHt, line_total_tva: lineTva, line_total_ttc: lineTtc };
    });
    return {
      computed,
      subtotalHt: Math.round(subtotalHt * 100) / 100,
      totalTva: Math.round(totalTva * 100) / 100,
      totalTtc: Math.round(totalTtc * 100) / 100,
    };
  }

  // ── INV-070: List POs ───────────────────────────────────────────────────────

  async listPurchaseOrders(businessId: string, query: ListPurchaseOrdersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.poRepo
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.items', 'items')
      .where('po.business_id = :businessId', { businessId })
      .orderBy('po.order_date', 'DESC')
      .addOrderBy('po.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) qb.andWhere('po.status = :status', { status: query.status });
    if (query.vendor_id) qb.andWhere('po.vendor_id = :vendorId', { vendorId: query.vendor_id });
    if (query.warehouse_id) qb.andWhere('po.warehouse_id = :warehouseId', { warehouseId: query.warehouse_id });
    if (query.from_date) qb.andWhere('po.order_date >= :fromDate', { fromDate: query.from_date });
    if (query.to_date) qb.andWhere('po.order_date <= :toDate', { toDate: query.to_date });
    if (query.search) qb.andWhere('po.po_number ILIKE :search', { search: `%${query.search}%` });

    const [records, total] = await qb.getManyAndCount();
    return { records, total, page, limit };
  }

  // ── INV-071: Get PO ─────────────────────────────────────────────────────────

  async getPurchaseOrder(id: string, businessId: string) {
    const po = await this.poRepo.findOne({
      where: { id, business_id: businessId },
      relations: ['items', 'items.product'],
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  // ── INV-072: Create PO ──────────────────────────────────────────────────────

  async createPurchaseOrder(businessId: string, userId: string, dto: CreatePurchaseOrderDto) {
    const { computed, subtotalHt, totalTva, totalTtc } = this.computeLineTotals(dto.items);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const poNumber = await this.generatePoNumber(businessId, qr);
      const po = qr.manager.create(PurchaseOrder, {
        business_id: businessId,
        po_number: poNumber,
        vendor_id: dto.vendor_id ?? null,
        warehouse_id: dto.warehouse_id,
        status: 'draft',
        expected_delivery_date: dto.expected_delivery_date ?? null,
        subtotal_ht: subtotalHt,
        total_tva: totalTva,
        total_ttc: totalTtc,
        notes: dto.notes ?? null,
        created_by_user_id: userId,
      });
      const savedPo = await qr.manager.save(PurchaseOrder, po);

      const items = computed.map((item) =>
        qr.manager.create(PurchaseOrderItem, {
          purchase_order_id: savedPo.id,
          product_id: item.product_id,
          variant_id: item.variant_id ?? null,
          quantity_ordered: item.quantity_ordered,
          quantity_received: 0,
          unit_of_measure: item.unit_of_measure ?? 'unit',
          unit_cost_ht: item.unit_cost_ht,
          tva_rate: item.tva_rate ?? 0,
          line_total_ht: item.line_total_ht,
          line_total_tva: item.line_total_tva,
          line_total_ttc: item.line_total_ttc,
        }),
      );
      await qr.manager.save(PurchaseOrderItem, items);
      await qr.commitTransaction();

      return this.poRepo.findOne({ where: { id: savedPo.id }, relations: ['items'] });
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // ── INV-073: Update PO (draft only) ────────────────────────────────────────

  async updatePurchaseOrder(id: string, businessId: string, dto: UpdatePurchaseOrderDto) {
    const po = await this.poRepo.findOne({
      where: { id, business_id: businessId },
      relations: ['items'],
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== 'draft') throw new UnprocessableEntityException('Only draft purchase orders can be updated');

    if (dto.vendor_id !== undefined) po.vendor_id = dto.vendor_id ?? null;
    if (dto.warehouse_id !== undefined) po.warehouse_id = dto.warehouse_id;
    if (dto.expected_delivery_date !== undefined) po.expected_delivery_date = dto.expected_delivery_date ?? null;
    if (dto.notes !== undefined) po.notes = dto.notes ?? null;

    if (dto.items !== undefined) {
      const { computed, subtotalHt, totalTva, totalTtc } = this.computeLineTotals(dto.items);
      po.subtotal_ht = subtotalHt;
      po.total_tva = totalTva;
      po.total_ttc = totalTtc;

      const qr = this.dataSource.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        if (po.items?.length) await qr.manager.remove(PurchaseOrderItem, po.items);
        await qr.manager.save(PurchaseOrder, po);
        const newItems = computed.map((item) =>
          qr.manager.create(PurchaseOrderItem, {
            purchase_order_id: id,
            product_id: item.product_id,
            variant_id: item.variant_id ?? null,
            quantity_ordered: item.quantity_ordered,
            quantity_received: 0,
            unit_of_measure: item.unit_of_measure ?? 'unit',
            unit_cost_ht: item.unit_cost_ht,
            tva_rate: item.tva_rate ?? 0,
            line_total_ht: item.line_total_ht,
            line_total_tva: item.line_total_tva,
            line_total_ttc: item.line_total_ttc,
          }),
        );
        await qr.manager.save(PurchaseOrderItem, newItems);
        await qr.commitTransaction();
      } catch (err) {
        await qr.rollbackTransaction();
        throw err;
      } finally {
        await qr.release();
      }
    } else {
      await this.poRepo.save(po);
    }

    return this.poRepo.findOne({ where: { id }, relations: ['items'] });
  }

  // ── INV-074: Send PO ────────────────────────────────────────────────────────

  async sendPurchaseOrder(id: string, businessId: string, userId: string) {
    const po = await this.poRepo.findOne({ where: { id, business_id: businessId } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== 'draft') throw new UnprocessableEntityException('Only draft purchase orders can be sent');
    po.status = 'sent';
    po.approved_by_user_id = userId;
    await this.poRepo.save(po);
    console.log(`[STUB] PO ${po.po_number} email to vendor: ${po.vendor_id}`);
    return po;
  }

  // ── INV-075: Confirm PO ─────────────────────────────────────────────────────

  async confirmPurchaseOrder(id: string, businessId: string) {
    const po = await this.poRepo.findOne({ where: { id, business_id: businessId } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (!['sent', 'draft'].includes(po.status)) {
      throw new UnprocessableEntityException('Purchase order cannot be confirmed in its current status');
    }
    po.status = 'confirmed';
    return this.poRepo.save(po);
  }

  // ── INV-076: Receive PO items ───────────────────────────────────────────────

  async receivePurchaseOrder(id: string, businessId: string, userId: string, dto: ReceivePurchaseOrderDto) {
    const po = await this.poRepo.findOne({
      where: { id, business_id: businessId },
      relations: ['items'],
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status === 'cancelled' || po.status === 'received') {
      throw new UnprocessableEntityException('Cannot receive items on a cancelled or fully received purchase order');
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      for (const ri of dto.received_items) {
        const poItem = po.items.find((i) => i.id === ri.po_item_id);
        if (!poItem) throw new NotFoundException(`PO item ${ri.po_item_id} not found on this purchase order`);

        await qr.query(
          `UPDATE purchase_order_items SET quantity_received = quantity_received + $1, updated_at = now() WHERE id = $2`,
          [ri.quantity_received, poItem.id],
        );

        const batch = qr.manager.create(StockBatch, {
          business_id: businessId,
          warehouse_id: po.warehouse_id,
          product_id: poItem.product_id,
          variant_id: poItem.variant_id ?? null,
          batch_code: ri.batch_code,
          quantity_initial: ri.quantity_received,
          quantity_remaining: ri.quantity_received,
          unit_cost: poItem.unit_cost_ht,
          unit_cost_tva_rate: poItem.tva_rate,
          unit_of_measure: poItem.unit_of_measure,
          expires_at: ri.expires_at ? new Date(ri.expires_at) : null,
          vendor_id: po.vendor_id ?? null,
          purchase_order_id: po.id,
        });
        const savedBatch = await qr.manager.save(StockBatch, batch);

        const movement = qr.manager.create(StockMovement, {
          business_id: businessId,
          batch_id: savedBatch.id,
          movement_type: 'receive',
          quantity: ri.quantity_received,
          reference_type: 'purchase_order',
          reference_id: po.id,
          source_origin: 'realtime',
          performed_by_user_id: userId,
        });
        await qr.manager.save(StockMovement, movement);
      }

      // Reload items to determine new status
      const refreshedItems = await qr.query(
        `SELECT quantity_ordered, quantity_received FROM purchase_order_items WHERE purchase_order_id = $1`,
        [id],
      );
      const allReceived = refreshedItems.every(
        (i: any) => Number(i.quantity_received) >= Number(i.quantity_ordered),
      );
      const newStatus = allReceived ? 'received' : 'partially_received';
      await qr.query(
        `UPDATE purchase_orders SET status = $1, updated_at = now() WHERE id = $2`,
        [newStatus, id],
      );

      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }

    return this.poRepo.findOne({ where: { id }, relations: ['items'] });
  }

  // ── INV-077: Cancel PO ──────────────────────────────────────────────────────

  async cancelPurchaseOrder(id: string, businessId: string) {
    const po = await this.poRepo.findOne({
      where: { id, business_id: businessId },
      relations: ['items'],
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status === 'received') throw new UnprocessableEntityException('Cannot cancel a fully received purchase order');
    const anyReceived = po.items.some((i) => Number(i.quantity_received) > 0);
    if (anyReceived) throw new UnprocessableEntityException('Cannot cancel a purchase order with received items');
    po.status = 'cancelled';
    return this.poRepo.save(po);
  }
}
