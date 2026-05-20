# Phase 16 Cross-Cutting Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all `console.log([AUDIT]...)` stubs with real `audit_logs` DB writes, add WebSocket event emissions to inventory background processors, and standardize all error throws across every module to use machine-readable `{ error: 'MODULE_ERROR_KEY' }` objects.

**Architecture:** The `audit_logs` table and `AuditLog` entity already exist and are used by `super-admin` and `communications` modules — this pass wires up the three remaining stubs. The `EventGateway` is already `@Global()` via `CommonModule` and can be injected into any NestJS-managed class including BullMQ processors without module changes. Error key standardization is a mechanical find-replace: every `throw new XException('plain string')` becomes `throw new XException({ error: 'SCREAMING_KEY', message: 'plain string' })` following the pattern established in RST-* and ADM-* modules.

**Tech Stack:** NestJS, TypeORM (Repository), Socket.io (EventGateway), BullMQ (WorkerHost), PostgreSQL.

---

## Context: What already has error keys (do not re-do)

These throws already use `{ error: '...' }` — skip them:

- **Restaurant:** all `RST_*` keys already set (`RST_SESSION_NOT_OPEN`, `RST_ITEM_IN_KITCHEN`, `RST_ORPHAN_ITEM_IN_SPLIT`, `RST_DUPLICATE_ITEM_IN_SPLIT`)
- **Platform Admin:** all `ADM_*` keys already set
- **Chain:** `CHAIN_*` keys already set in `chain.service.ts`
- **KDS:** `kds.service.ts:177` — already has `{ error: 'KDS_INVALID_TRANSITION' }`
- **Reports:** `REPORT_NOT_FOUND` and `REPORT_NOT_IMPLEMENTED` already set
- **Recommendation:** `REC_ITEMS_NOT_ALLOWED` already set (line 86)

## File Structure

**Task 1 — Audit log DB writes:**
- Modify: `apps/backend/src/modules/chain/chain.service.ts`
- Modify: `apps/backend/src/modules/chain/chain.module.ts`
- Modify: `apps/backend/src/modules/inventory/vendor-payment.service.ts`
- Modify: `apps/backend/src/modules/inventory/vendor-payment.controller.ts`
- Modify: `apps/backend/src/modules/inventory/inventory.module.ts`
- Modify: `apps/backend/src/modules/restaurant/table-session.service.ts`
- Modify: `apps/backend/src/modules/restaurant/restaurant.module.ts`

**Task 2 — Inventory WebSocket events:**
- Modify: `apps/backend/src/modules/inventory/processors/expiration-scan.processor.ts`
- Modify: `apps/backend/src/modules/inventory/processors/reconciliation.processor.ts`

**Tasks 3–7 — Error key standardization (one task per module cluster):**
- Task 3: `customer/customer.service.ts`, `customer/customer.controller.ts`
- Task 4: `promotion/promotion.service.ts`, `promotion/coupon.service.ts`, `promotion/coupon-ext.service.ts`, `promotion/pex.service.ts`
- Task 5: `inventory/inventory.service.ts`, `inventory/stock-batch.service.ts`, `inventory/purchase-order.service.ts`, `inventory/stock-template.service.ts`, `inventory/alert.service.ts`, `inventory/stock-adjustment.service.ts`, `inventory/stock-transfer.service.ts`, `inventory/vendor-payment.service.ts`
- Task 6: `restaurant/table-session.service.ts`, `restaurant/checkout.service.ts`, `restaurant/restaurant.service.ts`
- Task 7: `communications/communications.service.ts`, `communications/notification-send.service.ts`, `chain/chain.service.ts`, `auth/auth.service.ts`, `business/business.service.ts`, `terminal/terminal.service.ts`, `kds/kds.service.ts`, `recommendation/recommendation.service.ts`, `super-admin/super-admin.service.ts`, `jobs/job.service.ts`, `jobs/job.controller.ts`

---

## Canonical Error Key Reference Table

All new keys introduced by this plan:

