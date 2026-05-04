// apps/backend/src/modules/terminal/terminal.service.ts
// CHANGES: clockIn and clockOut are now idempotent.
// If the user is already clocked in, clockIn returns the existing entry (no error).
// If the user is not clocked in, clockOut returns a no-op success (no error).
// This prevents sync queue items from burning through retries and dying permanently.

import { Injectable, NotFoundException, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { KdsService } from '../kds/kds.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In } from 'typeorm';
import { Terminal } from '../../common/entities/terminal.entity';
import { User } from '../../common/entities/user.entity';
import { ClockEntry } from '../../common/entities/clock-entry.entity';
import { Category } from '../../common/entities/category.entity';
import { Product } from '../../common/entities/product.entity';
import { Transaction } from '../../common/entities/transaction.entity';
import { TransactionItem } from '../../common/entities/transaction-item.entity';
import { Void as VoidEntity } from '../../common/entities/void.entity';
import { SyncQueue } from '../../common/entities/sync-queue.entity';
import { Business } from '../../common/entities/business.entity';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerGrade } from '../../common/entities/customer-grade.entity';
import { CustomerPointsHistory } from '../../common/entities/customer-points-history.entity';
import { TransactionStatus } from '../../common/enums';
import { CreateTransactionDto, VoidTransactionDto, QuickAddCustomerDto } from './dto';
import { DiscountPipelineService, PipelineLineInput } from '../../common/services/discount-pipeline.service';
import { resolveTvaRate } from '../../common/utils/tva';
import { userHasPermission } from '../../common/utils/permissions';

