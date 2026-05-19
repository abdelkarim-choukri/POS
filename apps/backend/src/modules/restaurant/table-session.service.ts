import {
  Injectable, NotFoundException, ConflictException,
  UnprocessableEntityException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TableSession } from '../../common/entities/table-session.entity';
import { TableSessionItem } from '../../common/entities/table-session-item.entity';
import { RestaurantTable } from '../../common/entities/table.entity';
import { Product } from '../../common/entities/product.entity';
import { ProductVariant } from '../../common/entities/product-variant.entity';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { EventGateway } from '../../common/gateways/event.gateway';
import { userHasPermission } from '../../common/utils/permissions';
import { UserRole } from '../../common/enums';
import {
  FloorPlanQueryDto, OpenTableDto, AddItemsDto,
  ModifyItemDto, TransferItemsDto, CancelSessionDto,
} from './dto/table-session.dto';

const KDS_KITCHEN_STATUSES = ['preparing', 'ready', 'served'];

@Injectable()
export class TableSessionService {
  constructor(
    @InjectRepository(RestaurantTable) private tableRepo: Repository<RestaurantTable>,
    @InjectRepository(TableSession) private sessionRepo: Repository<TableSession>,
    @InjectRepository(TableSessionItem) private itemRepo: Repository<TableSessionItem>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(ProductVariant) private variantRepo: Repository<ProductVariant>,
    @InjectRepository(AuditLog) private auditLogRepo: Repository<AuditLog>,
    private eventGateway: EventGateway,
  ) {}

  // ── RST-030: Floor plan view ──────────────────────────────────────────────

  async floorPlan(businessId: string, query: FloorPlanQueryDto) {
    const qb = this.tableRepo
      .createQueryBuilder('t')
      .select('t.id', 'id')
      .addSelect('t.table_number', 'table_number')
      .addSelect('t.capacity', 'capacity')
      .addSelect('t.area_id', 'area_id')
      .addSelect('a.name', 'area_name')
      .addSelect('t.position_x', 'position_x')
      .addSelect('t.position_y', 'position_y')
      .addSelect('ts.id', 'session_id')
      .addSelect('ts.status', 'active_session_status')
      .addSelect('ts.opened_at', 'opened_at')
      .addSelect('ts.guest_count', 'guest_count')
      .addSelect(
        "NULLIF(TRIM(CONCAT(c.first_name, ' ', c.last_name)), '')",
        'customer_name',
      )
      .addSelect(
        "COUNT(tsi.id) FILTER (WHERE tsi.kds_status != 'cancelled')",
        'item_count',
      )
      .addSelect(
        "COALESCE(SUM(tsi.quantity * tsi.unit_price_ttc) FILTER (WHERE tsi.kds_status != 'cancelled'), 0)",
        'current_total_ttc',
      )
      .addSelect(
        "NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), '')",
        'server_name',
      )
      .leftJoin('t.area', 'a')
      .leftJoin(
        'table_sessions',
        'ts',
        "ts.table_id = t.id AND ts.status IN ('open', 'awaiting_payment') AND ts.business_id = t.business_id",
      )
      .leftJoin('customers', 'c', 'c.id = ts.customer_id')
      .leftJoin('users', 'u', 'u.id = ts.opened_by_user_id')
      .leftJoin('table_session_items', 'tsi', 'tsi.table_session_id = ts.id')
      .where('t.business_id = :businessId', { businessId })
      .andWhere('t.is_active = true')
      .groupBy(
        't.id, a.name, ts.id, ts.status, ts.opened_at, ts.guest_count, c.first_name, c.last_name, u.first_name, u.last_name',
      )
      .orderBy('t.table_number', 'ASC');

    if (query.location_id) qb.andWhere('t.location_id = :loc', { loc: query.location_id });
    if (query.area_id) qb.andWhere('t.area_id = :area', { area: query.area_id });

    const raw = await qb.getRawMany();

    return {
      tables: raw.map((r) => {
        const sessionStatus =
          r.active_session_status === 'awaiting_payment' ? 'awaiting_payment'
          : r.active_session_status === 'open' ? 'occupied'
          : 'available';

        return {
          id: r.id,
          table_number: r.table_number,
          capacity: Number(r.capacity),
          area_id: r.area_id,
          area_name: r.area_name,
          position_x: r.position_x !== null ? Number(r.position_x) : null,
          position_y: r.position_y !== null ? Number(r.position_y) : null,
          session_status: sessionStatus,
          current_session: r.session_id
            ? {
                id: r.session_id,
                opened_at: r.opened_at,
                guest_count: r.guest_count !== null ? Number(r.guest_count) : null,
                customer_name: r.customer_name ?? null,
                item_count: Number(r.item_count),
                current_total_ttc: Number(r.current_total_ttc),
                server_name: r.server_name ?? null,
              }
            : null,
        };
      }),
    };
  }