| Key | Module | Meaning |
|-----|--------|---------|
| `CUST_NOT_FOUND` | customer | Customer not found |
| `CUST_PHONE_CONFLICT` | customer | Phone number already registered |
| `CUST_GRADE_NOT_FOUND` | customer | Customer grade not found |
| `CUST_LABEL_NOT_FOUND` | customer | Customer label not found |
| `CUST_ATTR_NOT_FOUND` | customer | Custom attribute not found |
| `CUST_ATTR_TYPE_IMMUTABLE` | customer | data_type cannot change once set |
| `CUST_ATTR_VALIDATION_FAILED` | customer | Attribute value validation failed |
| `CUST_POINTS_INSUFFICIENT` | customer | Adjustment would make points balance negative |
| `CUST_PERMISSION_DENIED` | customer | Insufficient permissions to adjust points |
| `PROM_NOT_FOUND` | promotion | Promotion not found |
| `PROM_CATEGORY_NOT_FOUND` | promotion | target_category_id not found |
| `PROM_PRODUCT_NOT_FOUND` | promotion | target_product_id not found |
| `PROM_GRADE_CROSS_TENANT` | promotion | target_grade_ids from another business |
| `PROM_LABEL_CROSS_TENANT` | promotion | target_label_ids from another business |
| `PROM_CUSTOMER_CROSS_TENANT` | promotion | target_customer_ids from another business |
| `PROM_LOCATION_CROSS_TENANT` | promotion | applicable_location_ids from another business |
| `PROM_PERCENTAGE_INVALID` | promotion | value must be 0–100 for percentage types |
| `PROM_DATE_INVALID` | promotion | start_date must be ≤ end_date |
| `PROM_CODE_CONFLICT` | promotion | Promotion code already exists |
| `PROM_LOCKED_FIELD` | promotion | Cannot modify locked field after first redemption |
| `PROM_ALREADY_ARCHIVED` | promotion | Archived promotion cannot be reactivated or paused |
| `PROM_ARCHIVE_AGAIN` | promotion | Promotion is already archived |
| `CPN_TYPE_NOT_FOUND` | coupon | Coupon type not found or inactive |
| `CPN_NOT_FOUND` | coupon | Coupon not found |
| `CPN_ALREADY_REDEEMED` | coupon | Coupon already redeemed |
| `PEX_RULE_NOT_FOUND` | pex | Exchange rule not found |
| `PEX_RULE_INACTIVE` | pex | Exchange rule is not active |
| `PEX_POINT_VALUE_IMMUTABLE` | pex | point_value is immutable once used |
| `PEX_RULE_DEACTIVATED` | pex | Exchange rule is already deactivated |
| `PEX_CUSTOMER_NOT_FOUND` | pex | Customer not found |
| `PEX_POINTS_INSUFFICIENT` | pex | Insufficient points for redemption |
| `PEX_DAILY_LIMIT_EXCEEDED` | pex | Daily redemption limit exceeded |
| `PEX_TOTAL_LIMIT_EXCEEDED` | pex | Total redemption limit exceeded |
| `INV_UOM_NOT_FOUND` | inventory | Unit of measure not found |
| `INV_UOM_SYSTEM_DELETE` | inventory | System units cannot be deleted |
| `INV_UOM_IN_USE` | inventory | Unit is in use by products |
| `INV_WAREHOUSE_NOT_FOUND` | inventory | Warehouse not found |
| `INV_WAREHOUSE_CODE_CONFLICT` | inventory | Warehouse code already exists |
| `INV_VENDOR_NOT_FOUND` | inventory | Vendor not found |
| `INV_VENDOR_CODE_CONFLICT` | inventory | Vendor code already exists |
| `INV_BRAND_NOT_FOUND` | inventory | Brand not found |
| `INV_BRAND_NAME_CONFLICT` | inventory | Brand name already exists |
| `INV_PRODUCT_NOT_FOUND` | inventory | Product not found |
| `INV_NUTRITION_NOT_FOUND` | inventory | No nutrition info for this product |
| `INV_BATCH_NOT_FOUND` | stock-batch | Batch not found |
| `INV_BATCH_WAREHOUSE_NOT_FOUND` | stock-batch | Warehouse not found (receiving) |
| `INV_BATCH_FEATURE_DISABLED` | stock-batch | Stock adjustment approval not enabled |
| `INV_BATCH_DISPOSE_EXCESS` | stock-batch | Disposal quantity exceeds available |
| `INV_BATCH_TRANSFER_EXCESS` | stock-batch | Transfer quantity exceeds available |
| `INV_BATCH_TARGET_WAREHOUSE_NOT_FOUND` | stock-batch | Target warehouse not found |
| `INV_BATCH_INSUFFICIENT_STOCK` | stock-batch | Insufficient stock in source batch (inQr) |
| `INV_PO_NOT_FOUND` | purchase-order | Purchase order not found |
| `INV_PO_ITEM_NOT_FOUND` | purchase-order | PO item not found |
| `INV_PO_NOT_DRAFT` | purchase-order | Only draft POs can be updated/sent |
| `INV_PO_INVALID_STATUS` | purchase-order | PO cannot be confirmed/received in current status |
| `INV_PO_CANCEL_RECEIVED` | purchase-order | Cannot cancel a PO with received items |
| `INV_TEMPLATE_NOT_FOUND` | stock-template | Template not found |
| `INV_ALERT_EXP_NOT_FOUND` | alert | Expiration alert not found |
| `INV_ALERT_EXP_RESOLVED` | alert | Expiration alert already resolved |
| `INV_ALERT_DISC_NOT_FOUND` | alert | Discrepancy alert not found |
| `INV_ALERT_DISC_RESOLVED` | alert | Discrepancy alert already resolved |
| `INV_ADJ_NOT_FOUND` | stock-adjustment | Stock adjustment not found |
| `INV_ADJ_BATCH_NOT_FOUND` | stock-adjustment | Batch not found during adjustment |
| `INV_ADJ_INVALID_STATUS` | stock-adjustment | Adjustment not in required status |
| `INV_TRANSFER_NOT_FOUND` | stock-transfer | Stock transfer not found |
| `INV_TRANSFER_SAME_WAREHOUSE` | stock-transfer | Source and target must differ |
| `INV_TRANSFER_SOURCE_NOT_FOUND` | stock-transfer | Source warehouse not found |
| `INV_TRANSFER_TARGET_NOT_FOUND` | stock-transfer | Target warehouse not found |
| `INV_TRANSFER_INSUFFICIENT_STOCK` | stock-transfer | Insufficient stock in source batch |
| `INV_TRANSFER_INVALID_STATUS` | stock-transfer | Only draft transfers can be posted |
| `INV_TRANSFER_EMPTY` | stock-transfer | Transfer has no items |
| `INV_VENDOR_PAYMENT_NOT_FOUND` | vendor-payment | Vendor payment not found |
| `INV_VENDOR_PAYMENT_VOIDED` | vendor-payment | Payment is already voided |
| `RST_SESSION_NOT_FOUND` | checkout/table-session | Table session not found |
| `RST_PERM_CLOSE` | checkout | Missing permission: can_close_table_session |
| `RST_PERM_CLOSE_PARTIAL` | table-session | Missing permission: can_close_table_session_partial |
| `RST_PERM_TRANSFER` | table-session | Missing permission: can_transfer_table_items |
| `RST_AREA_NOT_FOUND` | restaurant | Dining area not found |
| `RST_AREA_HAS_TABLES` | restaurant | Cannot delete area with active tables |
| `RST_AREA_NAME_CONFLICT` | restaurant | Dining area name already exists |
| `RST_TABLE_TYPE_NOT_FOUND` | restaurant | Table type not found |
| `RST_TABLE_NOT_FOUND` | restaurant | Table not found |
| `RST_TABLE_NUMBER_CONFLICT` | restaurant | Table number already exists |
| `RST_TABLE_HAS_SESSION` | restaurant | Cannot delete table with open session |
| `COM_ANNOUNCEMENT_NOT_FOUND` | communications | Announcement not found |
| `COM_TEMPLATE_NOT_FOUND` | communications | Notification template not found |
| `COM_TEMPLATE_HAS_SENDS` | communications | Cannot delete template with send history |
| `COM_NO_CHANNEL_CREDENTIALS` | communications | No active channel credentials |
| `COM_CONSENT_REQUIRED` | communications | Customer consent required for marketing |
| `COM_SMS_INSUFFICIENT_BALANCE` | communications | Insufficient SMS balance |
| `COM_SEND_NOT_APPLICABLE` | communications | Non-marketing sends do not need opt-out |
| `COM_OPT_OUT_TOKEN_INVALID` | communications | Invalid opt-out token |
| `CHN_BUSINESS_NOT_FOUND` | chain | Business not found |
| `CHN_CANNOT_PROMOTE_CHILD` | chain | Child cannot be promoted to parent |
| `CHN_SELF_PARENT` | chain | Business cannot be its own parent |
| `CHN_PARENT_NOT_FOUND` | chain | Parent business not found |
| `CHN_NOT_PARENT` | chain | Target is not a chain parent |
| `CHN_ACCESS_DENIED` | chain | No access to this business |
| `CHN_USER_NOT_FOUND` | chain | User not found |
| `CHN_NOT_IN_CHAIN` | chain | One or more businesses not in this chain |
| `CHN_SYNC_JOB_NOT_FOUND` | chain | Sync job not found |
| `CHN_NO_PARENT` | chain | Business has no parent |
| `CHN_PRODUCT_NOT_FOUND` | chain | Product not found in parent catalogue |
| `CHN_PO_NOT_FOUND` | chain | PO not found or not accessible |
| `AUTH_INVALID_CREDENTIALS` | auth | Invalid credentials |
| `AUTH_NO_DASHBOARD_ACCESS` | auth | No dashboard access |
| `AUTH_TERMINAL_NOT_FOUND` | auth | Terminal not found |
| `AUTH_INVALID_PIN` | auth | Invalid PIN |
| `AUTH_INVALID_REFRESH` | auth | Invalid refresh token |
| `AUTH_USER_NOT_FOUND` | auth | User not found |
| `AUTH_PASSWORD_INCORRECT` | auth | Current password is incorrect |
| `BIZ_CATEGORY_NOT_FOUND` | business | Category not found |
| `BIZ_PRODUCT_NOT_FOUND` | business | Product not found |
| `TERM_TERMINAL_NOT_FOUND` | terminal | Terminal not found or inactive |
| `TERM_CUSTOMER_NOT_FOUND` | terminal | Customer not found |
| `TERM_PHONE_CONFLICT` | terminal | Phone number already registered |
| `TERM_COUPON_NOT_FOUND` | terminal | Coupon not found |
| `TERM_TRANSACTION_NOT_FOUND` | terminal | Transaction not found |
| `TERM_VOID_INVALID_STATUS` | terminal | Can only void completed transactions |
| `TERM_VOID_MANAGER_REQUIRED` | terminal | Manager PIN required to void |
| `TERM_VOID_MANAGER_INVALID` | terminal | Invalid manager PIN |
| `KDS_ORDER_NOT_FOUND` | kds | KDS order not found |
| `KDS_ITEM_NOT_FOUND` | kds | KDS item not found |
| `REC_TEMPLATE_NOT_FOUND` | recommendation | Recommendation template not found |
| `SA_BUSINESS_NOT_FOUND` | super-admin | Business not found |
| `SA_BUSINESS_TYPE_NOT_FOUND` | super-admin | Business type not found |
| `SA_TERMINAL_CODE_CONFLICT` | super-admin | Terminal code already exists |
| `SA_TERMINAL_NOT_FOUND` | super-admin | Terminal not found |
| `SA_LOCATION_NOT_FOUND` | super-admin | Location not found |
| `SA_SUBSCRIPTION_NOT_FOUND` | super-admin | Subscription not found |
| `SA_ANNOUNCEMENT_NOT_FOUND` | super-admin | Announcement not found |
| `JOB_NOT_FOUND` | job | Job not found |

---

## Task 1: Audit Log DB Writes

Replace 5 `console.log([AUDIT]...)` stubs with real `AuditLog` inserts. Three services need `AuditLog` repo injected; two controller call sites need to pass `userId`.

**Files:**
- Modify: `apps/backend/src/modules/chain/chain.service.ts`
- Modify: `apps/backend/src/modules/chain/chain.module.ts`
- Modify: `apps/backend/src/modules/chain/chain.controller.ts`
- Modify: `apps/backend/src/modules/inventory/vendor-payment.service.ts`
- Modify: `apps/backend/src/modules/inventory/vendor-payment.controller.ts`
- Modify: `apps/backend/src/modules/inventory/inventory.module.ts`
- Modify: `apps/backend/src/modules/restaurant/table-session.service.ts`
- Modify: `apps/backend/src/modules/restaurant/restaurant.module.ts`
- Test: `apps/backend/src/modules/chain/chain.service.spec.ts`
- Test: `apps/backend/src/modules/inventory/vendor-payment.service.spec.ts`
- Test: `apps/backend/src/modules/restaurant/table-session.service.spec.ts`

- [ ] **Step 1: Add AuditLog to chain.module.ts**

