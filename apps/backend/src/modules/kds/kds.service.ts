import {
  Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import { Transaction } from '../../common/entities/transaction.entity';
import { TableSessionItem } from '../../common/entities/table-session-item.entity';
import { KdsGateway } from './kds.gateway';
import { EventGateway } from '../../common/gateways/event.gateway';
import { GetKdsItemsDto } from './dto';

// Valid kds_status forward transitions
const KDS_TRANSITIONS: Record<string, string> = {
  new: 'preparing',
  preparing: 'ready',
  ready: 'served',
};

@Injectable()
export class KdsService {
  constructor(
    @InjectRepository(Transaction)
    private txnRepo: Repository<Transaction>,
    @InjectRepository(TableSessionItem)
    private tableSessionItemRepo: Repository<TableSessionItem>,
    private kdsGateway: KdsGateway,
    private eventGateway: EventGateway,
  ) {}

  // ── Existing endpoints (backward compat — DO NOT remove) ──────────────────

  async getActiveOrders(locationId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return this.txnRepo.find({
      where: {
        location_id: locationId,
        order_status: In(['new', 'preparing', 'ready']),
        created_at: MoreThan(startOfDay),
        status: 'completed' as any,
      },
      relations: ['items', 'user'],
      order: { created_at: 'ASC' },
    });
  }

  async updateOrderStatus(orderId: string, newStatus: string) {
    const order = await this.txnRepo.findOne({
      where: { id: orderId },
      relations: ['items', 'user'],
    });
    if (!order) throw new NotFoundException({ error: 'KDS_ORDER_NOT_FOUND', message: 'Order not found' });

    order.order_status = newStatus;
    const saved = await this.txnRepo.save(order);

    this.kdsGateway.emitOrderUpdate(order.location_id, order.id, newStatus);

    return saved;
  }

  async notifyNewOrder(transaction: Transaction) {
    const full = await this.txnRepo.findOne({
      where: { id: transaction.id },
      relations: ['items', 'user'],
    });
    if (full) {
      this.kdsGateway.emitNewOrder(full.location_id, full);
    }
  }

  // ── RST-MOD-001: New KDS items endpoint (table sessions + direct txns) ────

  async getKdsItems(businessId: string, query: GetKdsItemsDto) {
    // Source 1: table_session_items
    const tsiQb = this.tableSessionItemRepo
      .createQueryBuilder('tsi')
      .select('tsi.id', 'id')
      .addSelect('tbl.table_number', 'table_number')
      .addSelect('tsi.table_session_id', 'table_session_id')
      .addSelect('p.name', 'product_name')
      .addSelect('pv.name', 'variant_name')
      .addSelect('tsi.quantity', 'quantity')
      .addSelect('tsi.notes', 'notes')
      .addSelect('tsi.modifiers_json', 'modifiers_json')
      .addSelect('tsi.kds_status', 'kds_status')
      .addSelect('tsi.added_at', 'added_at')
      .addSelect("TRIM(CONCAT(u.first_name, ' ', u.last_name))", 'added_by')
      .innerJoin('tsi.table_session', 'ts')
      .innerJoin('ts.table', 'tbl')
      .innerJoin('tsi.product', 'p')
      .leftJoin('tsi.variant', 'pv')
      .leftJoin('tsi.added_by_user', 'u')
      .where('tsi.business_id = :businessId', { businessId })
      .andWhere("tsi.kds_status IN ('new', 'preparing', 'ready')")
      .orderBy('tsi.added_at', 'ASC');

    if (query.location_id) {
      tsiQb.andWhere('tbl.location_id = :locationId', { locationId: query.location_id });
    }
    if (query.status) {
      tsiQb.andWhere('tsi.kds_status = :status', { status: query.status });
    }

    const tableItems = await tsiQb.getRawMany();

    // Source 2: direct transaction items (non-table POS / takeaway — backward compat)
    const txnQb = this.txnRepo
      .createQueryBuilder('txn')
      .select('ti.id', 'id')
      .addSelect('ti.product_name', 'product_name')
      .addSelect('ti.variant_name', 'variant_name')
      .addSelect('ti.quantity', 'quantity')
      .addSelect('ti.modifiers_json', 'modifiers_json')
      .addSelect('txn.order_status', 'kds_status')
      .addSelect('ti.created_at', 'added_at')
      .addSelect("TRIM(CONCAT(u.first_name, ' ', u.last_name))", 'added_by')
      .innerJoin('txn.items', 'ti')
      .leftJoin('txn.user', 'u')
      .where('txn.business_id = :businessId', { businessId })
      .andWhere("txn.order_status IN ('new', 'preparing', 'ready')")
      .orderBy('ti.created_at', 'ASC');

    if (query.location_id) {
      txnQb.andWhere('txn.location_id = :locationId', { locationId: query.location_id });
    }
    if (query.status) {
      txnQb.andWhere('txn.order_status = :status', { status: query.status });
    }

    const directItems = await txnQb.getRawMany();

    const mapped = [
      ...tableItems.map((r) => ({
        id: r.id,
        table_number: r.table_number ?? null,
        table_session_id: r.table_session_id ?? null,
        product_name: r.product_name ?? null,
        variant_name: r.variant_name ?? null,
        quantity: Number(r.quantity),
        notes: r.notes ?? null,
        modifiers_json: r.modifiers_json ?? {},
        kds_status: r.kds_status,
        added_at: r.added_at,
        added_by: r.added_by ?? null,
        order_source: 'table_session',
      })),
      ...directItems.map((r) => ({
        id: r.id,
        table_number: null,
        table_session_id: null,
        product_name: r.product_name ?? null,
        variant_name: r.variant_name ?? null,
        quantity: Number(r.quantity),
        notes: null,
        modifiers_json: r.modifiers_json ?? {},
        kds_status: r.kds_status,
        added_at: r.added_at,
        added_by: r.added_by ?? null,
        order_source: 'direct_transaction',
      })),
    ].sort((a, b) => new Date(a.added_at).getTime() - new Date(b.added_at).getTime());

    return { items: mapped };
  }

  async updateItemStatus(businessId: string, itemId: string, newStatus: string) {
    const item = await this.tableSessionItemRepo.findOne({
      where: { id: itemId, business_id: businessId },
      relations: ['table_session', 'table_session.table'],
    });
    if (!item) throw new NotFoundException({ error: 'KDS_ITEM_NOT_FOUND', message: 'KDS item not found' });

    const allowedNext = KDS_TRANSITIONS[item.kds_status];
    if (allowedNext !== newStatus) {
      throw new UnprocessableEntityException({
        error: 'RST_INVALID_KDS_TRANSITION',
        message: `Invalid transition: ${item.kds_status} → ${newStatus}. Expected: ${allowedNext ?? 'none'}`,
      });
    }

    const oldStatus = item.kds_status;
    item.kds_status = newStatus;
    const saved = await this.tableSessionItemRepo.save(item);

    const tableNumber = item.table_session?.table?.table_number ?? null;

    this.eventGateway.emitToRoom(`kds:${businessId}`, 'kds:item_status_changed', {
      item_id: itemId,
      session_id: item.table_session_id,
      table_number: tableNumber,
      old_status: oldStatus,
      new_status: newStatus,
    });

    if (newStatus === 'ready') {
      this.eventGateway.emitToRoom(`floor:${businessId}`, 'floor:item_ready', {
        item_id: itemId,
        session_id: item.table_session_id,
        table_number: tableNumber,
      });
    }

    const locationId = item.table_session?.location_id;
    if (locationId) {
      this.eventGateway.emitToRoom(`oss:${locationId}`, 'oss:order_updated', {
        location_id: locationId,
      });
    }

    return saved;
  }
}
