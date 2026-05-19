import {
  Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ExpirationAlert } from '../../common/entities/expiration-alert.entity';
import { StockDiscrepancyAlert } from '../../common/entities/stock-discrepancy-alert.entity';
import { StockMovement } from '../../common/entities/stock-movement.entity';
import {
  ListExpirationAlertsQueryDto,
  ResolveExpirationAlertDto,
  ListDiscrepancyAlertsQueryDto,
  ResolveDiscrepancyAlertDto,
} from './dto/stock-engine.dto';

@Injectable()
export class AlertService {
  constructor(
    @InjectRepository(ExpirationAlert) private expirationRepo: Repository<ExpirationAlert>,
    @InjectRepository(StockDiscrepancyAlert) private discrepancyRepo: Repository<StockDiscrepancyAlert>,
    @InjectRepository(StockMovement) private movementRepo: Repository<StockMovement>,
    private dataSource: DataSource,
  ) {}

  // ── INV-081: List Expiration Alerts ────────────────────────────────────────

  async listExpirationAlerts(businessId: string, query: ListExpirationAlertsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const isResolved = query.is_resolved ?? false;

    const qb = this.expirationRepo
      .createQueryBuilder('ea')
      .where('ea.business_id = :businessId', { businessId })
      .orderBy('ea.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (isResolved) {
      qb.andWhere('ea.resolved_at IS NOT NULL');
    } else {
      qb.andWhere('ea.resolved_at IS NULL');
    }

    if (query.severity) {
      qb.andWhere('ea.severity = :severity', { severity: query.severity });
    }

    const [records, total] = await qb.getManyAndCount();
    return { records, total, page, limit };
  }

  // ── INV-082: Resolve Expiration Alert ──────────────────────────────────────

  async resolveExpirationAlert(id: string, businessId: string, userId: string, dto: ResolveExpirationAlertDto) {
    const alert = await this.expirationRepo.findOne({ where: { id, business_id: businessId } });
    if (!alert) throw new NotFoundException({ error: 'INV_ALERT_EXP_NOT_FOUND', message: 'Expiration alert not found' });
    if (alert.resolved_at) throw new UnprocessableEntityException({ error: 'INV_ALERT_EXP_RESOLVED', message: 'Alert already resolved' });

    alert.resolved_at = new Date();
    alert.resolved_by_user_id = userId;
    alert.action = dto.action;
    alert.notes = dto.notes ?? null;
    return this.expirationRepo.save(alert);
  }

  // ── INV-094: List Discrepancy Alerts ───────────────────────────────────────

  async listDiscrepancyAlerts(businessId: string, query: ListDiscrepancyAlertsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const isResolved = query.is_resolved ?? false;

    const qb = this.discrepancyRepo
      .createQueryBuilder('da')
      .where('da.business_id = :businessId', { businessId })
      .orderBy('da.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (isResolved) {
      qb.andWhere('da.resolved_at IS NOT NULL');
    } else {
      qb.andWhere('da.resolved_at IS NULL');
    }

    if (query.source) qb.andWhere('da.source = :source', { source: query.source });
    if (query.warehouse_id) qb.andWhere('da.warehouse_id = :warehouseId', { warehouseId: query.warehouse_id });
    if (query.product_id) qb.andWhere('da.product_id = :productId', { productId: query.product_id });

    const [records, total] = await qb.getManyAndCount();
    return { records, total, page, limit };
  }

  // ── INV-096: Resolve Discrepancy Alert ─────────────────────────────────────

  async resolveDiscrepancyAlert(id: string, businessId: string, userId: string, dto: ResolveDiscrepancyAlertDto) {
    const alert = await this.discrepancyRepo.findOne({ where: { id, business_id: businessId } });
    if (!alert) throw new NotFoundException({ error: 'INV_ALERT_DISC_NOT_FOUND', message: 'Discrepancy alert not found' });
    if (alert.resolved_at) throw new UnprocessableEntityException({ error: 'INV_ALERT_DISC_RESOLVED', message: 'Alert already resolved' });

    if (dto.action === 'accept_loss' && alert.batch_id) {
      const movement = this.movementRepo.create({
        business_id: businessId,
        batch_id: alert.batch_id,
        movement_type: 'waste',
        quantity: Math.abs(Number(alert.discrepancy_quantity)),
        source_origin: 'system_reconciliation',
        performed_by_user_id: userId,
        notes: dto.notes ?? 'Accepted loss from discrepancy resolution',
      });
      await this.movementRepo.save(movement);
    } else if (dto.action === 'adjust_batch' && alert.batch_id) {
      const adjQty = dto.adjustment_quantity ?? 0;
      await this.dataSource.query(
        `UPDATE stock_batches SET quantity_remaining = $1, updated_at = now() WHERE id = $2`,
        [adjQty, alert.batch_id],
      );
      const delta = adjQty - Number(alert.actual_remaining);
      const movement = this.movementRepo.create({
        business_id: businessId,
        batch_id: alert.batch_id,
        movement_type: 'adjustment',
        quantity: delta,
        source_origin: 'system_reconciliation',
        performed_by_user_id: userId,
        notes: dto.notes ?? 'Batch adjusted from discrepancy resolution',
      });
      await this.movementRepo.save(movement);
    }

    alert.resolved_at = new Date();
    alert.resolved_by_user_id = userId;
    alert.resolution_notes = dto.notes ?? null;
    return this.discrepancyRepo.save(alert);
  }
}
