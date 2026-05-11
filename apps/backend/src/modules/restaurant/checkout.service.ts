import {
  Injectable, NotFoundException, ForbiddenException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TableSession } from '../../common/entities/table-session.entity';
import { TableSessionItem } from '../../common/entities/table-session-item.entity';
import { Business } from '../../common/entities/business.entity';
import { EventGateway } from '../../common/gateways/event.gateway';
import { userHasPermission } from '../../common/utils/permissions';
import { bankersRound } from '../../common/utils/money';
import { UserRole } from '../../common/enums';
import {
  PromotionEvaluatorService, CartItem,
} from '../promotion/promotion-evaluator.service';
import { SplitBillDto } from './dto/table-session.dto';

@Injectable()
export class CheckoutService {
  constructor(
    @InjectRepository(TableSession) private sessionRepo: Repository<TableSession>,
    @InjectRepository(TableSessionItem) private itemRepo: Repository<TableSessionItem>,
    @InjectRepository(Business) private businessRepo: Repository<Business>,
    private evaluator: PromotionEvaluatorService,
    private eventGateway: EventGateway,
  ) {}

  // ── RST-035: Close table → single checkout payload ─────────────────────────

  async closeTable(
    businessId: string,
    sessionId: string,
    terminalId: string,
    user: { id: string; role: UserRole; permissions?: Record<string, unknown> | null },
  ) {
    const isPrivileged = user.role === UserRole.OWNER || user.role === UserRole.MANAGER;
    if (!isPrivileged && !userHasPermission(user, 'can_close_table_session')) {
      throw new ForbiddenException('Missing permission: can_close_table_session');
    }

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

    const allItems = await this.itemRepo.find({
      where: { table_session_id: sessionId, business_id: businessId },
    });
    const activeItems = allItems.filter((i) => i.kds_status !== 'cancelled');

    if (activeItems.length === 0) {
      throw new UnprocessableEntityException({
        error: 'RST_SESSION_NO_ITEMS',
        message: 'Session has no active items to check out',
      });
    }

    // Transition status
    session.status = 'awaiting_payment';
    session.expected_split_count = 1;
    await this.sessionRepo.save(session);

    const suggestedPromotions = await this.evaluatePromotions(
      businessId, session.location_id, session.customer_id, activeItems,
    );

    this.eventGateway.emitToRoom(`floor:${businessId}`, 'floor:table_closed', {
      table_id: session.table_id,
      session_id: sessionId,
      status: 'awaiting_payment',
    });

    return {
      checkout_payload: this.buildCheckoutPayload({
        session,
        items: activeItems,
        customerId: session.customer_id,
        terminalId,
        splitLabel: null,
        suggestedPromotions,
      }),
    };
  }

  // ── RST-036: Split bill → multiple checkout payloads ───────────────────────

  async splitBill(
    businessId: string,
    sessionId: string,
    terminalId: string,
    dto: SplitBillDto,
    user: { id: string; role: UserRole; permissions?: Record<string, unknown> | null },
  ) {
    const isPrivileged = user.role === UserRole.OWNER || user.role === UserRole.MANAGER;
    if (!isPrivileged && !userHasPermission(user, 'can_close_table_session')) {
      throw new ForbiddenException('Missing permission: can_close_table_session');
    }

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

    const allItems = await this.itemRepo.find({
      where: { table_session_id: sessionId, business_id: businessId },
    });
    const activeItems = allItems.filter((i) => i.kds_status !== 'cancelled');

    if (activeItems.length === 0) {
      throw new UnprocessableEntityException({
        error: 'RST_SESSION_NO_ITEMS',
        message: 'Session has no active items to split',
      });
    }

    let checkoutPayloads: ReturnType<typeof this.buildCheckoutPayload>[];

    if (dto.split_type === 'by_item') {
      checkoutPayloads = await this.buildByItemSplits(session, activeItems, terminalId, businessId);
    } else if (dto.split_type === 'even') {
      checkoutPayloads = await this.buildEvenSplits(session, activeItems, terminalId, businessId, dto);
    } else if (dto.split_type === 'custom') {
      checkoutPayloads = await this.buildCustomSplits(session, activeItems, terminalId, businessId, dto);
    } else {
      throw new UnprocessableEntityException({
        error: 'RST_INVALID_SPLIT_TYPE',
        message: 'split_type must be by_item | even | custom',
      });
    }

    const N = checkoutPayloads.length;
    session.status = 'awaiting_payment';
    session.expected_split_count = N;
    await this.sessionRepo.save(session);

    this.eventGateway.emitToRoom(`floor:${businessId}`, 'floor:table_closed', {
      table_id: session.table_id,
      session_id: sessionId,
      status: 'awaiting_payment',
    });

    return { checkout_payloads: checkoutPayloads };
  }

  // ── Split builders ──────────────────────────────────────────────────────────