In `chain.module.ts`, add `AuditLog` to the `TypeOrmModule.forFeature([...])` array and import it:

```typescript
import { AuditLog } from '../../common/entities/audit-log.entity';
// Inside @Module({ imports: [ TypeOrmModule.forFeature([Business, User, UserBusinessRole, ChainSyncConfig, AuditLog]) ] })
```

- [ ] **Step 2: Inject AuditLog repo and update fulfillChildPo in chain.service.ts**

Add the import and constructor injection:

```typescript
import { AuditLog } from '../../common/entities/audit-log.entity';
// ...
@InjectRepository(AuditLog) private auditLogRepo: Repository<AuditLog>,
```

Change the `fulfillChildPo` signature to accept `performedBy: string` as the last argument:

```typescript
async fulfillChildPo(parentBusinessId: string, poId: string, sourceWarehouseId: string, performedBy: string) {
```

Replace the console.log at the bottom of the `try` block (after `await qr.commitTransaction()`) with:

```typescript
await this.auditLogRepo.save(this.auditLogRepo.create({
  business_id: parentBusinessId,
  user_id: performedBy,
  action: 'fulfill',
  entity_type: 'purchase_order',
  entity_id: poId,
  details_json: { source_warehouse_id: sourceWarehouseId, child_po_id: poId },
}));
```

- [ ] **Step 3: Pass userId from chain.controller.ts**

Update the `fulfillPo` controller method — add `@Request() req: any` if not present and pass `req.user.sub`:

```typescript
fulfillPo(@Param('id') id: string, @Request() req: any, @Body() dto: FulfillChildPoDto) {
  return this.chainService.fulfillChildPo(req.user.business_id, id, dto.source_warehouse_id, req.user.sub);
}
```

- [ ] **Step 4: Add AuditLog to inventory.module.ts**

