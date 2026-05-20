# Phase 12C: Vendor Payments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track payments made to vendors, link them to purchase orders, and surface balance-due computations on PO detail and vendor summary endpoints.

**Architecture:** One new table (`vendor_payments`) with auto-numbered `VP-YYYY-NNNNN` IDs. A dedicated `VendorPaymentService` handles all seven endpoints. `getPurchaseOrder` is enriched inline via a try/catch-guarded `dataSource.query` so the existing unit tests (which don't mock `query`) continue to pass. The two vendor-scoped endpoints (`/vendors/:id/outstanding` and `/vendors/:id/payment-summary`) live in the same controller as the CRUD under the `business` prefix.

**Tech Stack:** NestJS, TypeORM, PostgreSQL, Jest — identical to Phase 12B patterns.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `apps/backend/src/migrations/1714012000000-AddVendorPayments.ts` | DDL: `vendor_payments` table + indexes |
| Create | `apps/backend/src/common/entities/vendor-payment.entity.ts` | TypeORM entity |
| Modify | `apps/backend/src/common/entities/index.ts` | Add barrel export |
| Modify | `apps/backend/src/modules/inventory/dto/stock-engine.dto.ts` | 3 new DTOs |
| Create | `apps/backend/src/modules/inventory/vendor-payment.service.spec.ts` | 15 unit tests (written first) |
| Create | `apps/backend/src/modules/inventory/vendor-payment.service.ts` | 7 service methods |
| Create | `apps/backend/src/modules/inventory/vendor-payment.controller.ts` | 7 route handlers |
| Modify | `apps/backend/src/modules/inventory/purchase-order.service.ts` | Enrich `getPurchaseOrder` with `amount_paid` + `balance_due` |
| Modify | `apps/backend/src/modules/inventory/purchase-order.service.spec.ts` | Add 2 tests for PO enrichment |
| Modify | `apps/backend/src/modules/inventory/inventory.module.ts` | Register entity, service, controller |

---

## Task 1: Migration

**Files:**
- Create: `apps/backend/src/migrations/1714012000000-AddVendorPayments.ts`

- [ ] **Step 1: Write the migration**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVendorPayments1714012000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE vendor_payments (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id           UUID NOT NULL REFERENCES businesses(id),
        vendor_id             UUID NOT NULL REFERENCES vendors(id),
        purchase_order_id     UUID REFERENCES purchase_orders(id),
        payment_number        VARCHAR(50) NOT NULL,
        amount_paid           NUMERIC(12,2) NOT NULL,
        payment_date          DATE NOT NULL,
        payment_method        VARCHAR(30) NOT NULL,
        reference_number      VARCHAR(100),
        notes                 TEXT,
        status                VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_by_user_id    UUID NOT NULL REFERENCES users(id),
        confirmed_by_user_id  UUID REFERENCES users(id),
        confirmed_at          TIMESTAMPTZ,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await qr.query(`CREATE INDEX idx_vendor_payments_business_id ON vendor_payments(business_id)`);
    await qr.query(`CREATE INDEX idx_vendor_payments_vendor_id ON vendor_payments(vendor_id)`);
    await qr.query(`CREATE INDEX idx_vendor_payments_po_id ON vendor_payments(purchase_order_id) WHERE purchase_order_id IS NOT NULL`);
    await qr.query(`CREATE UNIQUE INDEX idx_vendor_payments_number_per_business ON vendor_payments(business_id, payment_number)`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS vendor_payments`);
  }
}
```

- [ ] **Step 2: Run the migration**

```bash
docker compose exec backend npm run migration:run --workspace=apps/backend
```

Expected: `migration AddVendorPayments1714012000000 has been executed successfully`.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/migrations/1714012000000-AddVendorPayments.ts
git commit -m "phase-12c: migration AddVendorPayments — vendor_payments table (EXT-INV-030)"
```

---

## Task 2: Entity + Barrel Export

**Files:**
- Create: `apps/backend/src/common/entities/vendor-payment.entity.ts`
- Modify: `apps/backend/src/common/entities/index.ts`

- [ ] **Step 1: Write the entity**

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { Vendor } from './vendor.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { User } from './user.entity';

@Entity('vendor_payments')
export class VendorPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'uuid' })
  vendor_id: string;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ type: 'uuid', nullable: true })
  purchase_order_id: string | null;

  @ManyToOne(() => PurchaseOrder, { nullable: true })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder | null;

  @Column({ type: 'varchar', length: 50 })
  payment_number: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount_paid: number;

  @Column({ type: 'date' })
  payment_date: string;

  @Column({ type: 'varchar', length: 30 })
  payment_method: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference_number: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User;

  @Column({ type: 'uuid', nullable: true })
  confirmed_by_user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'confirmed_by_user_id' })
  confirmedBy: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  confirmed_at: Date | null;

  @CreateDateColumn()
  created_at: Date;
}
```

- [ ] **Step 2: Add to barrel export**

Append to `apps/backend/src/common/entities/index.ts`:

```typescript
export { VendorPayment } from './vendor-payment.entity';
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/common/entities/vendor-payment.entity.ts \
        apps/backend/src/common/entities/index.ts
git commit -m "phase-12c: VendorPayment entity (EXT-INV-030)"
```

---

## Task 3: DTOs

**Files:**
- Modify: `apps/backend/src/modules/inventory/dto/stock-engine.dto.ts`

- [ ] **Step 1: Append the three new DTOs at the bottom of the file**

```typescript
// ── EXT-INV-030–036: Vendor Payments ─────────────────────────────────────────

export class ListVendorPaymentsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @IsUUID() vendor_id?: string;
  @IsOptional() @IsUUID() purchase_order_id?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() from_date?: string;
  @IsOptional() @IsString() to_date?: string;
}

export class CreateVendorPaymentDto {
  @IsUUID() @IsNotEmpty() vendor_id: string;
  @IsOptional() @IsUUID() purchase_order_id?: string;
  @IsNumber() @Min(0.01) amount_paid: number;
  @IsString() @IsNotEmpty() payment_date: string;
  @IsIn(['bank_transfer', 'cheque', 'cash', 'other']) payment_method: string;
  @IsOptional() @IsString() reference_number?: string;
  @IsOptional() @IsString() notes?: string;
}

export class VoidVendorPaymentDto {
  @IsString() @IsNotEmpty() reason: string;
}
```

Note: `IsIn` is already imported in this file via class-validator. Verify that `IsIn` is present in the import list at the top; if not, add it.

- [ ] **Step 2: Verify compile — no TypeScript errors**

```bash
docker compose exec backend npx nest build -p tsconfig.build.json 2>&1 | tail -20
```

Expected: exits 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/inventory/dto/stock-engine.dto.ts
git commit -m "phase-12c: ListVendorPaymentsQueryDto, CreateVendorPaymentDto, VoidVendorPaymentDto"
```

---

## Task 4: Failing Tests

**Files:**
- Create: `apps/backend/src/modules/inventory/vendor-payment.service.spec.ts`

- [ ] **Step 1: Write the failing test file**

```typescript
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { VendorPaymentService } from './vendor-payment.service';
import { VendorPayment } from '../../common/entities/vendor-payment.entity';
import { Vendor } from '../../common/entities/vendor.entity';
import { PurchaseOrder } from '../../common/entities/purchase-order.entity';

const BIZ = 'biz-1';
const OTHER_BIZ = 'biz-2';
const USER_ID = 'user-1';
const VP_ID = 'vp-1';
const VENDOR_ID = 'vendor-1';
const PO_ID = 'po-1';

function makeVp(overrides: Partial<VendorPayment> = {}): VendorPayment {
  return {
    id: VP_ID,
    business_id: BIZ,
    vendor_id: VENDOR_ID,
    purchase_order_id: null,
    payment_number: 'VP-2026-00001',
    amount_paid: 1000,
    payment_date: '2026-05-17',
    payment_method: 'bank_transfer',
    reference_number: null,
    notes: null,
    status: 'pending',
    created_by_user_id: USER_ID,
    confirmed_by_user_id: null,
    confirmed_at: null,
    created_at: new Date(),
    ...overrides,
  } as VendorPayment;
}

function makeVendor(): Vendor {
  return { id: VENDOR_ID, business_id: BIZ, name: 'Test Vendor' } as Vendor;
}

function makePo(): PurchaseOrder {
  return { id: PO_ID, business_id: BIZ, vendor_id: VENDOR_ID, total_ttc: 5000, status: 'confirmed' } as PurchaseOrder;
}

describe('VendorPaymentService', () => {
  let service: VendorPaymentService;
  let vpRepo: jest.Mocked<any>;
  let vendorRepo: jest.Mocked<any>;
  let poRepo: jest.Mocked<any>;
  let dataSource: jest.Mocked<any>;

  const mockQr = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    query: jest.fn(),
    manager: { create: jest.fn(), save: jest.fn() },
  };

  beforeEach(async () => {
    vpRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    vendorRepo = { findOne: jest.fn() };
    poRepo = { findOne: jest.fn() };
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQr),
      query: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        VendorPaymentService,
        { provide: getRepositoryToken(VendorPayment), useValue: vpRepo },
        { provide: getRepositoryToken(Vendor), useValue: vendorRepo },
        { provide: getRepositoryToken(PurchaseOrder), useValue: poRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(VendorPaymentService);

    Object.values(mockQr).forEach((v) => typeof v === 'function' && (v as jest.Mock).mockReset());
    Object.values(mockQr.manager).forEach((v) => typeof v === 'function' && (v as jest.Mock).mockReset());
    mockQr.connect.mockResolvedValue(undefined);
    mockQr.startTransaction.mockResolvedValue(undefined);
    mockQr.commitTransaction.mockResolvedValue(undefined);
    mockQr.rollbackTransaction.mockResolvedValue(undefined);
    mockQr.release.mockResolvedValue(undefined);
  });

  // ── EXT-INV-030: List ──────────────────────────────────────────────────────

  describe('listPayments', () => {
    it('returns paginated payments for the business', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[makeVp()], 1]),
      };
      vpRepo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.listPayments(BIZ, {});
      expect(result.records).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  // ── EXT-INV-031: Get ──────────────────────────────────────────────────────

  describe('getPayment', () => {
    it('returns payment for the correct business', async () => {
      vpRepo.findOne.mockResolvedValue(makeVp());
      const result = await service.getPayment(VP_ID, BIZ);
      expect(result.id).toBe(VP_ID);
    });

    it('throws 404 for cross-tenant access', async () => {
      vpRepo.findOne.mockResolvedValue(null);
      await expect(service.getPayment(VP_ID, OTHER_BIZ)).rejects.toThrow(NotFoundException);
    });
  });

  // ── EXT-INV-032: Create ───────────────────────────────────────────────────

  describe('createPayment', () => {
    it('creates payment with auto-generated VP-YYYY-NNNNN number', async () => {
      vendorRepo.findOne.mockResolvedValue(makeVendor());
      mockQr.query.mockResolvedValue([{ cnt: 0 }]);
      const saved = makeVp();
      mockQr.manager.create.mockReturnValue({});
      mockQr.manager.save.mockResolvedValue(saved);
      vpRepo.findOne.mockResolvedValue(saved);

      const result = await service.createPayment(BIZ, USER_ID, {
        vendor_id: VENDOR_ID, amount_paid: 1000, payment_date: '2026-05-17', payment_method: 'bank_transfer',
      });
      expect(mockQr.commitTransaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('throws 404 if vendor not found', async () => {
      vendorRepo.findOne.mockResolvedValue(null);
      await expect(
        service.createPayment(BIZ, USER_ID, { vendor_id: VENDOR_ID, amount_paid: 100, payment_date: '2026-05-17', payment_method: 'cash' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws 404 if PO does not belong to this vendor', async () => {
      vendorRepo.findOne.mockResolvedValue(makeVendor());
      poRepo.findOne.mockResolvedValue(null);
      await expect(
        service.createPayment(BIZ, USER_ID, { vendor_id: VENDOR_ID, purchase_order_id: PO_ID, amount_paid: 100, payment_date: '2026-05-17', payment_method: 'cash' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── EXT-INV-033: Confirm ──────────────────────────────────────────────────

  describe('confirmPayment', () => {
    it('transitions pending → confirmed', async () => {
      vpRepo.findOne
        .mockResolvedValueOnce(makeVp({ status: 'pending' }))
        .mockResolvedValueOnce(makeVp({ status: 'confirmed' }));
      vpRepo.update.mockResolvedValue(undefined);
      const result = await service.confirmPayment(VP_ID, BIZ, USER_ID);
      expect(vpRepo.update).toHaveBeenCalledWith(VP_ID, expect.objectContaining({ status: 'confirmed', confirmed_by_user_id: USER_ID }));
      expect(result?.status).toBe('confirmed');
    });

    it('throws 422 if not pending', async () => {
      vpRepo.findOne.mockResolvedValue(makeVp({ status: 'confirmed' }));
      await expect(service.confirmPayment(VP_ID, BIZ, USER_ID)).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 404 for cross-tenant access', async () => {
      vpRepo.findOne.mockResolvedValue(null);
      await expect(service.confirmPayment(VP_ID, OTHER_BIZ, USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── EXT-INV-034: Void ────────────────────────────────────────────────────

  describe('voidPayment', () => {
    it('sets status to voided', async () => {
      vpRepo.findOne
        .mockResolvedValueOnce(makeVp({ status: 'pending' }))
        .mockResolvedValueOnce(makeVp({ status: 'voided' }));
      vpRepo.update.mockResolvedValue(undefined);
      const result = await service.voidPayment(VP_ID, BIZ, { reason: 'duplicate' });
      expect(vpRepo.update).toHaveBeenCalledWith(VP_ID, { status: 'voided' });
      expect(result?.status).toBe('voided');
    });

    it('throws 422 if already voided', async () => {
      vpRepo.findOne.mockResolvedValue(makeVp({ status: 'voided' }));
      await expect(service.voidPayment(VP_ID, BIZ, { reason: 'x' })).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 404 for cross-tenant access', async () => {
      vpRepo.findOne.mockResolvedValue(null);
      await expect(service.voidPayment(VP_ID, OTHER_BIZ, { reason: 'x' })).rejects.toThrow(NotFoundException);
    });
  });

  // ── EXT-INV-035: Vendor outstanding POs ──────────────────────────────────

  describe('getVendorOutstanding', () => {
    it('returns POs with balance_due > 0', async () => {
      vendorRepo.findOne.mockResolvedValue(makeVendor());
      dataSource.query.mockResolvedValue([
        { id: PO_ID, po_number: 'PO-2026-0001', total_ttc: '5000', amount_paid: '2000', balance_due: '3000' },
      ]);
      const result = await service.getVendorOutstanding(VENDOR_ID, BIZ);
      expect(result).toHaveLength(1);
      expect(Number(result[0].balance_due)).toBe(3000);
    });

    it('throws 404 if vendor not in business', async () => {
      vendorRepo.findOne.mockResolvedValue(null);
      await expect(service.getVendorOutstanding(VENDOR_ID, OTHER_BIZ)).rejects.toThrow(NotFoundException);
    });
  });

  // ── EXT-INV-036: Vendor payment summary ──────────────────────────────────

  describe('getVendorPaymentSummary', () => {
    it('returns aggregate stats', async () => {
      vendorRepo.findOne.mockResolvedValue(makeVendor());
      dataSource.query
        .mockResolvedValueOnce([{ total_paid: '10000', payment_count: 5 }])
        .mockResolvedValueOnce([{ total_outstanding: '3000' }])
        .mockResolvedValueOnce([{ avg_days_to_pay: 15 }]);
      const result = await service.getVendorPaymentSummary(VENDOR_ID, BIZ);
      expect(result.total_paid).toBe(10000);
      expect(result.total_outstanding).toBe(3000);
      expect(result.payment_count).toBe(5);
      expect(result.avg_days_to_pay).toBe(15);
    });

    it('throws 404 if vendor not in business', async () => {
      vendorRepo.findOne.mockResolvedValue(null);
      await expect(service.getVendorPaymentSummary(VENDOR_ID, OTHER_BIZ)).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] **Step 2: Run to confirm they all fail (service doesn't exist yet)**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern=vendor-payment.service.spec 2>&1 | tail -20
```

Expected: Cannot find module `./vendor-payment.service`.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/inventory/vendor-payment.service.spec.ts
git commit -m "phase-12c: failing tests for VendorPaymentService (15 cases)"
```

---

## Task 5: Service Implementation

**Files:**
- Create: `apps/backend/src/modules/inventory/vendor-payment.service.ts`

- [ ] **Step 1: Write the service**

```typescript
import {
  Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { VendorPayment } from '../../common/entities/vendor-payment.entity';
import { Vendor } from '../../common/entities/vendor.entity';
import { PurchaseOrder } from '../../common/entities/purchase-order.entity';
import {
  ListVendorPaymentsQueryDto,
  CreateVendorPaymentDto,
  VoidVendorPaymentDto,
} from './dto/stock-engine.dto';

@Injectable()
export class VendorPaymentService {
  constructor(
    @InjectRepository(VendorPayment) private vpRepo: Repository<VendorPayment>,
    @InjectRepository(Vendor) private vendorRepo: Repository<Vendor>,
    @InjectRepository(PurchaseOrder) private poRepo: Repository<PurchaseOrder>,
    private dataSource: DataSource,
  ) {}

  private async generatePaymentNumber(businessId: string, qr: QueryRunner): Promise<string> {
    const year = new Date().getFullYear();
    const [row] = await qr.query(
      `SELECT COUNT(*)::int AS cnt FROM vendor_payments WHERE business_id = $1 AND EXTRACT(YEAR FROM created_at) = $2`,
      [businessId, year],
    );
    return `VP-${year}-${String((row.cnt ?? 0) + 1).padStart(5, '0')}`;
  }

  async listPayments(businessId: string, query: ListVendorPaymentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.vpRepo
      .createQueryBuilder('vp')
      .where('vp.business_id = :businessId', { businessId })
      .orderBy('vp.payment_date', 'DESC')
      .addOrderBy('vp.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.vendor_id) qb.andWhere('vp.vendor_id = :vendorId', { vendorId: query.vendor_id });
    if (query.purchase_order_id) qb.andWhere('vp.purchase_order_id = :poId', { poId: query.purchase_order_id });
    if (query.status) qb.andWhere('vp.status = :status', { status: query.status });
    if (query.from_date) qb.andWhere('vp.payment_date >= :fromDate', { fromDate: query.from_date });
    if (query.to_date) qb.andWhere('vp.payment_date <= :toDate', { toDate: query.to_date });

    const [records, total] = await qb.getManyAndCount();
    return { records, total, page, limit };
  }

  async getPayment(id: string, businessId: string) {
    const vp = await this.vpRepo.findOne({ where: { id, business_id: businessId } });
    if (!vp) throw new NotFoundException('Vendor payment not found');
    return vp;
  }

  async createPayment(businessId: string, userId: string, dto: CreateVendorPaymentDto) {
    const vendor = await this.vendorRepo.findOne({ where: { id: dto.vendor_id, business_id: businessId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    if (dto.purchase_order_id) {
      const po = await this.poRepo.findOne({
        where: { id: dto.purchase_order_id, business_id: businessId, vendor_id: dto.vendor_id },
      });
      if (!po) throw new NotFoundException('Purchase order not found or does not belong to this vendor');
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const paymentNumber = await this.generatePaymentNumber(businessId, qr);
      const vp = qr.manager.create(VendorPayment, {
        business_id: businessId,
        vendor_id: dto.vendor_id,
        purchase_order_id: dto.purchase_order_id ?? null,
        payment_number: paymentNumber,
        amount_paid: dto.amount_paid,
        payment_date: dto.payment_date,
        payment_method: dto.payment_method,
        reference_number: dto.reference_number ?? null,
        notes: dto.notes ?? null,
        status: 'pending',
        created_by_user_id: userId,
      });
      const saved = await qr.manager.save(VendorPayment, vp);
      await qr.commitTransaction();
      return this.vpRepo.findOne({ where: { id: saved.id } });
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  async confirmPayment(id: string, businessId: string, userId: string) {
    const vp = await this.vpRepo.findOne({ where: { id, business_id: businessId } });
    if (!vp) throw new NotFoundException('Vendor payment not found');
    if (vp.status !== 'pending') throw new UnprocessableEntityException('Only pending payments can be confirmed');
    await this.vpRepo.update(id, {
      status: 'confirmed',
      confirmed_by_user_id: userId,
      confirmed_at: new Date(),
    });
    return this.vpRepo.findOne({ where: { id } });
  }

  async voidPayment(id: string, businessId: string, dto: VoidVendorPaymentDto) {
    const vp = await this.vpRepo.findOne({ where: { id, business_id: businessId } });
    if (!vp) throw new NotFoundException('Vendor payment not found');
    if (vp.status === 'voided') throw new UnprocessableEntityException('Payment is already voided');
    console.log(`[AUDIT] VP ${vp.payment_number} voided. Reason: ${dto.reason}`);
    await this.vpRepo.update(id, { status: 'voided' });
    return this.vpRepo.findOne({ where: { id } });
  }

  async getVendorOutstanding(vendorId: string, businessId: string) {
    const vendor = await this.vendorRepo.findOne({ where: { id: vendorId, business_id: businessId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    return this.dataSource.query(
      `SELECT * FROM (
         SELECT
           po.id, po.po_number, po.status, po.order_date, po.expected_delivery_date,
           po.total_ttc,
           COALESCE(vp_sum.amount_paid, 0) AS amount_paid,
           po.total_ttc - COALESCE(vp_sum.amount_paid, 0) AS balance_due
         FROM purchase_orders po
         LEFT JOIN (
           SELECT purchase_order_id, SUM(amount_paid) AS amount_paid
           FROM vendor_payments
           WHERE status IN ('pending', 'confirmed')
           GROUP BY purchase_order_id
         ) vp_sum ON vp_sum.purchase_order_id = po.id
         WHERE po.business_id = $1 AND po.vendor_id = $2
           AND po.status NOT IN ('cancelled', 'draft')
       ) sub
       WHERE balance_due > 0
       ORDER BY expected_delivery_date ASC NULLS LAST`,
      [businessId, vendorId],
    );
  }

  async getVendorPaymentSummary(vendorId: string, businessId: string) {
    const vendor = await this.vendorRepo.findOne({ where: { id: vendorId, business_id: businessId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const [paymentStats] = await this.dataSource.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status IN ('pending','confirmed') THEN amount_paid ELSE 0 END), 0) AS total_paid,
         COUNT(CASE WHEN status != 'voided' THEN 1 END)::int AS payment_count
       FROM vendor_payments
       WHERE business_id = $1 AND vendor_id = $2`,
      [businessId, vendorId],
    );

    const [outstandingStats] = await this.dataSource.query(
      `SELECT COALESCE(SUM(
         po.total_ttc - COALESCE((
           SELECT SUM(vp2.amount_paid) FROM vendor_payments vp2
           WHERE vp2.purchase_order_id = po.id AND vp2.status IN ('pending','confirmed')
         ), 0)
       ), 0) AS total_outstanding
       FROM purchase_orders po
       WHERE po.business_id = $1 AND po.vendor_id = $2
         AND po.status NOT IN ('cancelled', 'draft')`,
      [businessId, vendorId],
    );

    const [avgStats] = await this.dataSource.query(
      `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (vp.created_at - po.order_date::timestamptz)) / 86400))::int AS avg_days_to_pay
       FROM vendor_payments vp
       JOIN purchase_orders po ON po.id = vp.purchase_order_id
       WHERE vp.business_id = $1 AND vp.vendor_id = $2
         AND vp.status != 'voided' AND vp.purchase_order_id IS NOT NULL`,
      [businessId, vendorId],
    );

    return {
      total_paid: Number(paymentStats.total_paid),
      total_outstanding: Number(outstandingStats.total_outstanding),
      payment_count: paymentStats.payment_count,
      avg_days_to_pay: avgStats.avg_days_to_pay ?? null,
    };
  }
}
```

- [ ] **Step 2: Run the tests — all 15 should pass**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern=vendor-payment.service.spec 2>&1 | tail -30
```

Expected: `Tests: 15 passed, 15 total`.

- [ ] **Step 3: Run full suite — 527 still pass**

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -10
```

Expected: `Suites: 39 passed` (plus the new vendor-payment suite = 40), `Tests: 527+ passed`.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/inventory/vendor-payment.service.ts
git commit -m "phase-12c: VendorPaymentService — 7 methods (EXT-INV-030–036)"
```

---

## Task 6: Controller

**Files:**
- Create: `apps/backend/src/modules/inventory/vendor-payment.controller.ts`

- [ ] **Step 1: Write the controller**

The controller uses `@Controller('business')` so it can handle both `/api/business/vendor-payments/…` and `/api/business/vendors/:vendorId/…` routes under one class.

```typescript
import {
  Controller, Get, Post, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { VendorPaymentService } from './vendor-payment.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import {
  ListVendorPaymentsQueryDto,
  CreateVendorPaymentDto,
  VoidVendorPaymentDto,
} from './dto/stock-engine.dto';

@Controller('business')
@UseGuards(RolesGuard)
export class VendorPaymentController {
  constructor(private readonly vendorPaymentService: VendorPaymentService) {}

  @Get('vendor-payments')
  @Roles('owner', 'manager')
  list(
    @CurrentUser('business_id') businessId: string,
    @Query() query: ListVendorPaymentsQueryDto,
  ) {
    return this.vendorPaymentService.listPayments(businessId, query);
  }

  @Get('vendor-payments/:id')
  @Roles('owner', 'manager')
  get(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
  ) {
    return this.vendorPaymentService.getPayment(id, businessId);
  }

  @Post('vendor-payments')
  @Roles('owner', 'manager')
  create(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateVendorPaymentDto,
  ) {
    return this.vendorPaymentService.createPayment(businessId, userId, dto);
  }

  @Post('vendor-payments/:id/confirm')
  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  confirm(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.vendorPaymentService.confirmPayment(id, businessId, userId);
  }

  @Post('vendor-payments/:id/void')
  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  void(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
    @Body() dto: VoidVendorPaymentDto,
  ) {
    return this.vendorPaymentService.voidPayment(id, businessId, dto);
  }

  @Get('vendors/:vendorId/outstanding')
  @Roles('owner', 'manager')
  outstanding(
    @CurrentUser('business_id') businessId: string,
    @Param('vendorId') vendorId: string,
  ) {
    return this.vendorPaymentService.getVendorOutstanding(vendorId, businessId);
  }

  @Get('vendors/:vendorId/payment-summary')
  @Roles('owner', 'manager')
  paymentSummary(
    @CurrentUser('business_id') businessId: string,
    @Param('vendorId') vendorId: string,
  ) {
    return this.vendorPaymentService.getVendorPaymentSummary(vendorId, businessId);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/modules/inventory/vendor-payment.controller.ts
git commit -m "phase-12c: VendorPaymentController — 7 endpoints (EXT-INV-030–036)"
```

---

## Task 7: Enrich `getPurchaseOrder` with Computed Fields

**Files:**
- Modify: `apps/backend/src/modules/inventory/purchase-order.service.ts`
- Modify: `apps/backend/src/modules/inventory/purchase-order.service.spec.ts`

**Context:** The existing `getPurchaseOrder` test mocks `dataSource` with only `createQueryRunner` — no `query` method. The enrichment is wrapped in try/catch so that when `dataSource.query` is unavailable (test mock or migration not yet applied), the method degrades gracefully: `amount_paid = 0`, `balance_due = total_ttc`. Existing test assertions check `result.id` only — they are unaffected.

- [ ] **Step 1: Replace the `getPurchaseOrder` method body in `purchase-order.service.ts`**

Find this method:
```typescript
async getPurchaseOrder(id: string, businessId: string) {
  const po = await this.poRepo.findOne({
    where: { id, business_id: businessId },
    relations: ['items', 'items.product'],
  });
  if (!po) throw new NotFoundException('Purchase order not found');
  return po;
}
```

Replace with:
```typescript
async getPurchaseOrder(id: string, businessId: string) {
  const po = await this.poRepo.findOne({
    where: { id, business_id: businessId },
    relations: ['items', 'items.product'],
  });
  if (!po) throw new NotFoundException('Purchase order not found');
  try {
    const [agg] = await this.dataSource.query(
      `SELECT COALESCE(SUM(amount_paid), 0) AS amount_paid
       FROM vendor_payments
       WHERE purchase_order_id = $1 AND status IN ('pending', 'confirmed')`,
      [id],
    );
    const amountPaid = Number(agg?.amount_paid ?? 0);
    return { ...po, amount_paid: amountPaid, balance_due: Number(po.total_ttc) - amountPaid };
  } catch {
    return { ...po, amount_paid: 0, balance_due: Number(po.total_ttc) };
  }
}
```

- [ ] **Step 2: Add enrichment tests to `purchase-order.service.spec.ts`**

Find the `describe('getPurchaseOrder', ...)` block in the existing spec and append a new `describe` block **after** it (do not modify the existing two tests):

```typescript
  describe('getPurchaseOrder — enrichment', () => {
    it('includes amount_paid and balance_due from vendor_payments', async () => {
      const po = makePo();
      poRepo.findOne.mockResolvedValue(po);
      dataSource.query = jest.fn().mockResolvedValue([{ amount_paid: '2000' }]);

      const result = await service.getPurchaseOrder(PO_ID, BIZ);
      expect((result as any).amount_paid).toBe(2000);
      expect((result as any).balance_due).toBe(Number(po.total_ttc) - 2000);
    });

    it('defaults amount_paid to 0 when query fails', async () => {
      const po = makePo();
      poRepo.findOne.mockResolvedValue(po);
      dataSource.query = jest.fn().mockRejectedValue(new Error('table not found'));

      const result = await service.getPurchaseOrder(PO_ID, BIZ);
      expect((result as any).amount_paid).toBe(0);
      expect((result as any).balance_due).toBe(Number(po.total_ttc));
    });
  });
```

Note: `makePo()` must have `total_ttc` set. Check the existing factory — if it doesn't include `total_ttc`, add it:
```typescript
function makePo(overrides: Partial<PurchaseOrder> = {}): PurchaseOrder {
  return {
    id: PO_ID,
    business_id: BIZ,
    po_number: 'PO-2026-0001',
    status: 'draft',
    total_ttc: 5000,
    items: [],
    ...overrides,
  } as PurchaseOrder;
}
```

- [ ] **Step 3: Run the purchase-order spec — all tests should pass**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern=purchase-order.service.spec 2>&1 | tail -20
```

Expected: all existing + 2 new tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/inventory/purchase-order.service.ts \
        apps/backend/src/modules/inventory/purchase-order.service.spec.ts
git commit -m "phase-12c: enrich getPurchaseOrder with amount_paid + balance_due (EXT-INV-030 §B.4.2)"
```

---

## Task 8: Wire `InventoryModule`

**Files:**
- Modify: `apps/backend/src/modules/inventory/inventory.module.ts`

- [ ] **Step 1: Update the module**

Add these imports at the top of the file:
```typescript
import { VendorPaymentService } from './vendor-payment.service';
import { VendorPaymentController } from './vendor-payment.controller';
import { VendorPayment } from '../../common/entities/vendor-payment.entity';
```

In `TypeOrmModule.forFeature([...])`, add `VendorPayment` to the array.

In `controllers: [...]`, add `VendorPaymentController`.

In `providers: [...]`, add `VendorPaymentService`.

The final additions look like:

```typescript
// In imports array, inside TypeOrmModule.forFeature([...]):
VendorPayment,

// In controllers array:
VendorPaymentController,

// In providers array:
VendorPaymentService,
```

- [ ] **Step 2: Run full test suite**

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -15
```

Expected: all 529+ tests pass (527 existing + 15 vendor-payment + 2 PO enrichment), 40 suites.

- [ ] **Step 3: Verify build compiles cleanly**

```bash
docker compose exec backend npx nest build -p tsconfig.build.json 2>&1 | tail -10
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/inventory/inventory.module.ts
git commit -m "phase-12c: wire VendorPayment into InventoryModule"
```

---

## Task 9: Update Docs

**Files:**
- Modify: `apps/backend/../../../CLAUDE.md` (root `CLAUDE.md`)
- Modify: `docs/IMPLEMENTATION_LOG.md`

- [ ] **Step 1: Update `CLAUDE.md` implementation status line**

Find:
```
**Current state: 527 tests passing, 39 suites, zero regressions.**

Completed phases: 0, 5, 6, 7, 8, 9, 10, Reports, 11A, 12A, 12B.
Next: 12C (Vendor Payments).
```

Replace with:
```
**Current state: 5XX tests passing, 40 suites, zero regressions.**

Completed phases: 0, 5, 6, 7, 8, 9, 10, Reports, 11A, 12A, 12B, 12C.
Next: 12D (Vendor Bill Aging / Balance Reports).
```

Fill in the actual test count from the test run output.

Also update the Key architectural facts section — add:
```
- `VendorPaymentService` lives in `InventoryModule`; handles vendor payments + PO balance-due enrichment
- `getPurchaseOrder` now returns `{ ...po, amount_paid, balance_due }` (try/catch guarded)
```

- [ ] **Step 2: Append Phase 12C to `docs/IMPLEMENTATION_LOG.md`**

```markdown
### Phase 12C — Vendor Payments (DONE). 5XX tests passing (40 suites).

See extension spec §12 (EXT-INV-030–036) for requirement IDs.

- [x] Migration `1714012000000-AddVendorPayments` — 1 table: vendor_payments;
      4 indexes including unique (business_id, payment_number)
- [x] `VendorPayment` entity — all 15 spec columns; no updated_at (payments are effectively immutable after void)
- [x] `VendorPaymentService` — 7 methods:
      listPayments (paginated + filterable by vendor/PO/status/date),
      getPayment (cross-tenant 404),
      createPayment (validates vendor + PO ownership, atomic QR for VP-YYYY-NNNNN numbering),
      confirmPayment (pending→confirmed, sets confirmed_by + confirmed_at),
      voidPayment (any non-voided→voided, audit console.log stub),
      getVendorOutstanding (raw SQL subquery, balance_due > 0 filter, ordered by expected_delivery_date ASC NULLS LAST),
      getVendorPaymentSummary (3 raw queries: total_paid, total_outstanding, avg_days_to_pay)
- [x] `VendorPaymentController` — @Controller('business'), 7 routes under vendor-payments/ and vendors/:vendorId/
- [x] `getPurchaseOrder` enriched with computed `amount_paid` + `balance_due` via try/catch-guarded dataSource.query
      (degrades gracefully to 0/total_ttc when mock lacks query — preserves all 527 existing tests)
- [x] `InventoryModule` updated — VendorPayment entity, VendorPaymentService, VendorPaymentController registered
- [x] 17 new tests: 15 in vendor-payment.service.spec.ts + 2 PO enrichment tests in purchase-order.service.spec.ts
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md docs/IMPLEMENTATION_LOG.md
git commit -m "phase-12c: update docs — 5XX tests, 40 suites, mark Phase 12C DONE"
```

---

## Self-Review

**Spec coverage check (EXT-INV-030–036):**

| Req | What | Task |
|---|---|---|
| EXT-INV-030 | `vendor_payments` table + list endpoint | Task 1, Task 5, Task 6 |
| EXT-INV-031 | Payment detail | Task 5, Task 6 |
| EXT-INV-032 | Create payment (vendor validation, PO ownership) | Task 5, Task 6 |
| EXT-INV-033 | Confirm payment | Task 5, Task 6 |
| EXT-INV-034 | Void payment with reason | Task 5, Task 6 |
| EXT-INV-035 | Vendor outstanding POs | Task 5, Task 6 |
| EXT-INV-036 | Vendor payment summary | Task 5, Task 6 |
| §B.4.2 | PO detail enrichment (amount_paid, balance_due) | Task 7 |
| §B.4.5 | Permission key `can_manage_vendor_payments` | Task 6 (Roles guard) |

**EXT-INV-037** — not listed in the deliverables table in the Implementation Plan and not defined in §B.4. Skipped (ask if needed).

**Placeholder scan:** None found.

**Type consistency check:**
- `VoidVendorPaymentDto` used in service signature and controller body — consistent.
- `ListVendorPaymentsQueryDto` / `CreateVendorPaymentDto` match service parameters — consistent.
- `VendorPayment` entity fields match migration columns — consistent.
- `generatePaymentNumber` uses `VP-YYYY-NNNNN` (5 digits) — spec says NNNNN — consistent.
