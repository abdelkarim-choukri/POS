// apps/backend/src/modules/terminal/terminal.service.ts
// CHANGES: clockIn and clockOut are now idempotent.
// If the user is already clocked in, clockIn returns the existing entry (no error).
// If the user is not clocked in, clockOut returns a no-op success (no error).
// This prevents sync queue items from burning through retries and dying permanently.

import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { KdsService } from '../kds/kds.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Terminal } from '../../common/entities/terminal.entity';
import { User } from '../../common/entities/user.entity';
import { ClockEntry } from '../../common/entities/clock-entry.entity';
import { Category } from '../../common/entities/category.entity';
import { Product } from '../../common/entities/product.entity';
import { Transaction } from '../../common/entities/transaction.entity';
import { TransactionItem } from '../../common/entities/transaction-item.entity';
import { Void as VoidEntity } from '../../common/entities/void.entity';
import { SyncQueue } from '../../common/entities/sync-queue.entity';
import { TransactionStatus } from '../../common/enums';
import { CreateTransactionDto, VoidTransactionDto } from './dto';

@Injectable()
export class TerminalService {
  constructor(
    private kdsService: KdsService,
    @InjectRepository(Terminal) private terminalRepo: Repository<Terminal>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(ClockEntry) private clockRepo: Repository<ClockEntry>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Transaction) private transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionItem) private itemRepo: Repository<TransactionItem>,
    @InjectRepository(VoidEntity) private voidRepo: Repository<VoidEntity>,
    @InjectRepository(SyncQueue) private syncRepo: Repository<SyncQueue>,
  ) {}

  // ===== TERMINAL SETUP =====

  async activate(terminalCode: string) {
    const terminal = await this.terminalRepo.findOne({
      where: { terminal_code: terminalCode, is_active: true },
      relations: ['location', 'location.business', 'location.business.business_type', 'location.business.business_type.features'],
    });
    if (!terminal) throw new NotFoundException('Terminal not found or inactive');

    terminal.is_online = true;
    terminal.last_seen_at = new Date();
    await this.terminalRepo.save(terminal);

    return {
      terminal: { id: terminal.id, terminal_code: terminal.terminal_code, device_name: terminal.device_name },
      business: terminal.location.business,
      location: terminal.location,
    };
  }

  async getConfig(terminalId: string) {
    const terminal = await this.terminalRepo.findOne({
      where: { id: terminalId },
      relations: ['location', 'location.business', 'location.business.business_type', 'location.business.business_type.features'],
    });
    if (!terminal) throw new NotFoundException('Terminal not found');

    const features = terminal.location.business.business_type.features
      .filter((f) => f.is_enabled)
      .map((f) => f.feature_key);

    return {
      business: {
        id: terminal.location.business.id,
        name: terminal.location.business.name,
        currency: terminal.location.business.currency,
      },
      location: { id: terminal.location.id, name: terminal.location.name },
      features,
    };
  }

  async heartbeat(terminalId: string) {
    await this.terminalRepo.update(terminalId, { is_online: true, last_seen_at: new Date() });
    return { status: 'ok' };
  }

  // ===== EMPLOYEE ACTIONS =====

  async clockIn(userId: string, terminalId: string) {
    const existing = await this.clockRepo.findOne({
      where: { user_id: userId, clock_out: null as any },
    });

    // ── Idempotency fix ──────────────────────────────────────────────────────
    // If the employee is already clocked in (e.g. the terminal came back online
    // and tried to sync a queued clock_in after the login flow already did it),
    // return the existing entry instead of throwing. The desired state is met.
    if (existing) {
      return { ...existing, already_clocked_in: true };
    }
    // ────────────────────────────────────────────────────────────────────────

    const entry = this.clockRepo.create({
      user_id: userId,
      terminal_id: terminalId,
      clock_in: new Date(),
    });
    return this.clockRepo.save(entry);
  }

  async clockOut(userId: string) {
    const entry = await this.clockRepo.findOne({
      where: { user_id: userId, clock_out: null as any },
      order: { clock_in: 'DESC' },
    });

    // ── Idempotency fix ──────────────────────────────────────────────────────
    // If the employee is already clocked out (or was never clocked in), return
    // a no-op success instead of throwing. The sync queue item will be removed.
    if (!entry) {
      return { status: 'already_clocked_out' };
    }
    // ────────────────────────────────────────────────────────────────────────

    entry.clock_out = new Date();
    const diffMs = entry.clock_out.getTime() - entry.clock_in.getTime();
    entry.total_hours = Math.round((diffMs / 3600000) * 100) / 100;
    return this.clockRepo.save(entry);
  }

  async getActiveEmployees(businessId: string) {
    return this.clockRepo.createQueryBuilder('c')
      .innerJoinAndSelect('c.user', 'u')
      .where('u.business_id = :businessId', { businessId })
      .andWhere('c.clock_out IS NULL')
      .getMany();
  }

  // ===== CATALOG =====

  async getCatalog(businessId: string) {
    const categories = await this.categoryRepo.find({
      where: { business_id: businessId, is_active: true },
      order: { sort_order: 'ASC' },
    });

    const products = await this.productRepo.find({
      where: { business_id: businessId, is_active: true },
      relations: ['variants', 'product_modifier_groups', 'product_modifier_groups.modifier_group', 'product_modifier_groups.modifier_group.modifiers'],
      order: { sort_order: 'ASC' },
    });

    return { categories, products };
  }

  // ===== TRANSACTIONS =====

  async createTransaction(
    businessId: string,
    locationId: string,
    terminalId: string,
    userId: string,
    dto: CreateTransactionDto,
  ) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.transactionRepo.count({
      where: {
        business_id: businessId,
        created_at: MoreThan(new Date(new Date().setHours(0, 0, 0, 0))),
      },
    });
    const txnNumber = `TXN-${today}-${String(count + 1).padStart(3, '0')}`;

    const transaction = this.transactionRepo.create({
      business_id: businessId,
      location_id: locationId,
      terminal_id: terminalId,
      user_id: userId,
      transaction_number: txnNumber,
      subtotal: dto.subtotal,
      tax_amount: dto.tax_amount || 0,
      total: dto.total,
      payment_method: dto.payment_method,
      payment_confirmed_at: new Date(),
      notes: dto.notes,
    });
    const saved = await this.transactionRepo.save(transaction);

    const items = dto.items.map((item) =>
      this.itemRepo.create({ ...item, transaction_id: saved.id }),
    );
    await this.itemRepo.save(items);

    try { this.kdsService.notifyNewOrder(saved); } catch (e) {}

    return this.transactionRepo.findOne({
      where: { id: saved.id },
      relations: ['items'],
    });
  }

  async voidTransaction(
    transactionId: string,
    userId: string,
    dto: VoidTransactionDto,
    userCanVoid: boolean,
  ) {
    const txn = await this.transactionRepo.findOne({ where: { id: transactionId } });
    if (!txn) throw new NotFoundException('Transaction not found');
    if (txn.status !== TransactionStatus.COMPLETED) {
      throw new BadRequestException('Can only void completed transactions');
    }

    if (!userCanVoid) {
      if (!dto.manager_pin) throw new UnauthorizedException('Manager PIN required');
      const manager = await this.userRepo.findOne({
        where: { pin: dto.manager_pin, business_id: txn.business_id, can_void: true, is_active: true },
      });
      if (!manager) throw new UnauthorizedException('Invalid manager PIN');
    }

    const voidRecord = this.voidRepo.create({
      transaction_id: transactionId,
      voided_by: userId,
      reason: dto.reason,
    });
    await this.voidRepo.save(voidRecord);

    txn.status = TransactionStatus.VOIDED;
    await this.transactionRepo.save(txn);

    return { transaction: txn, void: voidRecord };
  }

  async getTodayTransactions(businessId: string, terminalId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.transactionRepo.find({
      where: { business_id: businessId, terminal_id: terminalId, created_at: MoreThan(today) },
      relations: ['items'],
      order: { created_at: 'DESC' },
    });
  }

  // ===== SYNC =====

  async pushSync(terminalId: string, operations: any[]) {
    const results = [];
    for (const op of operations) {
      const entry = this.syncRepo.create({
        terminal_id: terminalId,
        operation_type: op.operation_type,
        payload_json: op.payload,
        status: 'synced' as any,
        synced_at: new Date(),
      });
      results.push(await this.syncRepo.save(entry));
    }
    return { synced: results.length, results };
  }

  async getSyncStatus(terminalId: string) {
    const pending = await this.syncRepo.count({
      where: { terminal_id: terminalId, status: 'pending' as any },
    });
    const failed = await this.syncRepo.count({
      where: { terminal_id: terminalId, status: 'failed' as any },
    });
    return { pending, failed };
  }
}