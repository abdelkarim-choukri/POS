# Frontend Quickstart Guide

This guide covers everything needed to connect `dashboard-web` and `terminal-app`
to the POS backend.

---

## 1. Starting the Backend

```bash
# From the repo root
bash scripts/start-dev.sh
```

Services:
- Backend API: `http://localhost:3000`
- Swagger UI:  `http://localhost:3000/api/docs`
- PostgreSQL:  `localhost:5432`
- Redis:       `localhost:6379`

Stop: `bash scripts/stop-dev.sh`

---

## 2. Demo Credentials (after running the seed)

```bash
# Run once on a fresh database:
docker compose exec backend npm run seed:demo --workspace=apps/backend
```

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@pos.ma | admin123 |
| Atlas Owner (restaurant) | owner.atlas@pos.ma | owner123 |
| Boutique Owner (retail) | owner.boutique@pos.ma | owner123 |
| Employee | sarah@pos.ma | emp123 |
| Employee | hassan@pos.ma | emp123 |
| Employee (retail) | karim@pos.ma | emp123 |

Demo businesses:
- **Café Atlas** — restaurant, 2 locations, 6 tables, 10 customers
- **Boutique Marrakech** — retail, 1 location, 10 customers

---

## 3. Authentication Flow

### Dashboard login (email + password)

```typescript
const res = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'owner.atlas@pos.ma', password: 'owner123' }),
});
const { token, user } = await res.json();
// token: JWT Bearer token
// user: { id, email, role, business_id, first_name, last_name, permissions, dashboard_access }
```

### Terminal login (PIN)

```typescript
const res = await fetch('http://localhost:3000/api/auth/pin-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pin: '1234', terminal_code: 'TERM-001' }),
});
const { token } = await res.json();
```

### Using the token

```typescript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
};
```

---

## 4. API Prefix Map

| Prefix | Who calls it | Auth required | Description |
|---|---|---|---|
| `/api/auth/*` | Both | No (login endpoints) | Authentication |
| `/api/business/*` | Dashboard | Yes (owner/manager) | Business management |
| `/api/terminal/*` | Terminal app | Yes (any employee) | POS operations |
| `/api/super/*` | Super admin panel | Yes (super_admin) | Platform management |
| `/api/kds/*` | KDS screen (legacy) | No | Kitchen display (non-restaurant) |
| `/api/health` | Monitoring | No | Health check |
| `/api/public/*` | Public | No | Opt-out, OSS |
| `/api/webhooks/*` | External providers | No | Notification webhooks |
| `/api/docs` | Browser | No | Swagger UI |

---

## 5. Importing Shared Types

```typescript
// Install the shared package (already linked via npm workspaces)
import type {
  Business,
  Customer,
  CustomerGrade,
  Product,
  Transaction,
  CreateTransactionRequest,
  UniversalReportResponse,
  ReportId,
  ALL_REPORT_IDS,
} from '@pos/shared';

// Enums
import { UserRole, PaymentMethod, TransactionStatus, OrderStatus } from '@pos/shared';
```

All types live in `packages/shared/src/api/`. The barrel re-exports everything from `@pos/shared`.

Type files by domain:
| Import source | Contains |
|---|---|
| `@pos/shared` → `api/common` | PaginatedResponse, ErrorResponse, all enums |
| `@pos/shared` → `api/auth` | LoginRequest, AuthTokenResponse |
| `@pos/shared` → `api/business` | Business, Category, Product, Location, Employee |
| `@pos/shared` → `api/customer` | Customer, CustomerGrade, CustomerLabel |
| `@pos/shared` → `api/promotions` | Promotion, CouponType, Coupon |
| `@pos/shared` → `api/pex` | PointsExchangeRule |
| `@pos/shared` → `api/inventory` | Warehouse, Vendor, StockBatch, PurchaseOrder, … |
| `@pos/shared` → `api/restaurant` | TableSession, FloorPlanEntry, KdsItem, CheckoutPayload |
| `@pos/shared` → `api/communications` | NotificationTemplate, NotificationSend |
| `@pos/shared` → `api/reports` | UniversalReportResponse, ALL_REPORT_IDS |
| `@pos/shared` → `api/chain` | ChainTreeNode, ChainSyncConfig |
| `@pos/shared` → `api/recommendations` | RecommendationTemplate, FeaturedItem |
| `@pos/shared` → `api/platform-admin` | TradeCategory, Courier, MoroccoRegion |
| `@pos/shared` → `api/super-admin` | BusinessSummary, BusinessType, Terminal |
| `@pos/shared` → `api/terminal` | CreateTransactionRequest, EvaluateCartRequest |
| `@pos/shared` → `api/websocket` | All WS event payload types |

---