  // ── RST-031: Open table ───────────────────────────────────────────────────

  async openTable(
    businessId: string,
    tableId: string,
    userId: string,
    dto: OpenTableDto,
    user: { role: UserRole; permissions?: Record<string, unknown> | null },
  ) {
    const isPrivileged = user.role === UserRole.OWNER || user.role === UserRole.MANAGER;
    if (!isPrivileged && !userHasPermission(user, 'can_open_table_session')) {
      throw new ForbiddenException('Missing permission: can_open_table_session');
    }

    const table = await this.tableRepo.findOne({
      where: { id: tableId, business_id: businessId, is_active: true },
    });
    if (!table) throw new NotFoundException('Table not found');

    const existing = await this.sessionRepo.findOne({
      where: [
        { table_id: tableId, business_id: businessId, status: 'open' },
        { table_id: tableId, business_id: businessId, status: 'awaiting_payment' },
      ],
    });
    if (existing) {
      throw new ConflictException({
        error: 'RST_TABLE_ALREADY_OPEN',
        message: 'Table already has an active session',
      });
    }

    const session = this.sessionRepo.create({
      business_id: businessId,
      location_id: table.location_id,
      table_id: tableId,
      opened_by_user_id: userId,
      guest_count: dto.guest_count ?? null,
      customer_id: dto.customer_id ?? null,
      status: 'open',
    });
    const saved = await this.sessionRepo.save(session);

    this.eventGateway.emitToRoom(`floor:${businessId}`, 'floor:table_opened', {
      table_id: tableId,
      session_id: saved.id,
      table_number: table.table_number,
    });

    return {
      id: saved.id,
      table_id: saved.table_id,
      table_number: table.table_number,
      status: saved.status,
      opened_at: saved.opened_at,
      guest_count: saved.guest_count,
      customer_id: saved.customer_id,
      items: [],
    };
  }

  // ── RST-032: Add items to open table ─────────────────────────────────────