  private async buildByItemSplits(
    session: TableSession,
    items: TableSessionItem[],
    terminalId: string,
    businessId: string,
  ) {
    // Group by customer_id; null = anonymous group
    const groups = new Map<string | null, TableSessionItem[]>();
    for (const item of items) {
      const key = item.customer_id ?? null;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    const payloads = [];
    for (const [customerId, groupItems] of groups) {
      const promos = await this.evaluatePromotions(
        businessId, session.location_id, customerId, groupItems,
      );
      const label = customerId ? `Guest (${customerId.slice(0, 8)})` : 'Anonymous';
      payloads.push(this.buildCheckoutPayload({
        session,
        items: groupItems,
        customerId,
        terminalId,
        splitLabel: label,
        suggestedPromotions: promos,
      }));
    }
    return payloads;
  }

  private async buildEvenSplits(
    session: TableSession,
    items: TableSessionItem[],
    terminalId: string,
    businessId: string,
    dto: SplitBillDto,
  ) {
    const N = dto.splits?.length ?? 0;
    if (N < 2) {
      throw new UnprocessableEntityException({
        error: 'RST_EVEN_SPLIT_INVALID',
        message: 'splits array with >= 2 entries is required for even split',
      });
    }

    const customerSplitIndex = dto.customer_split_index ?? 0;
    const payloads = [];

    for (let i = 0; i < N; i++) {
      // Per-item unit price for this split: split 0 absorbs the rounding remainder
      // so that sum(splitUnitPrice × qty) across all N splits = original total (TRAP 2)
      const splitItems = items.map((item) => {
        const originalPrice = Number(item.unit_price_ttc);
        const base = bankersRound(originalPrice / N);
        const splitPrice = i === 0
          ? bankersRound(originalPrice - (N - 1) * base)
          : base;
        return { ...item, unit_price_ttc: splitPrice as any };
      });

      const customerId = i === customerSplitIndex ? session.customer_id : null;
      const promos = await this.evaluatePromotions(
        businessId, session.location_id, customerId, splitItems,
      );

      payloads.push(this.buildCheckoutPayload({
        session,
        items: splitItems,
        customerId,
        terminalId,
        splitLabel: dto.splits![i].label,
        suggestedPromotions: promos,
      }));
    }
    return payloads;
  }

  private async buildCustomSplits(
    session: TableSession,
    items: TableSessionItem[],
    terminalId: string,
    businessId: string,
    dto: SplitBillDto,
  ) {
    if (!dto.splits?.length) {
      throw new UnprocessableEntityException({
        error: 'RST_CUSTOM_SPLIT_REQUIRES_SPLITS',
        message: 'splits array is required for custom split',
      });
    }

    // Validate: no duplicates across splits
    const assigned = new Set<string>();
    for (const split of dto.splits) {
      for (const itemId of (split.item_ids ?? [])) {
        if (assigned.has(itemId)) {
          throw new UnprocessableEntityException({
            error: 'RST_DUPLICATE_ITEM_IN_SPLIT',
            message: `Item ${itemId} appears in more than one split`,
          });
        }
        assigned.add(itemId);
      }
    }

    // Validate: no orphans (every active item must be in exactly one split)
    const itemMap = new Map(items.map((i) => [i.id, i]));
    for (const item of items) {
      if (!assigned.has(item.id)) {
        throw new UnprocessableEntityException({
          error: 'RST_ORPHAN_ITEM_IN_SPLIT',
          message: `Item ${item.id} is not assigned to any split`,
        });
      }
    }

    // Validate: no unknown item IDs referenced in splits
    for (const itemId of assigned) {
      if (!itemMap.has(itemId)) {
        throw new UnprocessableEntityException({
          error: 'RST_ITEM_NOT_IN_SESSION',
          message: `Item ${itemId} is not an active item in this session`,
        });
      }
    }

    const customerSplitIndex = dto.customer_split_index ?? 0;
    const payloads = [];

    for (let i = 0; i < dto.splits.length; i++) {
      const split = dto.splits[i];
      const splitItems = (split.item_ids ?? [])
        .map((id) => itemMap.get(id)!)
        .filter(Boolean);

      const customerId = i === customerSplitIndex ? session.customer_id : null;
      const promos = await this.evaluatePromotions(
        businessId, session.location_id, customerId, splitItems,
      );

      payloads.push(this.buildCheckoutPayload({
        session,
        items: splitItems,
        customerId,
        terminalId,
        splitLabel: split.label,
        suggestedPromotions: promos,
      }));
    }
    return payloads;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async evaluatePromotions(
    businessId: string,
    locationId: string,
    customerId: string | null,
    items: Array<{ product_id: string; quantity: number; unit_price_ttc: number | any }>,
  ) {
    try {
      const business = await this.businessRepo.findOne({ where: { id: businessId } });
      const stackingMode = ((business as any)?.promotion_stacking_mode ?? 'best_only') as 'best_only' | 'stack';

      const cartItems: CartItem[] = items.map((item, idx) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price_ttc: Number(item.unit_price_ttc),
        line_index: idx,
      }));

      const { applicable_promotions } = await this.evaluator.evaluateWithStackingMode(
        businessId, cartItems, customerId, locationId, new Date(), stackingMode,
      );
      return applicable_promotions;
    } catch {
      return [];
    }
  }

  private buildCheckoutPayload(opts: {
    session: TableSession;
    items: Array<TableSessionItem & { unit_price_ttc: number | any }>;
    customerId: string | null;
    terminalId: string;
    splitLabel: string | null;
    suggestedPromotions: any[];
  }) {
    return {
      items: opts.items.map((item) => ({
        product_id: item.product_id,
        variant_id: item.variant_id ?? null,
        quantity: item.quantity,
        unit_price_ttc: Number(item.unit_price_ttc),
        modifiers_json: item.modifiers_json ?? {},
        notes: item.notes ?? null,
        source_table_session_item_id: item.id,
      })),
      customer_id: opts.customerId ?? null,
      location_id: opts.session.location_id,
      terminal_id: opts.terminalId,
      table_session_id: opts.session.id,
      guest_count: opts.session.guest_count,
      split_label: opts.splitLabel,
      suggested_promotions: opts.suggestedPromotions,
    };
  }
}