## 6. Paginated Responses

Most list endpoints return:
```typescript
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

Pass `?page=1&limit=20` as query params. Default: page=1, limit=20.

---

## 7. Error Handling

All errors return structured JSON:
```json
{
  "error": "CUST_NOT_FOUND",
  "message": "Customer not found",
  "statusCode": 404
}
```

See [`docs/ERROR_CODES.md`](./ERROR_CODES.md) for the full list of ~95 error keys
organized by module.

**Key rule:** Cross-tenant access always returns `404`, never `403`.

---

## 8. The Reports System

All 34 reports go through a single endpoint:

```typescript
GET /api/business/reports/:reportId?type=today&from=2026-01-01&to=2026-05-01
```

Response is always `UniversalReportResponse` — same shape regardless of report.

```typescript
const ALL_REPORT_IDS = [
  // Sales
  'sales-summary', 'sales-by-hour', 'sales-by-day', 'sales-by-month',
  'sales-by-category', 'sales-by-product', 'sales-by-table',
  // Payments
  'payment-summary', 'cash-report', 'card-report',
  // Customers
  'customer-summary', 'top-customers', 'customer-grades', 'loyalty-summary',
  // Operations
  'employee-performance', 'kitchen-performance', 'table-turnover', 'voids-cancellations',
  // TVA & Accounting
  'tva-declaration', 'daily-close', 'invoice-register', 'tva-by-rate',
  // Promotions
  'promotion-report', 'coupon-report', 'discount-write-offs', 'points-exchange-report',
  // Inventory
  'stock-position', 'stock-movements', 'vendor-purchases', 'input-tva',
  'cogs', 'vendor-balance', 'bill-aging',
  // Capital
  'capital-detail',
] as const;
```

`type` param options: `today`, `yesterday`, `last_7days`, `this_month`, `last_month`, `this_year`, `custom` (requires `from` + `to`).

---

## 9. WebSocket / Real-Time Events

See [`docs/WEBSOCKET_EVENTS.md`](./WEBSOCKET_EVENTS.md) for the full event reference.

Quick setup:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/events', {
  auth: { token: `Bearer ${accessToken}` },
});

socket.on('connect', () => {
  // Subscribe to rooms for your business
  socket.emit('join', `dashboard:${businessId}`);  // transactions, inventory alerts
  socket.emit('join', `floor:${businessId}`);       // table open/close events
  socket.emit('join', `kds:${businessId}`);         // kitchen display events
  socket.emit('join', `oss:${locationId}`);         // order status screen
});

// Example listeners
socket.on('dashboard:transaction_created', ({ transaction_id, total_ttc }) => { ... });
socket.on('floor:table_opened', ({ table_id, session_id, table_number }) => { ... });
socket.on('kds:item_status_changed', ({ item_id, old_status, new_status }) => { ... });
socket.on('inventory:expiration_alert', ({ alert_id, severity }) => { ... });
```

Install socket.io-client: `npm install socket.io-client`

---

## 10. Terminal App Key Flows

### Create a transaction

```typescript
POST /api/terminal/transactions
{
  "items": [
    { "product_id": "...", "product_name": "Café Noir", "quantity": 2,
      "unit_price": 12, "line_total": 24 }
  ],
  "subtotal": 24,
  "total": 28.8,
  "payment_method": "cash",
  "customer_id": "...",          // optional
  "promotion_ids": ["..."],       // optional
  "coupon_codes": ["CAFEOFF"],    // optional
  "table_session_id": "..."       // optional — for restaurant
}
```

### Evaluate cart before checkout

```typescript
POST /api/terminal/promotions/evaluate
{ "items": [...], "customer_id": "..." }
// Returns applicable_promotions with discount amounts
```

### Customer lookup

```typescript
GET /api/terminal/customers/lookup?phone=+212661001001
// Returns customer summary + grade + points_balance
```

---

## 11. Multi-Tenant Notes

- Every JWT contains `business_id`. The backend uses this to scope all data.
- Never manually pass `business_id` in request bodies — it's read from the JWT.
- Chain users can access multiple businesses. Use `POST /api/auth/switch-business` to get a new token scoped to a different business.

---

## 12. Further Readin`

| Document | Description |
|---|---|
| [`docs/WEBSOCKET_EVENTS.md`](./WEBSOCKET_EVENTS.md) | All 12 real-time events with payload shapes |
| [`docs/ERROR_CODES.md`](./ERROR_CODES.md) | All ~95 error keys by module |
| `http://localhost:3000/api/docs` | Swagger UI — interactive API explorer |
| `packages/shared/src/api/` | TypeScript type definitions |
| `docs/spec/POS_Extension_Spec_v1_1.md` | Full feature specification |