  async addItems(businessId: string, sessionId: string, userId: string, dto: AddItemsDto) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, business_id: businessId },
    });
    if (!session) throw new NotFoundException('Table session not found');

    if (session.status !== 'open') {
      throw new UnprocessableEntityException({
        error: 'RST_SESSION_NOT_OPEN',
        message: 'Session is not in open status',
      });
    }

    // Batch-fetch products and variants to avoid N+1 queries
    const productIds = [...new Set(dto.items.map((i) => i.product_id))];
    const products = await this.productRepo.find({
      where: { id: In(productIds), business_id: businessId },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const variantIds = dto.items
      .filter((i) => i.variant_id)
      .map((i) => i.variant_id as string);
    const variantMap = new Map<string, ProductVariant>();
    if (variantIds.length > 0) {
      const variants = await this.variantRepo.find({ where: { id: In(variantIds) } });
      variants.forEach((v) => variantMap.set(v.id, v));
    }

    const itemsToInsert = dto.items.map((itemDto) => {
      const product = productMap.get(itemDto.product_id);
      if (!product) throw new NotFoundException(`Product ${itemDto.product_id} not found`);

      let unitPriceTtc = Number(product.price);
      if (itemDto.variant_id) {
        const variant = variantMap.get(itemDto.variant_id);
        if (variant?.price_override != null) {
          unitPriceTtc = Number(variant.price_override);
        }
      }

      return this.itemRepo.create({
        business_id: businessId,
        table_session_id: sessionId,
        product_id: itemDto.product_id,
        variant_id: itemDto.variant_id ?? null,
        customer_id: itemDto.customer_id ?? session.customer_id ?? null,
        quantity: itemDto.quantity,
        unit_price_ttc: unitPriceTtc,
        modifiers_json: (itemDto.modifiers ?? []) as any,
        notes: itemDto.notes ?? null,
        added_by_user_id: userId,
        kds_status: 'new',
      });
    });

    const savedItems = await this.itemRepo.save(itemsToInsert);

    // Compute session total from all non-cancelled items
    const totRow = await this.itemRepo
      .createQueryBuilder('i')
      .select(
        "COALESCE(SUM(i.quantity * i.unit_price_ttc) FILTER (WHERE i.kds_status != 'cancelled'), 0)",
        'total',
      )
      .where('i.table_session_id = :sessionId', { sessionId })
      .getRawOne();

    // Emit to KDS — fetch table_number best-effort
    const table = await this.tableRepo.findOne({ where: { id: session.table_id } });
    this.eventGateway.emitToRoom(`kds:${businessId}`, 'kds:items_added', {
      session_id: sessionId,
      table_number: table?.table_number ?? null,
      items: savedItems.map((item) => ({
        id: item.id,
        product_name: productMap.get(item.product_id)?.name ?? null,
        quantity: item.quantity,
        kds_status: item.kds_status,
        notes: item.notes,
      })),
    });

    return {
      added_items: savedItems.map((item) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: productMap.get(item.product_id)?.name ?? null,
        quantity: item.quantity,
        unit_price_ttc: Number(item.unit_price_ttc),
        kds_status: item.kds_status,
        notes: item.notes,
      })),
      session_total_ttc: Number(totRow.total),
    };
  }

  // ── RST-033: Modify table item ────────────────────────────────────────────

  async modifyItem(businessId: string, itemId: string, dto: ModifyItemDto) {
    const item = await this.itemRepo.findOne({
      where: { id: itemId, business_id: businessId },
    });
    if (!item) throw new NotFoundException('Table session item not found');

    const kitchenBlocked = KDS_KITCHEN_STATUSES.includes(item.kds_status);

    // Field-specific guard — NOT a blanket block (TRAP 3 from reference doc)
    if (kitchenBlocked && (dto.quantity !== undefined || dto.notes !== undefined)) {
      throw new UnprocessableEntityException({
        error: 'RST_ITEM_IN_KITCHEN',
        message: 'Cannot modify quantity or notes — item is already being prepared',
      });
    }

    if (dto.quantity !== undefined) item.quantity = dto.quantity;
    if (dto.notes !== undefined) item.notes = dto.notes ?? null;
    // customer_id: undefined = not sent (skip), null = detach, string = set
    if (dto.customer_id !== undefined) item.customer_id = dto.customer_id ?? null;

    return this.itemRepo.save(item);
  }

  // ── RST-034: Remove table item ────────────────────────────────────────────

  async removeItem(
    businessId: string,
    itemId: string,
    user: { id: string; permissions?: Record<string, unknown> | null },
  ) {
    const item = await this.itemRepo.findOne({
      where: { id: itemId, business_id: businessId },
    });
    if (!item) throw new NotFoundException('Table session item not found');

    const kitchenBlocked = KDS_KITCHEN_STATUSES.includes(item.kds_status);

    if (kitchenBlocked) {
      if (!userHasPermission(user, 'can_void')) {
        throw new UnprocessableEntityException({
          error: 'RST_ITEM_IN_KITCHEN',
          message: 'Cannot remove item — it is already in the kitchen. Requires can_void permission.',
        });
      }
      // Soft delete: kitchen needs to see what was cancelled (TRAP 7)
      item.kds_status = 'cancelled';
      await this.itemRepo.save(item);
      await this.auditLogRepo.save(this.auditLogRepo.create({
        business_id: businessId,
        user_id: user.id,
        action: 'void',
        entity_type: 'table_session_item',
        entity_id: itemId,
        details_json: { kds_status_was: item.kds_status, session_id: item.table_session_id },
      }));

      // Emit event — fetch table_number best-effort
      const session = await this.sessionRepo.findOne({ where: { id: item.table_session_id } });
      const table = session
        ? await this.tableRepo.findOne({ where: { id: session.table_id } })
        : null;
      this.eventGateway.emitToRoom(`kds:${businessId}`, 'kds:item_cancelled', {
        item_id: itemId,
        session_id: item.table_session_id,
        table_number: table?.table_number ?? null,
      });

      return { deleted: false, cancelled: true };
    }

    await this.itemRepo.remove(item);
    return { deleted: true, cancelled: false };
  }

  // ── RST-037: Transfer items between tables ────────────────────────────────

  async transferItems(
    businessId: string,
    dto: TransferItemsDto,
    user: { role: UserRole; permissions?: Record<string, unknown> | null },
  ) {
    const isPrivileged = user.role === UserRole.OWNER || user.role === UserRole.MANAGER;
    if (!isPrivileged && !userHasPermission(user, 'can_transfer_table_items')) {
      throw new ForbiddenException('Missing permission: can_transfer_table_items');
    }

    const items = await this.itemRepo.find({
      where: { id: In(dto.item_ids), business_id: businessId },
    });
    if (items.length !== dto.item_ids.length) {
      throw new NotFoundException('One or more items not found');
    }

    const sourceSessionId = items[0].table_session_id;

    const sourceSession = await this.sessionRepo.findOne({
      where: { id: sourceSessionId, business_id: businessId },
    });
    if (!sourceSession || sourceSession.status !== 'open') {
      throw new UnprocessableEntityException({
        error: 'RST_SOURCE_SESSION_NOT_OPEN',
        message: 'Source session is not open',
      });
    }

    const targetSession = await this.sessionRepo.findOne({
      where: { id: dto.target_table_session_id, business_id: businessId },
    });
    if (!targetSession) throw new NotFoundException('Target session not found');
    if (targetSession.status !== 'open') {
      throw new UnprocessableEntityException({
        error: 'RST_TARGET_SESSION_NOT_OPEN',
        message: 'Target session is not open',
      });
    }

    for (const item of items) {
      item.table_session_id = dto.target_table_session_id;
    }
    await this.itemRepo.save(items);

    this.eventGateway.emitToRoom(`kds:${businessId}`, 'kds:items_transferred', {
      item_ids: dto.item_ids,
      source_session: sourceSessionId,
      target_session: dto.target_table_session_id,
    });

    return {
      transferred: items.length,
      source_session_id: sourceSessionId,
      target_session_id: dto.target_table_session_id,
    };
  }

  // ── RST-038: Cancel or partially close session ────────────────────────────

  async cancelSession(
    businessId: string,
    sessionId: string,
    dto: CancelSessionDto,
    user: { id: string; role: UserRole; permissions?: Record<string, unknown> | null },
  ) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, business_id: businessId },
    });
    if (!session) throw new NotFoundException('Table session not found');

    if (session.status === 'open') {
      await this.itemRepo
        .createQueryBuilder()
        .update()
        .set({ kds_status: 'cancelled' })
        .where("table_session_id = :sessionId AND kds_status != 'cancelled'", { sessionId })
        .execute();

      session.status = 'cancelled';
      session.closed_at = new Date();
      await this.sessionRepo.save(session);

      await this.auditLogRepo.save(this.auditLogRepo.create({
        business_id: businessId,
        user_id: user.id,
        action: 'cancel',
        entity_type: 'table_session',
        entity_id: sessionId,
        details_json: { reason: dto.reason, status_was: 'open' },
      }));

      this.eventGateway.emitToRoom(`floor:${businessId}`, 'floor:table_closed', {
        table_id: session.table_id,
        session_id: sessionId,
        status: 'cancelled',
      });

      return { status: 'cancelled', partial_payment: false };
    }

    if (session.status === 'awaiting_payment' && dto.force_close_partial) {
      const isPrivileged = user.role === UserRole.OWNER || user.role === UserRole.MANAGER;
      if (!isPrivileged && !userHasPermission(user, 'can_close_table_session_partial')) {
        throw new ForbiddenException('Missing permission: can_close_table_session_partial');
      }

      session.status = 'paid';
      session.partial_payment = true;
      session.closed_at = new Date();
      await this.sessionRepo.save(session);

      await this.auditLogRepo.save(this.auditLogRepo.create({
        business_id: businessId,
        user_id: user.id,
        action: 'force_close',
        entity_type: 'table_session',
        entity_id: sessionId,
        details_json: { reason: dto.reason, partial_payment: true },
      }));

      this.eventGateway.emitToRoom(`floor:${businessId}`, 'floor:table_closed', {
        table_id: session.table_id,
        session_id: sessionId,
        status: 'paid',
      });

      return { status: 'paid', partial_payment: true };
    }

    throw new UnprocessableEntityException({
      error: 'RST_INVALID_STATE_TRANSITION',
      message: 'Invalid session state for cancellation',
    });
  }
}