@Injectable()
export class TerminalService {
  constructor(
    private kdsService: KdsService,
    private discountPipeline: DiscountPipelineService,
    @InjectRepository(Terminal) private terminalRepo: Repository<Terminal>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(ClockEntry) private clockRepo: Repository<ClockEntry>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Transaction) private transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionItem) private itemRepo: Repository<TransactionItem>,
    @InjectRepository(VoidEntity) private voidRepo: Repository<VoidEntity>,
    @InjectRepository(SyncQueue) private syncRepo: Repository<SyncQueue>,
    @InjectRepository(Business) private businessRepo: Repository<Business>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(CustomerGrade) private gradeRepo: Repository<CustomerGrade>,
    @InjectRepository(CustomerPointsHistory) private pointsHistoryRepo: Repository<CustomerPointsHistory>,
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

  // ===== CUSTOMER TERMINAL OPERATIONS =====

  async lookupCustomer(businessId: string, phone: string) {
    const customer = await this.customerRepo.findOne({
      where: { business_id: businessId, phone, is_active: true },
      relations: ['grade'],
    });
    if (!customer) throw new NotFoundException('Customer not found');

    return {
      id: customer.id,
      customer_code: customer.customer_code,
      first_name: customer.first_name,
      last_name: customer.last_name,
      grade: customer.grade
        ? { name: customer.grade.name, color_hex: customer.grade.color_hex }
        : null,
      points_balance: customer.points_balance,
    };
  }

  async quickAddCustomer(businessId: string, dto: QuickAddCustomerDto) {
    const existing = await this.customerRepo.findOne({
      where: { business_id: businessId, phone: dto.phone },
    });
    if (existing) throw new ConflictException('Phone number already registered');

    const counterRaw = await this.businessRepo.manager.query(
      `UPDATE businesses SET customer_counter = customer_counter + 1 WHERE id = $1 RETURNING customer_counter`,
      [businessId],
    );
    const counterRows = Array.isArray(counterRaw[0]) ? counterRaw[0] : counterRaw;
    const customerCode = `C-${String(counterRows[0].customer_counter).padStart(6, '0')}`;

    const customer = this.customerRepo.create({
      business_id: businessId,
      customer_code: customerCode,
      phone: dto.phone,
      first_name: dto.first_name,
      last_name: dto.last_name,
    });
    const saved = await this.customerRepo.save(customer);

    return {
      id: saved.id,
      customer_code: saved.customer_code,
      first_name: saved.first_name,
      last_name: saved.last_name,
      grade: null,
      points_balance: saved.points_balance,
    };
  }

  // ===== TRANSACTIONS =====

  async createTransaction(
    businessId: string,
    locationId: string,
    terminalId: string,
    userId: string,
    dto: CreateTransactionDto,
  ) {
    // 1. Batch-fetch products with their categories for TVA resolution
    const productIds = dto.items.map((i) => i.product_id);
    const products = await this.productRepo.find({
      where: { id: In(productIds), business_id: businessId },
      relations: ['category'],
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // 2. Verify customer belongs to this business (if provided)
    if (dto.customer_id) {
      const customer = await this.customerRepo.findOne({
        where: { id: dto.customer_id, business_id: businessId, is_active: true },
      });
      if (!customer) throw new NotFoundException('Customer not found');
    }

    // 3. Build pipeline inputs with resolved TVA rates
    const pipelineLines: PipelineLineInput[] = dto.items.map((item, idx) => {
      const product = productMap.get(item.product_id);
      if (!product) {
        throw new BadRequestException(`Product ${item.product_id} not found`);
      }
      const tvaRate = resolveTvaRate(
        { tva_exempt: product.tva_exempt, tva_rate: product.tva_rate },
        { default_tva_rate: product.category.default_tva_rate },
      );
      return {
        id: String(idx),
        quantity: item.quantity,
        unit_price: item.unit_price,
        tva_rate: tvaRate,
      };
    });

    // 4. Run discount pipeline (no discount steps yet — Phase 7)
    const result = this.discountPipeline.calculate(pipelineLines, []);

    // 5. Atomic invoice counter with year reset
    const currentYear = new Date().getFullYear();
    const counterRaw = await this.businessRepo.manager.query(
      `UPDATE businesses
       SET invoice_counter = CASE WHEN last_invoice_year = $1 THEN invoice_counter + 1 ELSE 1 END,
           last_invoice_year = $1
       WHERE id = $2
       RETURNING invoice_counter, business_code`,
      [currentYear, businessId],
    );
    const rows = Array.isArray(counterRaw[0]) ? counterRaw[0] : counterRaw;
    const { invoice_counter, business_code } = rows[0];
    const invoiceNumber = `INV-${business_code}-${currentYear}-${String(invoice_counter).padStart(6, '0')}`;

    // 6. Transaction number (daily sequence for display, not the fiscal invoice)
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.transactionRepo.count({
      where: {
        business_id: businessId,
        created_at: MoreThan(new Date(new Date().setHours(0, 0, 0, 0))),
      },
    });
    const txnNumber = `TXN-${today}-${String(count + 1).padStart(3, '0')}`;

    // 7. Create transaction with TVA fields + backward compat
    const transaction = this.transactionRepo.create({
      business_id: businessId,
      location_id: locationId,
      terminal_id: terminalId,
      user_id: userId,
      transaction_number: txnNumber,
      invoice_number: invoiceNumber,
      // TVA-authoritative fields
      total_ht: result.total_ht,
      total_tva: result.total_tva,
      total_ttc: result.total_ttc,
      // Backward compat: subtotal = HT (before tax), tax_amount = TVA, total = TTC
      subtotal: result.total_ht,
      tax_amount: result.total_tva,
      total: result.total_ttc,
      payment_method: dto.payment_method,
      payment_confirmed_at: new Date(),
      notes: dto.notes,
      customer_id: dto.customer_id,
    });
    const saved = await this.transactionRepo.save(transaction) as Transaction;

    // 8. Create items with per-line TVA decomposition
    const items = dto.items.map((item, idx) => {
      const lineResult = result.lines[idx];
      return this.itemRepo.create({
        transaction_id: saved.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        product_name: item.product_name,
        variant_name: item.variant_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        modifiers_json: item.modifiers_json,
        // TVA-authoritative fields
        tva_rate: lineResult.tva_rate,
        item_ht: lineResult.item_ht,
        item_tva: lineResult.item_tva,
        item_ttc: lineResult.item_ttc,
        // Backward compat
        line_total: lineResult.item_ttc,
      });
    });
    await this.itemRepo.save(items);

    // 9. Earn points if customer attached (CUST-110)
    if (dto.customer_id) {
      await this.earnPoints(saved, businessId, dto.customer_id);
    }

    try { this.kdsService.notifyNewOrder(saved); } catch (e) {}

    return this.transactionRepo.findOne({
      where: { id: saved.id },
      relations: ['items'],
    });
  }

  private async earnPoints(
    transaction: Transaction,
    businessId: string,
    customerId: string,
  ): Promise<void> {
    const business = await this.businessRepo.findOne({ where: { id: businessId } });
    if (!business) return;

    const customer = await this.customerRepo.findOne({
      where: { id: customerId },
      relations: ['grade'],
    });
    if (!customer) return;

    const divisor = Number(business.points_earn_divisor);
    if (divisor <= 0) return;

    const totalTtc = Number(transaction.total_ttc);
    const base = Math.floor(totalTtc / divisor);
    const multiplier = customer.grade ? Number(customer.grade.points_multiplier) : 1.0;
    const points = Math.floor(base * multiplier);

    if (points <= 0) return;

    // Atomic increment — returns the new balance
    const updateRaw = await this.customerRepo.manager.query(
      `UPDATE customers
       SET points_balance = points_balance + $1, lifetime_points = lifetime_points + $1
       WHERE id = $2
       RETURNING points_balance, lifetime_points`,
      [points, customerId],
    );
    const updateRows = Array.isArray(updateRaw[0]) ? updateRaw[0] : updateRaw;
    const { points_balance: balanceAfter, lifetime_points: lifetimeAfter } = updateRows[0];

    // Insert points history row
    const historyEntry = this.pointsHistoryRepo.create({
      business_id: businessId,
      customer_id: customerId,
      delta: points,
      balance_after: balanceAfter,
      source: 'sale',
      transaction_id: transaction.id,
    });
    await this.pointsHistoryRepo.save(historyEntry);

    // Grade promotion: find the highest grade whose min_points <= lifetime_points
    const grades = await this.gradeRepo.find({
      where: { business_id: businessId, is_active: true },
      order: { min_points: 'DESC' },
    });
    const newGrade = grades.find((g) => lifetimeAfter >= g.min_points);
    const newGradeId = newGrade?.id ?? null;
    if (newGradeId !== (customer.grade_id ?? null)) {
      await this.customerRepo.manager.query(
        `UPDATE customers SET grade_id = $1 WHERE id = $2`,
        [newGradeId, customerId],
      );
    }

    // Update transaction with earned points
    await this.transactionRepo.update(transaction.id, { points_earned: points });
    transaction.points_earned = points;
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
        where: { pin: dto.manager_pin, business_id: txn.business_id, is_active: true },
      });
      if (!manager || !userHasPermission(manager, 'can_void')) {
        throw new UnauthorizedException('Invalid manager PIN');
      }
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