In `inventory.module.ts`, add `AuditLog` to the existing `TypeOrmModule.forFeature([...])` array (it's a long list — add it after `Business`):

```typescript
import { AuditLog } from '../../common/entities/audit-log.entity';
// Add AuditLog to the forFeature array
```

- [ ] **Step 5: Inject AuditLog repo and update voidPayment in vendor-payment.service.ts**

Add import and constructor injection:

```typescript
import { AuditLog } from '../../common/entities/audit-log.entity';
// ...
@InjectRepository(AuditLog) private auditLogRepo: Repository<AuditLog>,
```

Change `voidPayment` signature to accept `performedBy: string`:

```typescript
async voidPayment(id: string, businessId: string, dto: VoidVendorPaymentDto, performedBy: string) {
```

Replace the console.log:

```typescript
await this.auditLogRepo.save(this.auditLogRepo.create({
  business_id: businessId,
  user_id: performedBy,
  action: 'void',
  entity_type: 'vendor_payment',
  entity_id: id,
  details_json: { payment_number: vp.payment_number, reason: dto.reason },
}));
```

- [ ] **Step 6: Pass userId from vendor-payment.controller.ts**

The `void` method currently uses `@CurrentUser('business_id')`. Add user sub:

```typescript
@Post('vendor-payments/:id/void')
@Roles('owner')
@HttpCode(HttpStatus.OK)
void(
  @CurrentUser('business_id') businessId: string,
  @CurrentUser('sub') userId: string,
  @Param('id') id: string,
  @Body() dto: VoidVendorPaymentDto,
) {
  return this.vendorPaymentService.voidPayment(id, businessId, dto, userId);
}
```

- [ ] **Step 7: Add AuditLog to restaurant.module.ts**

```typescript
import { AuditLog } from '../../common/entities/audit-log.entity';
// Add AuditLog to the TypeOrmModule.forFeature([...]) array
```

- [ ] **Step 8: Inject AuditLog repo into table-session.service.ts**

Add import and constructor injection:

```typescript
import { AuditLog } from '../../common/entities/audit-log.entity';
// ...
@InjectRepository(AuditLog) private auditLogRepo: Repository<AuditLog>,
```

Replace the 3 console.log stubs:

**In `removeItem` (around line 325)** — after `item.kds_status = 'cancelled'` and `await this.itemRepo.save(item)`:

```typescript
await this.auditLogRepo.save(this.auditLogRepo.create({
  business_id: businessId,
  user_id: user.id,
  action: 'void',
  entity_type: 'table_session_item',
  entity_id: itemId,
  details_json: { kds_status_was: item.kds_status, session_id: item.table_session_id },
}));
```

**In `cancelSession` — open branch (around line 434)**:

```typescript
await this.auditLogRepo.save(this.auditLogRepo.create({
  business_id: businessId,
  user_id: user.id,
  action: 'cancel',
  entity_type: 'table_session',
  entity_id: sessionId,
  details_json: { reason: dto.reason, status_was: 'open' },
}));
```

**In `cancelSession` — force_close branch (around line 458)**:

```typescript
await this.auditLogRepo.save(this.auditLogRepo.create({
  business_id: businessId,
  user_id: user.id,
  action: 'force_close',
  entity_type: 'table_session',
  entity_id: sessionId,
  details_json: { reason: dto.reason, partial_payment: true },
}));
```

- [ ] **Step 9: Update spec files to assert auditLogRepo.save is called**

In `chain.service.spec.ts`, add `auditLogRepo` mock to the `makeRepo()` pattern and assert `auditLogRepo.create` + `auditLogRepo.save` are called in the `fulfillChildPo` test:

```typescript
const auditLogRepo = makeRepo();
// In fulfillChildPo test:
expect(auditLogRepo.create).toHaveBeenCalledWith(expect.objectContaining({
  action: 'fulfill',
  entity_type: 'purchase_order',
}));
expect(auditLogRepo.save).toHaveBeenCalled();
```

Do the same for `vendor-payment.service.spec.ts` (voidPayment test) and `table-session.service.spec.ts` (removeItem / cancelSession tests).

- [ ] **Step 10: Run the full test suite**

```bash
docker compose exec backend npm test --workspace=apps/backend
```

Expected: 621 tests passing (same count as before — audit log writes add no new spec files, just assertions in existing ones).

- [ ] **Step 11: Commit**

```bash
git add apps/backend/src/modules/chain/ \
        apps/backend/src/modules/inventory/vendor-payment.service.ts \
        apps/backend/src/modules/inventory/vendor-payment.controller.ts \
        apps/backend/src/modules/inventory/inventory.module.ts \
        apps/backend/src/modules/restaurant/table-session.service.ts \
        apps/backend/src/modules/restaurant/restaurant.module.ts
git commit -m "cross-cutting: replace audit console.log stubs with AuditLog DB writes"
```

---

## Task 2: Inventory WebSocket Events from Background Processors

Emit `inventory:expiration_alert` and `inventory:discrepancy_alert` to `dashboard:${businessId}` rooms when processors create new alerts.

**Files:**
- Modify: `apps/backend/src/modules/inventory/processors/expiration-scan.processor.ts`
- Modify: `apps/backend/src/modules/inventory/processors/reconciliation.processor.ts`
- Test: `apps/backend/src/modules/inventory/processors/expiration-scan.processor.spec.ts` (create)
- Test: `apps/backend/src/modules/inventory/processors/reconciliation.processor.spec.ts` (create)

`EventGateway` is `@Global()` from `CommonModule` — no module changes needed.

- [ ] **Step 1: Write failing tests**

Create `apps/backend/src/modules/inventory/processors/expiration-scan.processor.spec.ts`:

```typescript
import { ExpirationScanProcessor } from './expiration-scan.processor';
import { EventGateway } from '../../../../common/gateways/event.gateway';

const makeRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((x) => x),
  save: jest.fn((x) => x),
});

describe('ExpirationScanProcessor', () => {
  let processor: ExpirationScanProcessor;
  let businessRepo: ReturnType<typeof makeRepo>;
  let alertRepo: ReturnType<typeof makeRepo>;
  let stockConsumptionService: any;
  let eventGateway: jest.Mocked<EventGateway>;

  beforeEach(() => {
    businessRepo = makeRepo();
    alertRepo = makeRepo();
    stockConsumptionService = { findExpiringBatches: jest.fn() };
    eventGateway = { emitToRoom: jest.fn() } as any;
    processor = new ExpirationScanProcessor(
      businessRepo as any,
      alertRepo as any,
      stockConsumptionService,
      eventGateway,
    );
  });

  it('emits inventory:expiration_alert when a new alert is created', async () => {
    businessRepo.find.mockResolvedValue([{ id: 'biz-1', is_active: true, expiration_alert_lead_days: 7 }]);
    stockConsumptionService.findExpiringBatches.mockResolvedValue([
      { id: 'batch-1', warehouse_id: 'wh-1', product_id: 'prod-1', expires_at: new Date(Date.now() - 1000) },
    ]);
    alertRepo.findOne.mockResolvedValue(null); // no existing alert
    alertRepo.save.mockResolvedValue({ id: 'alert-1', severity: 'expired' });

    await processor.process({} as any);

    expect(eventGateway.emitToRoom).toHaveBeenCalledWith(
      'dashboard:biz-1',
      'inventory:expiration_alert',
      expect.objectContaining({ batch_id: 'batch-1', severity: 'expired' }),
    );
  });

  it('does not emit when alert already exists (idempotent)', async () => {
    businessRepo.find.mockResolvedValue([{ id: 'biz-1', is_active: true, expiration_alert_lead_days: 7 }]);
    stockConsumptionService.findExpiringBatches.mockResolvedValue([
      { id: 'batch-1', warehouse_id: 'wh-1', product_id: 'prod-1', expires_at: null },
    ]);
    alertRepo.findOne.mockResolvedValue({ id: 'existing-alert' }); // existing alert — skip

    await processor.process({} as any);

    expect(eventGateway.emitToRoom).not.toHaveBeenCalled();
  });
});
```

Create `apps/backend/src/modules/inventory/processors/reconciliation.processor.spec.ts`:

```typescript
import { ReconciliationProcessor } from './reconciliation.processor';
import { EventGateway } from '../../../../common/gateways/event.gateway';

const makeRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((x) => x),
  save: jest.fn((x) => x),
});

describe('ReconciliationProcessor', () => {
  let processor: ReconciliationProcessor;
  let businessRepo: ReturnType<typeof makeRepo>;
  let discrepancyRepo: ReturnType<typeof makeRepo>;
  let stockConsumptionService: any;
  let eventGateway: jest.Mocked<EventGateway>;

  beforeEach(() => {
    businessRepo = makeRepo();
    discrepancyRepo = makeRepo();
    stockConsumptionService = {
      findNegativeBatches: jest.fn(),
      findRecentOfflineSyncBatches: jest.fn(),
    };
    eventGateway = { emitToRoom: jest.fn() } as any;
    processor = new ReconciliationProcessor(
      businessRepo as any,
      discrepancyRepo as any,
      stockConsumptionService,
      eventGateway,
    );
  });

  it('emits inventory:discrepancy_alert when a new discrepancy alert is created', async () => {
    businessRepo.find.mockResolvedValue([{ id: 'biz-1', is_active: true }]);
    stockConsumptionService.findNegativeBatches.mockResolvedValue([
      { id: 'batch-1', warehouse_id: 'wh-1', product_id: 'prod-1', quantity_remaining: -5 },
    ]);
    stockConsumptionService.findRecentOfflineSyncBatches.mockResolvedValue([]);
    discrepancyRepo.findOne.mockResolvedValue(null); // new alert

    await processor.process({} as any);

    expect(eventGateway.emitToRoom).toHaveBeenCalledWith(
      'dashboard:biz-1',
      'inventory:discrepancy_alert',
      expect.objectContaining({ batch_id: 'batch-1', source: 'system_detected' }),
    );
  });

  it('does not emit when discrepancy alert already exists (idempotent)', async () => {
    businessRepo.find.mockResolvedValue([{ id: 'biz-1', is_active: true }]);
    stockConsumptionService.findNegativeBatches.mockResolvedValue([
      { id: 'batch-1', warehouse_id: 'wh-1', product_id: 'prod-1', quantity_remaining: -5 },
    ]);
    stockConsumptionService.findRecentOfflineSyncBatches.mockResolvedValue([]);
    discrepancyRepo.findOne.mockResolvedValue({ id: 'existing' }); // skip

    await processor.process({} as any);

    expect(eventGateway.emitToRoom).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="expiration-scan.processor|reconciliation.processor"
```

Expected: FAIL — `EventGateway` not in constructor, `emitToRoom` never called.

- [ ] **Step 3: Update expiration-scan.processor.ts**

Add `EventGateway` import and inject it as the 4th constructor parameter. Emit after a new alert is saved in `scanBusiness`:

```typescript
import { EventGateway } from '../../../common/gateways/event.gateway';

// In constructor:
constructor(
  @InjectRepository(Business) private businessRepo: Repository<Business>,
  @InjectRepository(ExpirationAlert) private alertRepo: Repository<ExpirationAlert>,
  private readonly stockConsumptionService: StockConsumptionService,
  private readonly eventGateway: EventGateway,
) {
  super();
}
```

In `scanBusiness`, after `await this.alertRepo.save(alert)`:

```typescript
const saved = await this.alertRepo.save(alert);
this.logger.log(`[INV-080] Alert created: batch ${batch.id} severity=${severity}`);
this.eventGateway.emitToRoom(`dashboard:${business.id}`, 'inventory:expiration_alert', {
  alert_id: saved.id,
  batch_id: batch.id,
  product_id: batch.product_id,
  warehouse_id: batch.warehouse_id,
  severity,
});
```

Note: `business` must be available in `scanBusiness`. Update the private method signature to accept the full `business` object instead of just the spread:

```typescript
private async scanBusiness(business: Business & { expiration_alert_lead_days?: number }): Promise<void> {
  const leadDays = business.expiration_alert_lead_days ?? 7;
  const batches = await this.stockConsumptionService.findExpiringBatches(business.id, leadDays);
  for (const batch of batches) {
    const now = new Date();
    const severity = batch.expires_at && batch.expires_at <= now ? 'expired' : 'expires_soon';
    const existingAlert = await this.alertRepo.findOne({
      where: { batch_id: batch.id, severity, resolved_at: null as any },
    });
    if (existingAlert) continue;
    const alert = this.alertRepo.create({
      business_id: business.id,
      batch_id: batch.id,
      warehouse_id: batch.warehouse_id,
      product_id: batch.product_id,
      severity,
    });
    const saved = await this.alertRepo.save(alert);
    this.logger.log(`[INV-080] Alert created: batch ${batch.id} severity=${severity}`);
    this.eventGateway.emitToRoom(`dashboard:${business.id}`, 'inventory:expiration_alert', {
      alert_id: saved.id,
      batch_id: batch.id,
      product_id: batch.product_id,
      warehouse_id: batch.warehouse_id,
      severity,
    });
  }
}
```

- [ ] **Step 4: Update reconciliation.processor.ts**

Add `EventGateway` import and inject as the 4th constructor parameter. Emit in `createOrSkipDiscrepancyAlert` after a new alert is saved:

```typescript
import { EventGateway } from '../../../common/gateways/event.gateway';

// In constructor:
constructor(
  @InjectRepository(Business) private businessRepo: Repository<Business>,
  @InjectRepository(StockDiscrepancyAlert) private discrepancyRepo: Repository<StockDiscrepancyAlert>,
  private readonly stockConsumptionService: StockConsumptionService,
  private readonly eventGateway: EventGateway,
) {
  super();
}
```

In `createOrSkipDiscrepancyAlert`, after `await this.discrepancyRepo.save(alert)`:

```typescript
const saved = await this.discrepancyRepo.save(alert);
this.logger.log(`[INV-095] Discrepancy alert created: batch ${data.batch_id} source=${data.source}`);
this.eventGateway.emitToRoom(`dashboard:${data.business_id}`, 'inventory:discrepancy_alert', {
  alert_id: saved.id,
  batch_id: data.batch_id,
  product_id: data.product_id,
  warehouse_id: data.warehouse_id,
  source: data.source,
  discrepancy_quantity: data.discrepancy_quantity,
});
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="expiration-scan.processor|reconciliation.processor"
```

Expected: 4 tests PASS.

- [ ] **Step 6: Run the full test suite**

```bash
docker compose exec backend npm test --workspace=apps/backend
```

Expected: 625 tests passing (621 + 4 new).

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/inventory/processors/
git commit -m "cross-cutting: emit inventory:expiration_alert and inventory:discrepancy_alert WebSocket events (INV-080, INV-095)"
```

---

## Task 3: Error Keys — Customer Module

Standardize all throws in `customer.service.ts` and `customer.controller.ts` to use `{ error: 'KEY' }`.

**Files:**
- Modify: `apps/backend/src/modules/customer/customer.service.ts`
- Modify: `apps/backend/src/modules/customer/customer.controller.ts`
- Test: `apps/backend/src/modules/customer/customer.service.spec.ts`

- [ ] **Step 1: Add one error key check to the existing spec**

Open `apps/backend/src/modules/customer/customer.service.spec.ts`. Find the test for `updateCustomer` (or any test that expects `NotFoundException`). Change it to also check the error key:

```typescript
// Before:
await expect(service.updateCustomer('x', 'biz', {})).rejects.toThrow(NotFoundException);

// After:
await expect(service.updateCustomer('x', 'biz', {})).rejects.toMatchObject({
  response: { error: 'CUST_NOT_FOUND' },
});
```

Do the same for any one test that expects `ConflictException` (phone conflict):

```typescript
await expect(service.createCustomer('biz', { phone: '+212600000001', first_name: 'X', last_name: 'Y' }))
  .rejects.toMatchObject({ response: { error: 'CUST_PHONE_CONFLICT' } });
```

- [ ] **Step 2: Run those specific tests to confirm they fail**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="customer.service.spec"
```

Expected: FAIL on the two modified assertions.

- [ ] **Step 3: Update customer.service.ts — replace all plain-string throws**

Apply this mapping (full list of changes):

```typescript
// customer not found (many occurrences):
throw new NotFoundException({ error: 'CUST_NOT_FOUND', message: 'Customer not found' });

// phone conflict:
throw new ConflictException({ error: 'CUST_PHONE_CONFLICT', message: 'Phone number already registered for this business' });

// grade not found (multiple methods):
throw new NotFoundException({ error: 'CUST_GRADE_NOT_FOUND', message: 'Grade not found' });

// label not found:
throw new NotFoundException({ error: 'CUST_LABEL_NOT_FOUND', message: 'Label not found' });

// attribute not found:
throw new NotFoundException({ error: 'CUST_ATTR_NOT_FOUND', message: 'Attribute not found' });

// data_type immutable:
throw new UnprocessableEntityException({ error: 'CUST_ATTR_TYPE_IMMUTABLE', message: 'data_type is immutable once set' });

// attribute validation failed:
throw new BadRequestException({ error: 'CUST_ATTR_VALIDATION_FAILED', message: 'Attribute validation failed', errors });

// points insufficient:
throw new UnprocessableEntityException({ error: 'CUST_POINTS_INSUFFICIENT', message: 'Adjustment would make points balance negative' });
```

In `customer.controller.ts`, update the permission check throw:

```typescript
throw new ForbiddenException({ error: 'CUST_PERMISSION_DENIED', message: 'Insufficient permissions to adjust points' });
```

- [ ] **Step 4: Run the full customer suite**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="customer"
```

Expected: All customer tests pass (including the two new key assertions).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/customer/
git commit -m "cross-cutting: standardize error keys in customer module (CUST_*)"
```

---

## Task 4: Error Keys — Promotion & Coupon Module

**Files:**
- Modify: `apps/backend/src/modules/promotion/promotion.service.ts`
- Modify: `apps/backend/src/modules/promotion/coupon.service.ts`
- Modify: `apps/backend/src/modules/promotion/coupon-ext.service.ts`
- Modify: `apps/backend/src/modules/promotion/pex.service.ts`
- Test: `apps/backend/src/modules/promotion/coupon.service.spec.ts`

- [ ] **Step 1: Add one error key check to the existing coupon spec**

In `coupon.service.spec.ts`, find the test that expects `NotFoundException` for coupon type not found. Update:

```typescript
await expect(service.bulkIssueCoupons('biz', { coupon_type_id: 'nonexistent', ... }))
  .rejects.toMatchObject({ response: { error: 'CPN_TYPE_NOT_FOUND' } });
```

- [ ] **Step 2: Run to confirm failure**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="coupon.service.spec"
```

- [ ] **Step 3: Update promotion.service.ts**

Apply these key replacements (every `throw new` in the file that lacks `{ error: ... }`):

```typescript
// not found:
throw new NotFoundException({ error: 'PROM_NOT_FOUND' });

// category not found:
throw new BadRequestException({ error: 'PROM_CATEGORY_NOT_FOUND', message: 'target_category_id not found in this business' });

// product not found:
throw new BadRequestException({ error: 'PROM_PRODUCT_NOT_FOUND', message: 'target_product_id not found in this business' });

// grade cross-tenant:
throw new BadRequestException({ error: 'PROM_GRADE_CROSS_TENANT', message: 'Some target_grade_ids do not belong to this business' });

// label cross-tenant:
throw new BadRequestException({ error: 'PROM_LABEL_CROSS_TENANT', message: 'Some target_label_ids do not belong to this business' });

// customer cross-tenant:
throw new BadRequestException({ error: 'PROM_CUSTOMER_CROSS_TENANT', message: 'Some target_customer_ids do not belong to this business' });

// location cross-tenant:
throw new BadRequestException({ error: 'PROM_LOCATION_CROSS_TENANT', message: 'Some applicable_location_ids do not belong to this business' });

// percentage invalid:
throw new BadRequestException({ error: 'PROM_PERCENTAGE_INVALID', message: 'value must be between 0 and 100 for percentage promotion types' });

// date invalid:
throw new BadRequestException({ error: 'PROM_DATE_INVALID', message: 'start_date must be <= end_date' });

// code conflict:
throw new ConflictException({ error: 'PROM_CODE_CONFLICT', message: `Promotion code "${code}" already exists in this business` });

// locked field (the existing UnprocessableEntityException block already has a message — add error key):
throw new UnprocessableEntityException({ error: 'PROM_LOCKED_FIELD', message: `Cannot modify ${field} after first redemption` });

// archived cannot reactivate:
throw new UnprocessableEntityException({ error: 'PROM_ALREADY_ARCHIVED', message: 'Archived promotions cannot be reactivated' });

// archived cannot pause:
throw new UnprocessableEntityException({ error: 'PROM_ALREADY_ARCHIVED', message: 'Archived promotions cannot be paused' });

// already archived:
throw new UnprocessableEntityException({ error: 'PROM_ARCHIVE_AGAIN', message: 'Promotion is already archived' });

// notification stub (this is NOT an audit log — it's a future-work stub; do NOT replace with a real call):
console.log(`[PromotionService] notification dispatch stubbed for promotion ${id}`);
// Leave this console.log as-is — it's not an error throw.
```

Update `coupon-ext.service.ts`:

```typescript
// coupon type not found:
throw new NotFoundException({ error: 'CPN_TYPE_NOT_FOUND', message: 'Coupon type not found or inactive' });
```

Update `coupon.service.ts` — check if any throws already have error keys; add to those that don't. The `HttpException({ status: 'redeemed', ... })` throw is special-format; leave it as-is or add `error: 'CPN_ALREADY_REDEEMED'` to the existing object:

```typescript
throw new HttpException({ error: 'CPN_ALREADY_REDEEMED', status: 'redeemed', message: 'Coupon already redeemed' }, HttpStatus.GONE);
```

Update `pex.service.ts` — wrap all plain-string throws:

```typescript
throw new NotFoundException({ error: 'PEX_RULE_NOT_FOUND', message: 'Exchange rule not found' });
throw new UnprocessableEntityException({ error: 'PEX_RULE_INACTIVE', message: 'Exchange rule is not active' });
throw new UnprocessableEntityException({ error: 'PEX_POINT_VALUE_IMMUTABLE', message: 'point_value is immutable once used in a redemption' });
throw new UnprocessableEntityException({ error: 'PEX_RULE_DEACTIVATED', message: 'Exchange rule is already deactivated' });
throw new NotFoundException({ error: 'PEX_CUSTOMER_NOT_FOUND', message: 'Customer not found' });
throw new UnprocessableEntityException({ error: 'PEX_POINTS_INSUFFICIENT', message: 'Insufficient points for redemption' });
throw new UnprocessableEntityException({ error: 'PEX_DAILY_LIMIT_EXCEEDED', message: 'Daily redemption limit exceeded' });
throw new UnprocessableEntityException({ error: 'PEX_TOTAL_LIMIT_EXCEEDED', message: 'Total redemptions limit exceeded' });
```

- [ ] **Step 4: Run the full promotion suite**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="promotion|coupon|pex"
```

Expected: All promotion/coupon/pex tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/promotion/
git commit -m "cross-cutting: standardize error keys in promotion & coupon module (PROM_*, CPN_*, PEX_*)"
```

---

## Task 5: Error Keys — Inventory Module

**Files:**
- Modify: `apps/backend/src/modules/inventory/inventory.service.ts`
- Modify: `apps/backend/src/modules/inventory/stock-batch.service.ts`
- Modify: `apps/backend/src/modules/inventory/purchase-order.service.ts`
- Modify: `apps/backend/src/modules/inventory/stock-template.service.ts`
- Modify: `apps/backend/src/modules/inventory/alert.service.ts`
- Modify: `apps/backend/src/modules/inventory/stock-adjustment.service.ts`
- Modify: `apps/backend/src/modules/inventory/stock-transfer.service.ts`
- Modify: `apps/backend/src/modules/inventory/vendor-payment.service.ts`
- Test: existing spec files for each service

- [ ] **Step 1: Add error key assertions to existing specs**

In `inventory.service.spec.ts`, update one `NotFoundException` assertion:

```typescript
await expect(service.updateUoM('x', 'biz', {})).rejects.toMatchObject({
  response: { error: 'INV_UOM_NOT_FOUND' },
});
```

In `stock-batch.service.spec.ts`, update one assertion:

```typescript
await expect(service.receiveBatch('biz', { warehouse_id: 'bad', ... })).rejects.toMatchObject({
  response: { error: 'INV_BATCH_WAREHOUSE_NOT_FOUND' },
});
```

In `purchase-order.service.spec.ts`, update one assertion:

```typescript
await expect(service.getPurchaseOrder('bad', 'biz')).rejects.toMatchObject({
  response: { error: 'INV_PO_NOT_FOUND' },
});
```

- [ ] **Step 2: Run to confirm failures**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="inventory.service.spec|stock-batch|purchase-order"
```

- [ ] **Step 3: Update inventory.service.ts**

Replace all plain-string throws using the key table:

```typescript
// UoM:
throw new NotFoundException({ error: 'INV_UOM_NOT_FOUND', message: 'Unit of measure not found' });
throw new UnprocessableEntityException({ error: 'INV_UOM_SYSTEM_DELETE', message: 'System units cannot be deleted' });
throw new UnprocessableEntityException({ error: 'INV_UOM_IN_USE', message: 'Unit is in use by one or more products' });

// Warehouse:
throw new NotFoundException({ error: 'INV_WAREHOUSE_NOT_FOUND', message: 'Warehouse not found' });
throw new ConflictException({ error: 'INV_WAREHOUSE_CODE_CONFLICT', message: 'Warehouse code already exists for this business' });

// Vendor:
throw new NotFoundException({ error: 'INV_VENDOR_NOT_FOUND', message: 'Vendor not found' });
throw new ConflictException({ error: 'INV_VENDOR_CODE_CONFLICT', message: 'Vendor code already exists for this business' });

// Brand:
throw new ConflictException({ error: 'INV_BRAND_NAME_CONFLICT', message: 'Brand name already exists for this business' });
throw new NotFoundException({ error: 'INV_BRAND_NOT_FOUND', message: 'Brand not found' });

// Product / NutritionInfo:
throw new NotFoundException({ error: 'INV_PRODUCT_NOT_FOUND', message: 'Product not found' });
throw new NotFoundException({ error: 'INV_NUTRITION_NOT_FOUND', message: 'No nutrition info for this product' });
```

- [ ] **Step 4: Update stock-batch.service.ts**

```typescript
throw new NotFoundException({ error: 'INV_BATCH_WAREHOUSE_NOT_FOUND', message: 'Warehouse not found' });
throw new UnprocessableEntityException({ error: 'INV_BATCH_FEATURE_DISABLED', message: 'Stock adjustment approval feature is not enabled for this business' });
throw new NotFoundException({ error: 'INV_BATCH_NOT_FOUND', message: 'Batch not found' });
throw new UnprocessableEntityException({ error: 'INV_BATCH_DISPOSE_EXCESS', message: 'Disposal quantity exceeds available quantity' });
// For transfer:
throw new NotFoundException({ error: 'INV_BATCH_TARGET_WAREHOUSE_NOT_FOUND', message: 'Target warehouse not found' });
throw new UnprocessableEntityException({ error: 'INV_BATCH_TRANSFER_EXCESS', message: 'Transfer quantity exceeds available quantity' });
// For executeBatchTransferInQr:
throw new UnprocessableEntityException({ error: 'INV_BATCH_INSUFFICIENT_STOCK', message: 'Insufficient stock in source batch' });
// "Source batch not found" in inQr context:
throw new NotFoundException({ error: 'INV_BATCH_NOT_FOUND', message: 'Source batch not found' });
```

- [ ] **Step 5: Update purchase-order.service.ts**

```typescript
throw new NotFoundException({ error: 'INV_PO_NOT_FOUND', message: 'Purchase order not found' });
throw new UnprocessableEntityException({ error: 'INV_PO_NOT_DRAFT', message: 'Only draft purchase orders can be updated' });
// (reuse INV_PO_NOT_DRAFT for "sent" too — same semantic):
throw new UnprocessableEntityException({ error: 'INV_PO_NOT_DRAFT', message: 'Only draft purchase orders can be sent' });
throw new UnprocessableEntityException({ error: 'INV_PO_INVALID_STATUS', message: 'Purchase order cannot be confirmed in its current status' });
throw new UnprocessableEntityException({ error: 'INV_PO_INVALID_STATUS', message: 'Cannot receive items on a cancelled or fully received purchase order' });
throw new NotFoundException({ error: 'INV_PO_ITEM_NOT_FOUND', message: `PO item ${ri.po_item_id} not found on this purchase order` });
throw new UnprocessableEntityException({ error: 'INV_PO_CANCEL_RECEIVED', message: 'Cannot cancel a fully received purchase order' });
throw new UnprocessableEntityException({ error: 'INV_PO_CANCEL_RECEIVED', message: 'Cannot cancel a purchase order with received items' });
// Leave the [STUB] console.log for PO email as-is (it is NOT an audit log — it is a future vendor notification stub).
```

- [ ] **Step 6: Update stock-template.service.ts**

```typescript
throw new NotFoundException({ error: 'INV_TEMPLATE_NOT_FOUND', message: 'Template not found' });
```

(Multiple occurrences — apply to all.)

- [ ] **Step 7: Update alert.service.ts**

```typescript
throw new NotFoundException({ error: 'INV_ALERT_EXP_NOT_FOUND', message: 'Expiration alert not found' });
throw new UnprocessableEntityException({ error: 'INV_ALERT_EXP_RESOLVED', message: 'Alert already resolved' });
throw new NotFoundException({ error: 'INV_ALERT_DISC_NOT_FOUND', message: 'Discrepancy alert not found' });
throw new UnprocessableEntityException({ error: 'INV_ALERT_DISC_RESOLVED', message: 'Alert already resolved' });
```

- [ ] **Step 8: Update stock-adjustment.service.ts**

```typescript
throw new NotFoundException({ error: 'INV_ADJ_NOT_FOUND', message: 'Stock adjustment not found' });
throw new NotFoundException({ error: 'INV_ADJ_BATCH_NOT_FOUND', message: 'Batch not found in warehouse' });
throw new UnprocessableEntityException({ error: 'INV_ADJ_INVALID_STATUS', message: 'Only draft adjustments can be submitted' });
throw new UnprocessableEntityException({ error: 'INV_ADJ_INVALID_STATUS', message: 'Only pending_approval adjustments can be approved' });
throw new UnprocessableEntityException({ error: 'INV_ADJ_INVALID_STATUS', message: 'Only approved adjustments can be posted' });
throw new UnprocessableEntityException({ error: 'INV_ADJ_INVALID_STATUS', message: 'Only pending_approval adjustments can be rejected' });
```

- [ ] **Step 9: Update stock-transfer.service.ts**

```typescript
throw new NotFoundException({ error: 'INV_TRANSFER_NOT_FOUND', message: 'Stock transfer not found' });
throw new UnprocessableEntityException({ error: 'INV_TRANSFER_SAME_WAREHOUSE', message: 'Source and target warehouses must be different' });
throw new NotFoundException({ error: 'INV_TRANSFER_SOURCE_NOT_FOUND', message: 'Source warehouse not found' });
throw new NotFoundException({ error: 'INV_TRANSFER_TARGET_NOT_FOUND', message: 'Target warehouse not found' });
throw new UnprocessableEntityException({ error: 'INV_TRANSFER_INSUFFICIENT_STOCK', message: 'Insufficient stock in source batch for item' });
throw new UnprocessableEntityException({ error: 'INV_TRANSFER_INVALID_STATUS', message: 'Only draft transfers can be posted' });
throw new UnprocessableEntityException({ error: 'INV_TRANSFER_EMPTY', message: 'Transfer has no items' });
```

- [ ] **Step 10: Update vendor-payment.service.ts**

(Also applies to the already-modified `voidPayment` from Task 1 — add the error keys to the remaining throws):

```typescript
throw new NotFoundException({ error: 'INV_VENDOR_PAYMENT_NOT_FOUND', message: 'Vendor payment not found' });
throw new UnprocessableEntityException({ error: 'INV_VENDOR_PAYMENT_VOIDED', message: 'Payment is already voided' });
// (The vendor not found in getVendorOutstanding):
throw new NotFoundException({ error: 'INV_VENDOR_NOT_FOUND', message: 'Vendor not found' });
```

- [ ] **Step 11: Run the full inventory suite**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="inventory|stock-batch|stock-template|purchase-order|alert.service|stock-adjustment|stock-transfer|vendor-payment"
```

Expected: All inventory tests pass.

- [ ] **Step 12: Commit**

```bash
git add apps/backend/src/modules/inventory/
git commit -m "cross-cutting: standardize error keys in inventory module (INV_*)"
```

---

## Task 6: Error Keys — Restaurant Module

**Files:**
- Modify: `apps/backend/src/modules/restaurant/restaurant.service.ts`
- Modify: `apps/backend/src/modules/restaurant/table-session.service.ts`
- Modify: `apps/backend/src/modules/restaurant/checkout.service.ts`
- Test: `apps/backend/src/modules/restaurant/restaurant.service.spec.ts` (existing)
- Test: `apps/backend/src/modules/restaurant/table-session.service.spec.ts` (existing)
- Test: `apps/backend/src/modules/restaurant/checkout.service.spec.ts` (existing)

The restaurant module already has `RST_SESSION_NOT_OPEN`, `RST_ITEM_IN_KITCHEN`, `RST_ORPHAN_ITEM_IN_SPLIT`, `RST_DUPLICATE_ITEM_IN_SPLIT`. The remaining plain-string throws are in:
- `checkout.service.ts` — `NotFoundException('Table session not found')` → `RST_SESSION_NOT_FOUND`; `ForbiddenException('Missing permission: ...')` → `RST_PERM_CLOSE`
- `table-session.service.ts` — `NotFoundException('Table session not found')` → `RST_SESSION_NOT_FOUND`; `ForbiddenException('Missing permission: can_close_table_session_partial')` → `RST_PERM_CLOSE_PARTIAL`; `ForbiddenException('Missing permission: can_transfer_table_items')` → `RST_PERM_TRANSFER`
- `restaurant.service.ts` — all area/table-type/table not-found and conflict throws

- [ ] **Step 1: Add one error key assertion to checkout.service.spec.ts**

Find the test that expects session not found:

```typescript
await expect(service.closeTable('bad-session', 'biz', mockUser)).rejects.toMatchObject({
  response: { error: 'RST_SESSION_NOT_FOUND' },
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="checkout.service.spec"
```

- [ ] **Step 3: Update checkout.service.ts**

```typescript
throw new ForbiddenException({ error: 'RST_PERM_CLOSE', message: 'Missing permission: can_close_table_session' });
throw new NotFoundException({ error: 'RST_SESSION_NOT_FOUND', message: 'Table session not found' });
// (Two occurrences of the ForbiddenException and two of the NotFoundException — update all)
```

The existing `UnprocessableEntityException` blocks that already have `error: 'RST_SESSION_NOT_OPEN'` etc. — leave them untouched.

- [ ] **Step 4: Update table-session.service.ts**

```typescript
throw new NotFoundException({ error: 'RST_SESSION_NOT_FOUND', message: 'Table session not found' });
throw new ForbiddenException({ error: 'RST_PERM_CLOSE_PARTIAL', message: 'Missing permission: can_close_table_session_partial' });
throw new ForbiddenException({ error: 'RST_PERM_TRANSFER', message: 'Missing permission: can_transfer_table_items' });
```

- [ ] **Step 5: Update restaurant.service.ts**

```typescript
// Dining area:
throw new ConflictException({ error: 'RST_AREA_NAME_CONFLICT', message: 'Dining area name already exists in this business' });
throw new NotFoundException({ error: 'RST_AREA_NOT_FOUND', message: 'Dining area not found' });
throw new UnprocessableEntityException({ error: 'RST_AREA_HAS_TABLES', message: 'Cannot delete dining area with active tables' });

// Table type:
throw new NotFoundException({ error: 'RST_TABLE_TYPE_NOT_FOUND', message: 'Table type not found' });

// Table:
throw new ConflictException({ error: 'RST_TABLE_NUMBER_CONFLICT', message: 'Table number already exists in this business' });
throw new NotFoundException({ error: 'RST_TABLE_NOT_FOUND', message: 'Table not found' });
throw new UnprocessableEntityException({ error: 'RST_TABLE_HAS_SESSION', message: 'Cannot delete table with an open session' });
```

- [ ] **Step 6: Run the full restaurant suite**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="restaurant|table-session|checkout"
```

Expected: All restaurant tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/restaurant/
git commit -m "cross-cutting: standardize error keys in restaurant module (RST_*)"
```

---

## Task 7: Error Keys — Communications, Chain, Auth, Business, Terminal, KDS, Recommendation, Super-Admin, Job

This task standardizes the remaining modules. Apply the canonical key table to each file.

**Files:**
- Modify: `apps/backend/src/modules/communications/communications.service.ts`
- Modify: `apps/backend/src/modules/communications/notification-send.service.ts`
- Modify: `apps/backend/src/modules/chain/chain.service.ts`
- Modify: `apps/backend/src/modules/auth/auth.service.ts`
- Modify: `apps/backend/src/modules/business/business.service.ts`
- Modify: `apps/backend/src/modules/terminal/terminal.service.ts`
- Modify: `apps/backend/src/modules/kds/kds.service.ts`
- Modify: `apps/backend/src/modules/recommendation/recommendation.service.ts`
- Modify: `apps/backend/src/modules/super-admin/super-admin.service.ts`
- Modify: `apps/backend/src/modules/jobs/job.service.ts`
- Modify: `apps/backend/src/modules/jobs/job.controller.ts`

- [ ] **Step 1: Add one error key assertion per major module in existing specs**

In `communications.service.spec.ts`, update one announcement-not-found assertion:

```typescript
await expect(service.deletePlatformAnnouncement('bad', 'super-admin-1')).rejects.toMatchObject({
  response: { error: 'COM_ANNOUNCEMENT_NOT_FOUND' },
});
```

In `chain.service.spec.ts`, update one chain business-not-found assertion:

```typescript
await expect(service.promoteToParent('bad')).rejects.toMatchObject({
  response: { error: 'CHN_BUSINESS_NOT_FOUND' },
});
```

- [ ] **Step 2: Run to confirm failures**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="communications.service.spec|chain.service.spec"
```

- [ ] **Step 3: Update communications.service.ts**

```typescript
throw new NotFoundException({ error: 'COM_ANNOUNCEMENT_NOT_FOUND', message: 'Announcement not found' });
// (All three occurrences of "Announcement not found" in the file)
```

- [ ] **Step 4: Update notification-send.service.ts**

```typescript
throw new NotFoundException({ error: 'COM_TEMPLATE_NOT_FOUND', message: 'Template not found' });
// (All four occurrences of "Template not found")
throw new UnprocessableEntityException({ error: 'COM_TEMPLATE_HAS_SENDS', message: 'Cannot delete template with send history' });
throw new UnprocessableEntityException({ error: 'COM_NO_CHANNEL_CREDENTIALS', message: 'No active credentials for channel' });
throw new UnprocessableEntityException({ error: 'COM_CONSENT_REQUIRED', message: 'Customer has not consented to marketing communications' });
throw new UnprocessableEntityException({ error: 'COM_SMS_INSUFFICIENT_BALANCE', message: 'Insufficient SMS balance' });
throw new UnprocessableEntityException({ error: 'COM_SEND_NOT_APPLICABLE', message: 'opt_out_token only applies to marketing sends' });
throw new NotFoundException({ error: 'COM_OPT_OUT_TOKEN_INVALID', message: 'Invalid opt-out token' });
throw new NotFoundException({ error: 'CUST_NOT_FOUND', message: 'Customer not found' });
```

- [ ] **Step 5: Update chain.service.ts**

```typescript
throw new NotFoundException({ error: 'CHN_BUSINESS_NOT_FOUND', message: 'Business not found' });
throw new UnprocessableEntityException({ error: 'CHN_CANNOT_PROMOTE_CHILD', message: 'A child business cannot be promoted to parent' });
throw new UnprocessableEntityException({ error: 'CHN_SELF_PARENT', message: 'A business cannot be its own parent' });
throw new NotFoundException({ error: 'CHN_BUSINESS_NOT_FOUND', message: 'Child business not found' });
throw new NotFoundException({ error: 'CHN_PARENT_NOT_FOUND', message: 'Parent business not found' });
throw new UnprocessableEntityException({ error: 'CHN_NOT_PARENT', message: 'Target business is not a chain parent — promote it first' });
throw new ForbiddenException({ error: 'CHN_ACCESS_DENIED', message: 'You do not have access to this business' });
throw new NotFoundException({ error: 'CHN_USER_NOT_FOUND', message: 'User not found' });
throw new UnprocessableEntityException({ error: 'CHN_NOT_IN_CHAIN', message: 'One or more businesses are not children of this chain' });
throw new NotFoundException({ error: 'CHN_SYNC_JOB_NOT_FOUND', message: 'Sync job not found' });
throw new UnprocessableEntityException({ error: 'CHN_NO_PARENT', message: 'Business has no parent' });
throw new NotFoundException({ error: 'CHN_PRODUCT_NOT_FOUND', message: 'Product not found in parent catalogue' });
throw new NotFoundException({ error: 'PROM_NOT_FOUND', message: 'Promotion not found' });
throw new NotFoundException({ error: 'CHN_PO_NOT_FOUND', message: 'Purchase order not found or not accessible' });
```

- [ ] **Step 6: Update auth.service.ts**

```typescript
throw new UnauthorizedException({ error: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid credentials' });
throw new UnauthorizedException({ error: 'AUTH_NO_DASHBOARD_ACCESS', message: 'No dashboard access' });
throw new UnauthorizedException({ error: 'AUTH_TERMINAL_NOT_FOUND', message: 'Terminal not found' });
throw new UnauthorizedException({ error: 'AUTH_INVALID_PIN', message: 'Invalid PIN' });
throw new UnauthorizedException({ error: 'AUTH_INVALID_REFRESH', message: 'Invalid refresh token' });
throw new BadRequestException({ error: 'AUTH_USER_NOT_FOUND', message: 'User not found' });
throw new BadRequestException({ error: 'AUTH_PASSWORD_INCORRECT', message: 'Current password is incorrect' });
```

- [ ] **Step 7: Update business.service.ts**

```typescript
throw new NotFoundException({ error: 'BIZ_CATEGORY_NOT_FOUND', message: 'Category not found' });
throw new NotFoundException({ error: 'BIZ_PRODUCT_NOT_FOUND', message: 'Product not found' });
```

- [ ] **Step 8: Update terminal.service.ts**

```typescript
throw new NotFoundException({ error: 'TERM_TERMINAL_NOT_FOUND', message: 'Terminal not found or inactive' });
throw new NotFoundException({ error: 'TERM_CUSTOMER_NOT_FOUND', message: 'Customer not found' });
throw new ConflictException({ error: 'TERM_PHONE_CONFLICT', message: 'Phone number already registered' });
throw new NotFoundException({ error: 'TERM_COUPON_NOT_FOUND', message: 'Coupon not found' });
// The HttpException for coupon redeemed already has status field — add error key:
throw new HttpException({ error: 'CPN_ALREADY_REDEEMED', status: 'redeemed', message: 'Coupon already redeemed' }, HttpStatus.GONE);
throw new NotFoundException({ error: 'TERM_CUSTOMER_NOT_FOUND', message: 'Customer not found' });
throw new UnprocessableEntityException({ error: 'CUST_POINTS_INSUFFICIENT', message: '...' }); // keep existing message
throw new BadRequestException({ error: 'BIZ_PRODUCT_NOT_FOUND', message: `Product ${item.product_id} not found` });
throw new NotFoundException({ error: 'TERM_TRANSACTION_NOT_FOUND', message: 'Transaction not found' });
throw new BadRequestException({ error: 'TERM_VOID_INVALID_STATUS', message: 'Can only void completed transactions' });
throw new UnauthorizedException({ error: 'TERM_VOID_MANAGER_REQUIRED', message: 'Manager PIN required' });
throw new UnauthorizedException({ error: 'TERM_VOID_MANAGER_INVALID', message: 'Invalid manager PIN' });
```

- [ ] **Step 9: Update kds.service.ts**

```typescript
throw new NotFoundException({ error: 'KDS_ORDER_NOT_FOUND', message: 'Order not found' });
throw new NotFoundException({ error: 'KDS_ITEM_NOT_FOUND', message: 'KDS item not found' });
// The kds:177 block already has { error: 'KDS_INVALID_TRANSITION' } — leave untouched
```

- [ ] **Step 10: Update recommendation.service.ts**

```typescript
throw new NotFoundException({ error: 'REC_TEMPLATE_NOT_FOUND', message: 'Recommendation template not found' });
// (Four occurrences — apply to all)
// The block at line 86 already has { error: 'REC_ITEMS_NOT_ALLOWED' } — leave untouched
```

- [ ] **Step 11: Update super-admin.service.ts**

```typescript
throw new NotFoundException({ error: 'SA_BUSINESS_NOT_FOUND', message: 'Business not found' });
throw new NotFoundException({ error: 'SA_BUSINESS_TYPE_NOT_FOUND', message: 'Business type not found' });
throw new ConflictException({ error: 'SA_TERMINAL_CODE_CONFLICT', message: 'Terminal code already exists' });
throw new NotFoundException({ error: 'SA_TERMINAL_NOT_FOUND', message: 'Terminal not found' });
throw new NotFoundException({ error: 'SA_LOCATION_NOT_FOUND', message: 'Location not found' });
throw new NotFoundException({ error: 'SA_SUBSCRIPTION_NOT_FOUND', message: 'Subscription not found' });
throw new NotFoundException({ error: 'SA_ANNOUNCEMENT_NOT_FOUND', message: 'Announcement not found' });
```

- [ ] **Step 12: Update job.service.ts**

```typescript
throw new NotFoundException({ error: 'JOB_NOT_FOUND', message: `Job ${id} not found` });
```

In `job.controller.ts`, if there are any plain-string throws, apply the same pattern. (There may be validation throws from the controller — check and apply `JOB_*` prefix.)

- [ ] **Step 13: Run the full test suite**

```bash
docker compose exec backend npm test --workspace=apps/backend
```

Expected: ≥ 625 tests passing (all tests pass, no regressions).

- [ ] **Step 14: Commit**

```bash
git add apps/backend/src/modules/communications/ \
        apps/backend/src/modules/chain/chain.service.ts \
        apps/backend/src/modules/auth/ \
        apps/backend/src/modules/business/ \
        apps/backend/src/modules/terminal/terminal.service.ts \
        apps/backend/src/modules/kds/ \
        apps/backend/src/modules/recommendation/ \
        apps/backend/src/modules/super-admin/ \
        apps/backend/src/modules/jobs/
git commit -m "cross-cutting: standardize error keys in remaining modules (COM_*, CHN_*, AUTH_*, TERM_*, KDS_*, REC_*, SA_*, JOB_*)"
```

---

## Self-Review

**1. Spec coverage:**
- audit_logs DB writes: ✅ All 3 `[AUDIT]` stubs replaced (chain, vendor-payment, table-session)
- WebSocket events: ✅ `inventory:expiration_alert` and `inventory:discrepancy_alert` now emitted
- Error keys: ✅ All 30+ files covered in Tasks 3–7. The table in the header defines 90+ keys.

**2. Placeholder scan:** No "TBD" or vague steps. Every code block shows the exact replacement. Error key tasks show a complete mapping for every throw in each file based on the grep output gathered during planning.

**3. Type consistency:**
- `AuditLog` entity: `user_id UUID NOT NULL`, `action VARCHAR(50)`, `entity_type VARCHAR(50)`, `entity_id UUID`, `details_json JSONB`, `business_id UUID` — all values provided in every `auditLogRepo.create({...})` call.
- `EventGateway.emitToRoom(room: string, event: string, payload: any)` — matches the existing gateway signature.
- Error object shape `{ error: string, message: string }` — consistent with existing RST_* and ADM_* pattern.

**4. Notes for implementer:**
- The `console.log` stubs in `purchase-order.service.ts` (PO email) and `promotion.service.ts` (notification dispatch) and `communications.service.ts` (test send / SMS refresh) and `notification-provider.service.ts` (provider call) are **NOT** audit log stubs — they represent future integrations. Do **NOT** replace these with audit log writes.
- The `terminal.service.ts:597` — `console.error('[FIFO] Failed...')` — is an error log, not an audit log. Leave it as `console.error`.
- The `chain-sync.processor.ts:62` — `console.warn` for unimplemented sync_what values — is a development warning. Leave it as `console.warn`.
