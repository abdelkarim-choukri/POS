# Security Hardening — 22 Findings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 22 security findings from the audit, grouped into four test-gated batches, without breaking any of the 628 existing tests.

**Architecture:** All fixes are surgical — no module boundaries change, no new public APIs, no schema redesign. The PIN hashing requires one migration (1714016000000) and a bcrypt-compare lookup pattern. WebSocket auth injects `JwtService` into `EventGateway` via `CommonModule`'s own `JwtModule.registerAsync`. Rate limiting uses `@nestjs/throttler` v6 wired as a global `APP_GUARD`.

**Tech Stack:** NestJS 11, TypeORM, PostgreSQL, bcrypt, `@nestjs/throttler`, `helmet`, Node.js `crypto` (built-in), socket.io.

---

## File Map

| File | Change |
|------|--------|
| `src/modules/auth/auth.module.ts` | Fail-fast on missing JWT_SECRET |
| `src/modules/auth/strategies/jwt.strategy.ts` | Fail-fast on missing JWT_SECRET |
| `src/modules/kds/kds.controller.ts` | Remove `@Public()`, add business_id scoping |
| `src/modules/kds/kds.service.ts` | Scope legacy `updateOrderStatus` by business_id |
| `src/common/gateways/event.gateway.ts` | JWT verification on WS connect |
| `src/common/gateways/event.gateway.spec.ts` | Update + new auth tests |
| `src/common/common.module.ts` | Import `JwtModule.registerAsync` |
| `src/common/entities/user.entity.ts` | Add `pin_hash`, `needs_pin_reset` columns |
| `src/migrations/1714016000000-AddPinHashing.ts` | New migration |
| `src/modules/auth/auth.service.ts` | Bcrypt PIN compare; explicit select in getProfile |
| `src/modules/business/business.service.ts` | Hash PIN on create/update; IDOR fixes; password_hash exclusion |
| `src/modules/business/business.controller.ts` | Pass businessId to variant/modifier/clock methods |
| `src/modules/terminal/terminal.service.ts` | Bcrypt manager PIN; add businessId to voidTransaction |
| `src/modules/terminal/terminal.controller.ts` | Pass business_id to voidTransaction; JWT terminal_id for heartbeat/sync |
| `src/modules/communications/notifications-public.controller.ts` | HMAC webhook verification |
| `src/common/utils/crypto.ts` | New — AES-256-GCM encrypt/decrypt for credentials |
| `src/modules/communications/communications.service.ts` | Encrypt credentials on save/decrypt on read |
| `src/app.module.ts` | Add `ThrottlerModule` + `APP_GUARD` |
| `src/modules/auth/auth.controller.ts` | `@Throttle` on login/pin-login; logout comment |
| `src/modules/auth/dto/login.dto.ts` | `@MaxLength` on password and pin |
| `src/modules/business/dto/product.dto.ts` | `@Min(0)` on price fields |
| `src/modules/reports/dto/report-query.dto.ts` | `@Max(1000)` on page |
| `src/modules/terminal/dto/transaction.dto.ts` | `@MaxLength` on VoidTransactionDto |
| `src/modules/platform-admin/platform-admin-auth.controller.ts` | `@Roles` on version-log endpoints |
| `src/modules/platform-admin/platform-admin-business.controller.ts` | `@Roles` on courier endpoints |
| `src/main.ts` | Helmet, Swagger guard, CORS from env |

---

## GROUP 1: CRITICAL

---

### Task 1.1 — Fail-fast on missing JWT_SECRET

**Files:**
- Modify: `apps/backend/src/modules/auth/auth.module.ts`
- Modify: `apps/backend/src/modules/auth/strategies/jwt.strategy.ts`

No test needed — if the secret is absent the process crashes before any test runs.

- [ ] **Step 1: Fix auth.module.ts**

Replace lines 16–19:

```typescript
// apps/backend/src/modules/auth/auth.module.ts
JwtModule.register({
  secret: (() => {
    const s = process.env.JWT_SECRET;
    if (!s) throw new Error('JWT_SECRET environment variable is required');
    return s;
  })(),
  signOptions: { expiresIn: '1h' },
}),
```

- [ ] **Step 2: Fix jwt.strategy.ts**

Replace the `super({ ... })` call (lines 25–29):

```typescript
super({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  ignoreExpiration: false,
  secretOrKey: (() => {
    const s = process.env.JWT_SECRET;
    if (!s) throw new Error('JWT_SECRET environment variable is required');
    return s;
  })(),
});
```

- [ ] **Step 3: Verify the backend still boots (JWT_SECRET set in Docker env)**

```bash
docker compose exec backend cat /proc/1/environ | tr '\0' '\n' | grep JWT_SECRET
```

Expected: `JWT_SECRET=<some-value>` (or the container would already be crashing).

---

### Task 1.2 — Remove @Public() from KDS controller

**Files:**
- Modify: `apps/backend/src/modules/kds/kds.controller.ts`
- Modify: `apps/backend/src/modules/kds/kds.service.ts`

- [ ] **Step 1: Write failing test**

Create `apps/backend/src/modules/kds/kds-legacy.spec.ts`:

```typescript
import { KdsService } from './kds.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Transaction } from '../../common/entities/transaction.entity';
import { TableSessionItem } from '../../common/entities/table-session-item.entity';
import { Test } from '@nestjs/testing';
import { KdsGateway } from './kds.gateway';
import { EventGateway } from '../../common/gateways/event.gateway';
import { NotFoundException } from '@nestjs/common';

const BIZ_ID = 'biz-1';
const OTHER_BIZ = 'biz-other';

function mockRepo(overrides: any = {}) {
  return { findOne: jest.fn(), find: jest.fn(), save: jest.fn(), ...overrides };
}

async function buildService(txnRepo: any) {
  const module = await Test.createTestingModule({
    providers: [
      KdsService,
      { provide: getRepositoryToken(Transaction), useValue: txnRepo },
      { provide: getRepositoryToken(TableSessionItem), useValue: mockRepo() },
      { provide: KdsGateway, useValue: { emitOrderUpdate: jest.fn(), emitNewOrder: jest.fn() } },
      { provide: EventGateway, useValue: { emitToRoom: jest.fn() } },
    ],
  }).compile();
  return module.get(KdsService);
}

describe('KdsService.updateOrderStatus', () => {
  it('returns 404 when order does not belong to the requesting business', async () => {
    // Order exists but belongs to OTHER_BIZ
    const txnRepo = mockRepo({
      findOne: jest.fn().mockResolvedValue(null), // scoped query returns null
      save: jest.fn(),
    });
    const service = await buildService(txnRepo);
    await expect(service.updateOrderStatus(BIZ_ID, 'order-99', 'preparing'))
      .rejects.toMatchObject({ response: { error: 'KDS_ORDER_NOT_FOUND' } });
  });

  it('updates status when order belongs to the business', async () => {
    const order = { id: 'order-1', business_id: BIZ_ID, location_id: 'loc-1', items: [], order_status: 'new' };
    const txnRepo = mockRepo({
      findOne: jest.fn().mockResolvedValue(order),
      save: jest.fn().mockImplementation((o: any) => o),
    });
    const service = await buildService(txnRepo);
    const result = await service.updateOrderStatus(BIZ_ID, 'order-1', 'preparing');
    expect(result.order_status).toBe('preparing');
  });
});
```

Run: `docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="kds-legacy" 2>&1 | tail -20`

Expected: 1 PASS, 1 FAIL (updateOrderStatus signature doesn't take businessId yet).

- [ ] **Step 2: Update KdsService.updateOrderStatus**

In `apps/backend/src/modules/kds/kds.service.ts`, change the `updateOrderStatus` signature and query:

```typescript
async updateOrderStatus(businessId: string, orderId: string, newStatus: string) {
  const order = await this.txnRepo.findOne({
    where: { id: orderId, business_id: businessId },
    relations: ['items', 'user'],
  });
  if (!order) throw new NotFoundException({ error: 'KDS_ORDER_NOT_FOUND', message: 'Order not found' });

  order.order_status = newStatus;
  const saved = await this.txnRepo.save(order);

  this.kdsGateway.emitOrderUpdate(order.location_id, order.id, newStatus);

  return saved;
}
```

- [ ] **Step 3: Update KdsController — remove @Public(), add businessId**

Replace `apps/backend/src/modules/kds/kds.controller.ts` entirely:

```typescript
import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { KdsService } from './kds.service';
import { CurrentUser } from '../../common/decorators';

@ApiTags('KDS (Legacy)')
@Controller('kds')
export class KdsController {
  constructor(private kdsService: KdsService) {}

  @Get('orders')
  getActiveOrders(
    @CurrentUser('business_id') businessId: string,
    @Query('location_id') locationId: string,
  ) {
    return this.kdsService.getActiveOrders(locationId);
  }

  @Patch('orders/:id/status')
  updateStatus(
    @CurrentUser('business_id') businessId: string,
    @Param('id') id: string,
    @Body('order_status') status: string,
  ) {
    return this.kdsService.updateOrderStatus(businessId, id, status);
  }
}
```

- [ ] **Step 4: Run test — both cases should pass**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="kds-legacy" 2>&1 | tail -15
```

Expected: 2 passing.

---

### Task 1.3 — WebSocket JWT authentication

**Files:**
- Modify: `apps/backend/src/common/common.module.ts`
- Modify: `apps/backend/src/common/gateways/event.gateway.ts`
- Modify: `apps/backend/src/common/gateways/event.gateway.spec.ts`

- [ ] **Step 1: Import JwtModule into CommonModule**

Replace `apps/backend/src/common/common.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SimplTvaService } from './services/simpl-tva.service';
import { EventGateway } from './gateways/event.gateway';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const s = process.env.JWT_SECRET;
        if (!s) throw new Error('JWT_SECRET environment variable is required');
        return { secret: s };
      },
    }),
  ],
  providers: [SimplTvaService, EventGateway],
  exports: [SimplTvaService, EventGateway, JwtModule],
})
export class CommonModule {}
```

- [ ] **Step 2: Write failing tests for EventGateway auth**

Replace `apps/backend/src/common/gateways/event.gateway.spec.ts`:

```typescript
import { JwtService } from '@nestjs/jwt';
import { EventGateway } from './event.gateway';

function makeGateway(jwtVerify: jest.Mock): EventGateway {
  const jwtService = { verify: jwtVerify } as unknown as JwtService;
  return new EventGateway(jwtService);
}

describe('EventGateway', () => {
  describe('emitToRoom', () => {
    it('calls server.to().emit() with the correct room, event, and payload', () => {
      const gateway = makeGateway(jest.fn().mockReturnValue({ sub: 'u1', business_id: 'biz-1' }));
      const emitFn = jest.fn();
      const toFn = jest.fn().mockReturnValue({ emit: emitFn });
      (gateway as any).server = { to: toFn };

      gateway.emitToRoom('kds:biz-1', 'kds:items_added', { items: [{ id: 'item-1' }] });

      expect(toFn).toHaveBeenCalledWith('kds:biz-1');
      expect(emitFn).toHaveBeenCalledWith('kds:items_added', { items: [{ id: 'item-1' }] });
    });
  });

  describe('handleConnection', () => {
    it('disconnects client when token is missing', () => {
      const gateway = makeGateway(jest.fn().mockImplementation(() => { throw new Error('invalid'); }));
      const disconnect = jest.fn();
      const client: any = { handshake: { auth: {}, query: {} }, disconnect, join: jest.fn() };
      gateway.handleConnection(client);
      expect(disconnect).toHaveBeenCalledWith(true);
    });

    it('disconnects client when token is invalid', () => {
      const gateway = makeGateway(jest.fn().mockImplementation(() => { throw new Error('invalid'); }));
      const disconnect = jest.fn();
      const client: any = {
        handshake: { auth: { token: 'bad-token' }, query: { room: 'dashboard:biz-1' } },
        disconnect,
        join: jest.fn(),
      };
      gateway.handleConnection(client);
      expect(disconnect).toHaveBeenCalledWith(true);
    });

    it('allows client to join matching business room with valid token', () => {
      const gateway = makeGateway(
        jest.fn().mockReturnValue({ sub: 'u1', business_id: 'biz-1', type: 'user' }),
      );
      const join = jest.fn();
      const client: any = {
        id: 'sock-1',
        handshake: { auth: { token: 'valid-jwt' }, query: { room: 'dashboard:biz-1' } },
        disconnect: jest.fn(),
        join,
      };
      gateway.handleConnection(client);
      expect(join).toHaveBeenCalledWith('dashboard:biz-1');
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('rejects room join when room business_id does not match token claim', () => {
      const gateway = makeGateway(
        jest.fn().mockReturnValue({ sub: 'u1', business_id: 'biz-1', type: 'user' }),
      );
      const join = jest.fn();
      const client: any = {
        id: 'sock-1',
        handshake: { auth: { token: 'valid-jwt' }, query: { room: 'dashboard:biz-OTHER' } },
        disconnect: jest.fn(),
        join,
      };
      gateway.handleConnection(client);
      // Client stays connected but is NOT joined to a foreign room
      expect(join).not.toHaveBeenCalled();
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('allows super_admin to join any room', () => {
      const gateway = makeGateway(
        jest.fn().mockReturnValue({ sub: 'sa-1', type: 'super_admin' }),
      );
      const join = jest.fn();
      const client: any = {
        id: 'sock-1',
        handshake: { auth: { token: 'valid-jwt' }, query: { room: 'dashboard:biz-ANY' } },
        disconnect: jest.fn(),
        join,
      };
      gateway.handleConnection(client);
      expect(join).toHaveBeenCalledWith('dashboard:biz-ANY');
    });
  });

  describe('handleJoin', () => {
    it('joins authenticated client to their own business room', () => {
      const gateway = makeGateway(jest.fn().mockReturnValue({ sub: 'u1', business_id: 'biz-1' }));
      const join = jest.fn();
      const client: any = {
        id: 'sock-1',
        handshake: { auth: { token: 'valid-jwt' }, query: {} },
        disconnect: jest.fn(),
        join,
        data: { user: { business_id: 'biz-1', type: 'user' } },
      };
      gateway.handleJoin(client, { room: 'floor:biz-1' });
      expect(join).toHaveBeenCalledWith('floor:biz-1');
    });

    it('rejects join to foreign business room', () => {
      const gateway = makeGateway(jest.fn().mockReturnValue({ sub: 'u1', business_id: 'biz-1' }));
      const join = jest.fn();
      const client: any = {
        id: 'sock-1',
        handshake: { auth: { token: 'valid-jwt' }, query: {} },
        disconnect: jest.fn(),
        join,
        data: { user: { business_id: 'biz-1', type: 'user' } },
      };
      gateway.handleJoin(client, { room: 'floor:biz-OTHER' });
      expect(join).not.toHaveBeenCalled();
    });
  });
});
```

Run: `docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="event.gateway" 2>&1 | tail -20`

Expected: Multiple FAIL (EventGateway still has the old no-arg constructor).

- [ ] **Step 3: Rewrite EventGateway with JWT auth**

Replace `apps/backend/src/common/gateways/event.gateway.ts`:

```typescript
import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  namespace: '/events',
  cors: { origin: process.env.WS_CORS_ORIGIN || 'http://localhost:5173' },
})
export class EventGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  private logger = new Logger('EventGateway');

  constructor(private jwtService: JwtService) {}

  handleConnection(client: Socket) {
    const token =
      (client.handshake.auth as any)?.token as string |
      (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

    let user: any;
    try {
      user = this.jwtService.verify(token ?? '');
    } catch {
      client.disconnect(true);
      return;
    }

    (client as any).data = { user };

    const room = client.handshake.query.room as string;
    if (room && this.isRoomAllowed(room, user)) {
      client.join(room);
      this.logger.log(`Client ${client.id} joined room: ${room}`);
    }
  }

  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    const user = (client as any).data?.user;
    if (data?.room && user && this.isRoomAllowed(data.room, user)) {
      client.join(data.room);
    }
  }

  emitToRoom(room: string, event: string, payload: any): void {
    this.server.to(room).emit(event, payload);
  }

  private isRoomAllowed(room: string, user: any): boolean {
    if (user?.type === 'super_admin') return true;
    const parts = room.split(':');
    if (parts.length < 2) return false;
    const roomBizId = parts[parts.length - 1];
    return roomBizId === user?.business_id;
  }
}
```

- [ ] **Step 4: Run EventGateway tests**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="event.gateway" 2>&1 | tail -20
```

Expected: All 8 tests passing.

- [ ] **Step 5: Run full suite to verify no regressions**

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -10
```

Expected: 628+ passing, 0 failing. (EventGateway is mocked in all other spec files with `{ emitToRoom: jest.fn() }` so no other test is affected.)

---

### Task 1.4 — PIN hashing

**Files:**
- Create: `apps/backend/src/migrations/1714016000000-AddPinHashing.ts`
- Modify: `apps/backend/src/common/entities/user.entity.ts`
- Modify: `apps/backend/src/modules/auth/auth.service.ts`
- Modify: `apps/backend/src/modules/business/business.service.ts`
- Modify: `apps/backend/src/modules/terminal/terminal.service.ts`

- [ ] **Step 1: Write PIN hashing tests**

Create `apps/backend/src/modules/auth/auth-pin.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../common/entities/user.entity';
import { SuperAdmin } from '../../common/entities/super-admin.entity';
import { Terminal } from '../../common/entities/terminal.entity';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';

const BIZ_ID = 'biz-1';

function makeUser(overrides: any = {}) {
  return {
    id: 'user-1',
    email: 'emp@test.com',
    first_name: 'Ali',
    last_name: 'Hassan',
    role: 'employee',
    business_id: BIZ_ID,
    permissions: {},
    is_active: true,
    needs_pin_reset: false,
    ...overrides,
  };
}

async function buildService(userFindMany: jest.Mock, terminalFindOne: jest.Mock) {
  const module = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('token') } },
      { provide: getRepositoryToken(User), useValue: { find: userFindMany, findOne: jest.fn() } },
      { provide: getRepositoryToken(SuperAdmin), useValue: { findOne: jest.fn() } },
      { provide: getRepositoryToken(Terminal), useValue: { findOne: terminalFindOne } },
    ],
  }).compile();
  return module.get<AuthService>(AuthService);
}

const makeTerminal = () => ({
  id: 'term-1',
  terminal_code: 'T001',
  device_name: 'iPad 1',
  is_active: true,
  location_id: 'loc-1',
  location: { id: 'loc-1', name: 'Main', business_id: BIZ_ID },
});

describe('AuthService PIN login', () => {
  it('rejects when no user has a matching pin hash', async () => {
    const pinHash = await bcrypt.hash('9999', 10); // different PIN
    const userFindMany = jest.fn().mockResolvedValue([
      makeUser({ pin_hash: pinHash, needs_pin_reset: false }),
    ]);
    const service = await buildService(userFindMany, jest.fn().mockResolvedValue(makeTerminal()));
    await expect(service.pinLogin('1234', 'T001')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when matching user has needs_pin_reset=true', async () => {
    const pinHash = await bcrypt.hash('1234', 10);
    const userFindMany = jest.fn().mockResolvedValue([
      makeUser({ pin_hash: pinHash, needs_pin_reset: true }),
    ]);
    const service = await buildService(userFindMany, jest.fn().mockResolvedValue(makeTerminal()));
    await expect(service.pinLogin('1234', 'T001')).rejects.toMatchObject({
      response: { error: 'AUTH_PIN_RESET_REQUIRED' },
    });
  });

  it('succeeds with correct bcrypt-hashed PIN', async () => {
    const pinHash = await bcrypt.hash('1234', 10);
    const userFindMany = jest.fn().mockResolvedValue([
      makeUser({ pin_hash: pinHash, needs_pin_reset: false }),
    ]);
    const service = await buildService(userFindMany, jest.fn().mockResolvedValue(makeTerminal()));
    const result = await service.pinLogin('1234', 'T001');
    expect(result.access_token).toBe('token');
  });

  it('rejects when terminal is not found', async () => {
    const service = await buildService(
      jest.fn(),
      jest.fn().mockResolvedValue(null),
    );
    await expect(service.pinLogin('1234', 'MISSING')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
```

Run: `docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="auth-pin" 2>&1 | tail -20`

Expected: FAIL (service still uses plaintext PIN lookup).

- [ ] **Step 2: Create migration**

Create `apps/backend/src/migrations/1714016000000-AddPinHashing.ts`:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPinHashing1714016000000 implements MigrationInterface {
  name = 'AddPinHashing1714016000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(72),
        ADD COLUMN IF NOT EXISTS needs_pin_reset BOOLEAN NOT NULL DEFAULT FALSE
    `);
    // Flag all existing users who have a plaintext PIN as needing a reset.
    // We do NOT hash the existing pins — they must go through the reset flow.
    await queryRunner.query(`
      UPDATE users SET needs_pin_reset = TRUE WHERE pin IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        DROP COLUMN IF EXISTS needs_pin_reset,
        DROP COLUMN IF EXISTS pin_hash
    `);
  }
}
```

- [ ] **Step 3: Add columns to User entity**

In `apps/backend/src/common/entities/user.entity.ts`, add after the `pin` column (line 29):

```typescript
@Column({ type: 'varchar', length: 72, nullable: true })
pin_hash: string | null;

@Column({ type: 'boolean', default: false })
needs_pin_reset: boolean;
```

- [ ] **Step 4: Update AuthService.pinLogin to use bcrypt.compare**

In `apps/backend/src/modules/auth/auth.service.ts`, replace the `pinLogin` method:

```typescript
async pinLogin(pin: string, terminalCode: string) {
  const terminal = await this.terminalRepo.findOne({
    where    : { terminal_code: terminalCode, is_active: true },
    relations: ['location', 'location.business'],
  });
  if (!terminal) throw new UnauthorizedException({ error: 'AUTH_TERMINAL_NOT_FOUND', message: 'Terminal not found' });

  const businessId = terminal.location.business_id;

  // Load all active users for this business and compare PIN hashes.
  // bcrypt hashes are salted so we cannot use a WHERE clause for comparison.
  const candidates = await this.userRepo.find({
    where: { business_id: businessId, is_active: true },
  });

  let user: User | null = null;
  for (const candidate of candidates) {
    if (candidate.needs_pin_reset) {
      // Check if this user's PIN would match — if so, return reset-required error
      if (candidate.pin_hash && await bcrypt.compare(pin, candidate.pin_hash)) {
        throw new UnauthorizedException({ error: 'AUTH_PIN_RESET_REQUIRED', message: 'PIN reset required. Please contact your manager.' });
      }
      continue;
    }
    if (!candidate.pin_hash) continue;
    if (await bcrypt.compare(pin, candidate.pin_hash)) {
      user = candidate;
      break;
    }
  }

  if (!user) throw new UnauthorizedException({ error: 'AUTH_INVALID_PIN', message: 'Invalid PIN' });

  const payload: JwtPayload = {
    sub        : user.id,
    email      : user.email,
    type       : 'user',
    role       : user.role,
    business_id: user.business_id,
    terminal_id: terminal.id,
    location_id: terminal.location_id,
  };

  return {
    access_token: this.jwtService.sign(payload, { expiresIn: '12h' }),
    user: {
      id         : user.id,
      first_name : user.first_name,
      last_name  : user.last_name,
      role       : user.role,
      business_id: user.business_id,
      permissions: user.permissions,
    },
    terminal: {
      id           : terminal.id,
      terminal_code: terminal.terminal_code,
      device_name  : terminal.device_name,
    },
  };
}
```

Also add `User` type import at the top if not already there: the file already imports it via `user.entity.ts`.

- [ ] **Step 5: Update getProfile to use explicit select**

Replace the `getProfile` method in `auth.service.ts`:

```typescript
async getProfile(userId: string, type: string) {
  if (type === 'super_admin') {
    const admin = await this.superAdminRepo.findOne({
      where : { id: userId },
      select: ['id', 'email', 'name', 'is_active', 'last_login_at'] as any,
    });
    return { ...admin, type: 'super_admin' };
  }
  const user = await this.userRepo.findOne({
    where   : { id: userId },
    relations: ['business'],
    select  : ['id', 'email', 'first_name', 'last_name', 'role', 'phone', 'is_active',
               'permissions', 'dashboard_access', 'language_preference', 'business_id'] as any,
  });
  return { ...user, type: 'user' };
}
```

- [ ] **Step 6: Hash PIN in BusinessService.createEmployee**

In `apps/backend/src/modules/business/business.service.ts`, update `createEmployee` — replace the `pin: dto.pin` line:

```typescript
async createEmployee(businessId: string, dto: CreateEmployeeDto) {
  const passwordHash = await bcrypt.hash(dto.password, 10);
  const pinHash = dto.pin ? await bcrypt.hash(dto.pin, 10) : null;
  const user = this.userRepo.create({
    business_id: businessId,
    email: dto.email,
    password_hash: passwordHash,
    pin_hash: pinHash,
    needs_pin_reset: false,
    first_name: dto.first_name,
    last_name: dto.last_name,
    role: dto.role,
    phone: dto.phone,
    permissions: {
      ...(dto.can_void ? { can_void: true } : {}),
      ...(dto.can_refund ? { can_refund: true } : {}),
    },
    dashboard_access: dto.dashboard_access || false,
  });
  const saved = await this.userRepo.save(user) as typeof user;
  const { password_hash, pin_hash, ...result } = saved as any;
  return result;
}
```

Also update `updateEmployee` to hash a new PIN when provided:

```typescript
async updateEmployee(businessId: string, id: string, dto: UpdateEmployeeDto) {
  const user = await this.userRepo.findOne({ where: { id, business_id: businessId } });
  if (!user) throw new NotFoundException('Employee not found');
  const { can_void, can_refund, pin, ...rest } = dto;
  Object.assign(user, rest);
  if (pin !== undefined) {
    user.pin_hash = pin ? await bcrypt.hash(pin, 10) : null;
    (user as any).needs_pin_reset = false;
  }
  if (can_void !== undefined || can_refund !== undefined) {
    const perms = { ...(user.permissions || {}) };
    if (can_void !== undefined) perms['can_void'] = can_void;
    if (can_refund !== undefined) perms['can_refund'] = can_refund;
    user.permissions = perms;
  }
  const saved = await this.userRepo.save(user) as typeof user;
  const { password_hash, pin_hash, ...result } = saved as any;
  return result;
}
```

- [ ] **Step 7: Update TerminalService manager PIN to use bcrypt**

In `apps/backend/src/modules/terminal/terminal.service.ts`, replace the manager-PIN lookup inside `voidTransaction` (lines 726–731):

```typescript
if (!userCanVoid) {
  if (!dto.manager_pin) throw new UnauthorizedException({ error: 'TERM_VOID_MANAGER_REQUIRED', message: 'Manager PIN required' });
  const candidates = await this.userRepo.find({
    where: { business_id: txn.business_id, is_active: true },
  });
  let manager: User | null = null;
  for (const candidate of candidates) {
    if (!candidate.pin_hash) continue;
    if (await bcrypt.compare(dto.manager_pin, candidate.pin_hash)) {
      manager = candidate;
      break;
    }
  }
  if (!manager || !userHasPermission(manager, 'can_void')) {
    throw new UnauthorizedException({ error: 'TERM_VOID_MANAGER_INVALID', message: 'Invalid manager PIN' });
  }
}
```

Add `import * as bcrypt from 'bcrypt';` to the top of `terminal.service.ts` if not already present.
Add the `User` import if not already imported (it's used by the entity imports).

- [ ] **Step 8: Run PIN tests — should now pass**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="auth-pin" 2>&1 | tail -15
```

Expected: 4 passing.

---

### Task 1.5 — Webhook HMAC signature verification

**Files:**
- Modify: `apps/backend/src/modules/communications/notifications-public.controller.ts`

- [ ] **Step 1: Update the webhook handler**

Replace `apps/backend/src/modules/communications/notifications-public.controller.ts`:

```typescript
import {
  Controller, Post, Param, Body, HttpCode, HttpStatus, Headers,
  ForbiddenException, RawBodyRequest, Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { NotificationSendService } from './notification-send.service';
import { OptOutDto, WebhookPayloadDto } from './dto/notifications.dto';

@ApiTags('Notifications (Public)')
@Controller()
export class NotificationsPublicController {
  constructor(private readonly sendService: NotificationSendService) {}

  // ── COM-053: Provider delivery webhook ────────────────────────────────────
  @Post('webhooks/notifications/:provider')
  @Public()
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Param('provider') provider: string,
    @Headers('x-webhook-signature') signature: string | undefined,
    @Body() body: WebhookPayloadDto,
  ) {
    const secret = process.env[`WEBHOOK_SECRET_${provider.toUpperCase().replace(/-/g, '_')}`];
    if (!secret) {
      throw new ForbiddenException({ error: 'WEBHOOK_NOT_CONFIGURED', message: 'Webhook not configured for this provider' });
    }
    if (!signature) {
      throw new ForbiddenException({ error: 'WEBHOOK_MISSING_SIGNATURE', message: 'Missing signature header' });
    }
    const expected = createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');
    const sigBuf  = Buffer.from(signature);
    const expBuf  = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      throw new ForbiddenException({ error: 'WEBHOOK_INVALID_SIGNATURE', message: 'Invalid webhook signature' });
    }
    return this.sendService.handleWebhook(provider, body);
  }

  // ── COM-060: Customer opt-out (one-click link in marketing messages) ───────
  @Post('public/notifications/opt-out')
  @Public()
  @HttpCode(HttpStatus.OK)
  optOut(@Body() dto: OptOutDto) {
    return this.sendService.optOut(dto.token);
  }
}
```

- [ ] **Step 2: Run full Group 1 test suite**

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -15
```

Expected: **628+ passing, 0 failing.** If any test fails, investigate before continuing to Group 2.

---

## GROUP 2: HIGH

---

### Task 2.1 — voidTransaction cross-tenant fix

**Files:**
- Modify: `apps/backend/src/modules/terminal/terminal.service.ts`
- Modify: `apps/backend/src/modules/terminal/terminal.controller.ts`

- [ ] **Step 1: Add businessId param to voidTransaction**

In `terminal.service.ts`, change the signature and initial lookup:

```typescript
async voidTransaction(
  businessId: string,         // ← new first param
  transactionId: string,
  userId: string,
  dto: VoidTransactionDto,
  userCanVoid: boolean,
) {
  const txn = await this.transactionRepo.findOne({
    where: { id: transactionId, business_id: businessId },   // ← added business_id
  });
  if (!txn) throw new NotFoundException({ error: 'TERM_TRANSACTION_NOT_FOUND', message: 'Transaction not found' });
  // ... rest of method unchanged
```

- [ ] **Step 2: Update the controller call**

In `terminal.controller.ts`, update the `voidTransaction` handler (line 97–99):

```typescript
@Post('transactions/:id/void')
voidTransaction(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: VoidTransactionDto) {
  return this.service.voidTransaction(user.business_id, id, user.id, dto, userHasPermission(user, 'can_void'));
}
```

- [ ] **Step 3: Run tests**

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -10
```

Expected: 628+ passing.

---

### Task 2.2 — Product variant IDOR fix

**Files:**
- Modify: `apps/backend/src/modules/business/business.service.ts`
- Modify: `apps/backend/src/modules/business/business.controller.ts`

- [ ] **Step 1: Fix listVariants, createVariant, updateVariant in business.service.ts**

Replace the three variant methods (lines 115–129):

```typescript
async listVariants(businessId: string, productId: string) {
  const product = await this.productRepo.findOne({ where: { id: productId, business_id: businessId } });
  if (!product) throw new NotFoundException({ error: 'BIZ_PRODUCT_NOT_FOUND', message: 'Product not found' });
  return this.variantRepo.find({ where: { product_id: productId }, order: { name: 'ASC' } });
}

async createVariant(businessId: string, productId: string, dto: CreateVariantDto) {
  const product = await this.productRepo.findOne({ where: { id: productId, business_id: businessId } });
  if (!product) throw new NotFoundException({ error: 'BIZ_PRODUCT_NOT_FOUND', message: 'Product not found' });
  const variant = this.variantRepo.create({ ...dto, product_id: productId });
  return this.variantRepo.save(variant);
}

async updateVariant(businessId: string, id: string, dto: UpdateVariantDto) {
  const variant = await this.variantRepo
    .createQueryBuilder('v')
    .innerJoin('v.product', 'p', 'p.business_id = :businessId', { businessId })
    .where('v.id = :id', { id })
    .getOne();
  if (!variant) throw new NotFoundException({ error: 'BIZ_VARIANT_NOT_FOUND', message: 'Variant not found' });
  Object.assign(variant, dto);
  return this.variantRepo.save(variant);
}
```

- [ ] **Step 2: Update the controller to pass businessId**

In `business.controller.ts`, update variant endpoints (lines 70–83):

```typescript
@Get('products/:id/variants')
listVariants(@CurrentUser('business_id') businessId: string, @Param('id') productId: string) {
  return this.service.listVariants(businessId, productId);
}

@Post('products/:id/variants')
createVariant(@CurrentUser('business_id') businessId: string, @Param('id') productId: string, @Body() dto: CreateVariantDto) {
  return this.service.createVariant(businessId, productId, dto);
}

@Put('variants/:id')
updateVariant(@CurrentUser('business_id') businessId: string, @Param('id') id: string, @Body() dto: UpdateVariantDto) {
  return this.service.updateVariant(businessId, id, dto);
}
```

- [ ] **Step 3: Run tests**

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -10
```

---

### Task 2.3 — Modifier/link IDOR fix

**Files:**
- Modify: `apps/backend/src/modules/business/business.service.ts`
- Modify: `apps/backend/src/modules/business/business.controller.ts`

- [ ] **Step 1: Fix addModifier and linkModifierGroupToProduct in business.service.ts**

Replace lines 153–161:

```typescript
async addModifier(businessId: string, groupId: string, dto: CreateModifierDto) {
  const group = await this.modGroupRepo.findOne({ where: { id: groupId, business_id: businessId } });
  if (!group) throw new NotFoundException({ error: 'BIZ_MODIFIER_GROUP_NOT_FOUND', message: 'Modifier group not found' });
  const mod = this.modifierRepo.create({ ...dto, modifier_group_id: groupId });
  return this.modifierRepo.save(mod);
}

async linkModifierGroupToProduct(businessId: string, productId: string, dto: LinkModifierGroupDto) {
  const [product, group] = await Promise.all([
    this.productRepo.findOne({ where: { id: productId, business_id: businessId } }),
    this.modGroupRepo.findOne({ where: { id: dto.modifier_group_id, business_id: businessId } }),
  ]);
  if (!product || !group) throw new NotFoundException({ error: 'BIZ_PRODUCT_OR_GROUP_NOT_FOUND', message: 'Product or modifier group not found' });
  const link = this.pmgRepo.create({ product_id: productId, modifier_group_id: group.id });
  return this.pmgRepo.save(link);
}
```

- [ ] **Step 2: Update the controller**

In `business.controller.ts`, update lines 101–109:

```typescript
@Post('modifier-groups/:id/modifiers')
addModifier(@CurrentUser('business_id') businessId: string, @Param('id') groupId: string, @Body() dto: CreateModifierDto) {
  return this.service.addModifier(businessId, groupId, dto);
}

@Post('products/:id/modifier-groups')
linkModifierGroup(@CurrentUser('business_id') businessId: string, @Param('id') productId: string, @Body() dto: LinkModifierGroupDto) {
  return this.service.linkModifierGroupToProduct(businessId, productId, dto);
}
```

- [ ] **Step 3: Run tests**

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -10
```

---

### Task 2.4 — Clock history IDOR fix

**Files:**
- Modify: `apps/backend/src/modules/business/business.service.ts`
- Modify: `apps/backend/src/modules/business/business.controller.ts`

- [ ] **Step 1: Fix getClockHistory in business.service.ts**

Replace lines 218–224:

```typescript
async getClockHistory(businessId: string, employeeId: string) {
  const employee = await this.userRepo.findOne({ where: { id: employeeId, business_id: businessId } });
  if (!employee) throw new NotFoundException({ error: 'BIZ_EMPLOYEE_NOT_FOUND', message: 'Employee not found' });
  return this.clockRepo.find({
    where: { user_id: employeeId },
    order: { clock_in: 'DESC' },
    take: 50,
  });
}
```

- [ ] **Step 2: Update the controller (line 133–135)**

```typescript
@Get('employees/:id/clock-history')
getClockHistory(@CurrentUser('business_id') businessId: string, @Param('id') employeeId: string) {
  return this.service.getClockHistory(businessId, employeeId);
}
```

- [ ] **Step 3: Run tests**

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -10
```

---

### Task 2.5 — Password hash exposure in updateEmployeeStatus

**Files:**
- Modify: `apps/backend/src/modules/business/business.service.ts`

- [ ] **Step 1: Fix updateEmployeeStatus to exclude sensitive fields**

Replace lines 211–216:

```typescript
async updateEmployeeStatus(businessId: string, id: string, isActive: boolean) {
  const user = await this.userRepo.findOne({ where: { id, business_id: businessId } });
  if (!user) throw new NotFoundException('Employee not found');
  user.is_active = isActive;
  const saved = await this.userRepo.save(user) as any;
  const { password_hash, pin_hash, pin, ...result } = saved;
  return result;
}
```

- [ ] **Step 2: Run tests**

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -10
```

---

### Task 2.6 — Rate limiting on auth endpoints

**Files:**
- Modify: `apps/backend/package.json` (install dependency)
- Modify: `apps/backend/src/app.module.ts`
- Modify: `apps/backend/src/modules/auth/auth.controller.ts`

- [ ] **Step 1: Install @nestjs/throttler**

```bash
docker compose exec backend npm install @nestjs/throttler --registry=https://registry.npmmirror.com --workspace=apps/backend
```

Expected: Package installed, lock file updated.

- [ ] **Step 2: Add ThrottlerModule to AppModule**

In `apps/backend/src/app.module.ts`, add imports and provider:

```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

// In @Module imports array, add:
ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]), // global: 100 req/min baseline

// In providers array, add after JwtAuthGuard:
{ provide: APP_GUARD, useClass: ThrottlerGuard },
```

The full providers array becomes:
```typescript
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: ThrottlerGuard },
],
```

- [ ] **Step 3: Apply strict throttle to auth endpoints**

In `apps/backend/src/modules/auth/auth.controller.ts`, import `Throttle` and add per-endpoint limits:

```typescript
import { Controller, Post, Get, Put, Body, Request } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, PinLoginDto, ChangePasswordDto, SuperAdminLoginDto } from './dto';
import { Public } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('super-admin/login')
  superAdminLogin(@Body() dto: SuperAdminLoginDto) {
    return this.authService.superAdminLogin(dto.email, dto.password);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('pin-login')
  pinLogin(@Body() dto: PinLoginDto) {
    return this.authService.pinLogin(dto.pin, dto.terminal_code);
  }

  @Public()
  @SkipThrottle()
  @Post('refresh')
  refresh(@Body('refresh_token') token: string) {
    return this.authService.refreshToken(token);
  }

  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id, user.type);
  }

  @Put('change-password')
  changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(userId, dto.current_password, dto.new_password);
  }

  @Post('logout')
  logout() {
    // TODO: Redis token blacklist — store jti with TTL = token remaining lifetime
    return { message: 'Logged out successfully' };
  }
}
```

- [ ] **Step 4: Add ThrottlerModule to test modules that import AppModule-level guards**

The ThrottlerGuard requires `ThrottlerModule` to be available in the DI container. Existing unit tests use `Test.createTestingModule` with explicit providers and do NOT mount `AppModule`, so they are unaffected. Run the full suite to confirm.

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -15
```

Expected: 628+ passing. If ThrottlerGuard causes DI errors in any spec file, add `ThrottlerModule.forRoot([])` to that spec's module imports.

---

### Task 2.7 — CORS from environment variable

**Files:**
- Modify: `apps/backend/src/main.ts`

- [ ] **Step 1: Replace app.enableCors()**

In `main.ts`, replace `app.enableCors();` (line 20) with:

```typescript
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.enableCors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});
```

- [ ] **Step 2: Run full Group 2 test suite**

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -15
```

Expected: **628+ passing, 0 failing.**

---

## GROUP 3: MEDIUM

---

### Task 3.1 — Encrypt notification channel credentials at rest

**Files:**
- Create: `apps/backend/src/common/utils/crypto.ts`
- Modify: `apps/backend/src/modules/communications/communications.service.ts`

- [ ] **Step 1: Create crypto utility**

Create `apps/backend/src/common/utils/crypto.ts`:

```typescript
import { createCipheriv, createDecipheriv, randomBytes, Logger } from 'crypto';

const ALGO  = 'aes-256-gcm';
const ENC_PREFIX = 'enc:v1:';
const logger = new Logger('CredentialCrypto');

function getKey(): Buffer | null {
  const hex = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!hex) {
    logger.warn('CREDENTIAL_ENCRYPTION_KEY is not set — channel credentials stored unencrypted');
    return null;
  }
  const buf = Buffer.from(hex, 'hex');
  if (buf.length !== 32) {
    logger.warn('CREDENTIAL_ENCRYPTION_KEY must be 64 hex characters (32 bytes) — storing unencrypted');
    return null;
  }
  return buf;
}

export function encryptCredentials(obj: Record<string, any>): string {
  const key = getKey();
  const plain = JSON.stringify(obj);
  if (!key) return plain;

  const iv  = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ENC_PREFIX + Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptCredentials(stored: string): Record<string, any> {
  if (!stored || !stored.startsWith(ENC_PREFIX)) {
    return stored ? JSON.parse(stored) : {};
  }
  const key = getKey();
  if (!key) return {};

  const buf = Buffer.from(stored.slice(ENC_PREFIX.length), 'base64');
  const iv        = buf.subarray(0, 12);
  const tag       = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return JSON.parse(decipher.update(encrypted) + decipher.final('utf8'));
}
```

- [ ] **Step 2: Encrypt on save and decrypt on read in CommunicationsService**

In `apps/backend/src/modules/communications/communications.service.ts`, add the import at the top:

```typescript
import { encryptCredentials, decryptCredentials } from '../../common/utils/crypto';
```

Find the `setChannel` method where `provider_config_json` is assigned (around line 161):

```typescript
if (dto.provider_config_json !== undefined) {
  channelData.provider_config_json = encryptCredentials(dto.provider_config_json);
}
```

Find the `getChannels` method where provider_config_json is redacted (around line 147–149). After decrypting, the redaction still applies as before:

```typescript
provider_config_json: ch.provider_config_json
  ? Object.fromEntries(
      Object.keys(decryptCredentials(ch.provider_config_json as any)).map((k) => [k, '***'])
    )
  : null,
```

- [ ] **Step 3: Run tests**

The existing test at `communications.service.spec.ts:227` passes `{ api_key: 'secret-key', account_id: 'acc123' }` as `provider_config_json` stored raw in the mock repo (not encrypted). Since `CREDENTIAL_ENCRYPTION_KEY` is unset in tests, `decryptCredentials` receives the raw JSON string and falls through to `JSON.parse`, so the redaction test still passes.

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -10
```

Expected: 628+ passing.

---

### Task 3.2 — Swagger only in non-production

**Files:**
- Modify: `apps/backend/src/main.ts`

- [ ] **Step 1: Wrap Swagger setup in env guard**

In `main.ts`, wrap the swagger block (lines 24–30):

```typescript
if (process.env.NODE_ENV !== 'production') {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('POS API')
    .setVersion('1.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
```

Remove the `console.log` that was outside this block.

- [ ] **Step 2: Run tests**

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -10
```

---

### Task 3.3 — Version log role restriction

**Files:**
- Modify: `apps/backend/src/modules/platform-admin/platform-admin-auth.controller.ts`

- [ ] **Step 1: Add guards to version-log endpoints**

In `platform-admin-auth.controller.ts`, add imports and decorators:

```typescript
import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { PlatformAdminService } from './platform-admin.service';
import { ListVersionLogEntriesQueryDto, ValidateAddressDto } from './dto/platform-admin.dto';

@ApiTags('Platform Admin')
@Controller('auth')
export class PlatformAdminAuthController {
  constructor(private service: PlatformAdminService) {}

  @Public()
  @Get('trade-categories/tree')
  listTradeCategoryTree() {
    return this.service.listTradeCategoryTree();
  }

  @UseGuards(RolesGuard)
  @Roles('owner', 'manager', 'super_admin')
  @Get('version-log/menus')
  listVersionLogMenus() {
    return this.service.listVersionLogMenus();
  }

  @UseGuards(RolesGuard)
  @Roles('owner', 'manager', 'super_admin')
  @Get('version-log/entries')
  listVersionLogEntries(@Query() query: ListVersionLogEntriesQueryDto) {
    return this.service.listVersionLogEntries(query);
  }

  @Public()
  @Get('regions/tree')
  getMoroccoRegionsTree() {
    return this.service.getMoroccoRegionsTree();
  }

  @Public()
  @Post('regions/validate')
  validateAddress(@Body() dto: ValidateAddressDto) {
    return this.service.validateAddress(dto);
  }
}
```

- [ ] **Step 2: Run tests**

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -10
```

---

### Task 3.4 — Courier endpoint role restriction

**Files:**
- Modify: `apps/backend/src/modules/platform-admin/platform-admin-business.controller.ts`

- [ ] **Step 1: Add @Roles to courier endpoints**

```typescript
// Couriers (ADM-014–016) — require owner or manager (not cashier/employee)
@Get('couriers')
@Roles('owner', 'manager')
listBusinessCouriers(@CurrentUser('business_id') businessId: string) {
  return this.service.listBusinessCouriers(businessId);
}

@Post('couriers/link')
@Roles('owner', 'manager')
linkCourier(
  @CurrentUser('business_id') businessId: string,
  @Body() dto: LinkCourierDto,
) {
  return this.service.linkCourierToBusiness(businessId, dto);
}

@Delete('couriers/:courier_id')
@Roles('owner', 'manager')
@HttpCode(HttpStatus.OK)
unlinkCourier(
  @CurrentUser('business_id') businessId: string,
  @Param('courier_id') courierId: string,
) {
  return this.service.unlinkCourierFromBusiness(businessId, courierId);
}
```

- [ ] **Step 2: Run tests**

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -10
```

---

### Task 3.5 — Add Helmet security headers

**Files:**
- Modify: `apps/backend/package.json` (install)
- Modify: `apps/backend/src/main.ts`

- [ ] **Step 1: Install helmet**

```bash
docker compose exec backend npm install helmet --registry=https://registry.npmmirror.com --workspace=apps/backend
```

- [ ] **Step 2: Add Helmet to main.ts**

Add import at the top of `main.ts`:

```typescript
import helmet from 'helmet';
```

Add helmet call right after `NestFactory.create`:

```typescript
app.use(helmet({
  contentSecurityPolicy: false, // disabled — API-only server, no browser HTML responses
  crossOriginEmbedderPolicy: false,
}));
```

(Full CSP is disabled because this is a pure JSON API; browsers never render its responses. Enabling strict CSP on API responses can break CORS preflight in some configurations without adding security value.)

- [ ] **Step 3: Run tests**

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -10
```

---

### Task 3.6 — Terminal heartbeat/sync use JWT terminal_id

**Files:**
- Modify: `apps/backend/src/modules/terminal/terminal.controller.ts`

- [ ] **Step 1: Update heartbeat and sync to read terminal_id from JWT**

In `terminal.controller.ts`, replace the `heartbeat`, `pushSync`, and `getSyncStatus` handlers:

```typescript
@Post('heartbeat')
heartbeat(@CurrentUser('terminal_id') terminalId: string) {
  return this.service.heartbeat(terminalId);
}

@Post('sync')
pushSync(@CurrentUser('terminal_id') terminalId: string, @Body('operations') operations: any[]) {
  return this.service.pushSync(terminalId, operations);
}

@Get('sync/status')
getSyncStatus(@CurrentUser('terminal_id') terminalId: string) {
  return this.service.getSyncStatus(terminalId);
}
```

Remove the `@Body('terminal_id')` and `@Query('terminal_id')` params from those handlers.

- [ ] **Step 2: Run full Group 3 test suite**

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -15
```

Expected: **628+ passing, 0 failing.**

---

## GROUP 4: LOW

---

### Task 4.1 — MaxLength on login DTOs

**Files:**
- Modify: `apps/backend/src/modules/auth/dto/login.dto.ts`

- [ ] **Step 1: Add MaxLength imports and decorators**

Replace `login.dto.ts`:

```typescript
import { IsEmail, IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(72)
  password: string;
}

export class PinLoginDto {
  @IsString()
  @MaxLength(10)
  pin: string;

  @IsString()
  @MaxLength(50)
  terminal_code: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  current_password: string;

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  new_password: string;
}

export class SuperAdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(72)
  password: string;
}
```

- [ ] **Step 2: Run tests**

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -10
```

---

### Task 4.2 — Min(0) on product price fields

**Files:**
- Modify: `apps/backend/src/modules/business/dto/product.dto.ts`

- [ ] **Step 1: Add Min import and decorators**

```typescript
import { IsString, IsOptional, IsNumber, IsUUID, IsBoolean, IsInt, MaxLength, Min } from 'class-validator';
```

In `CreateProductDto`, update `price` and `cost_price`:

```typescript
@IsNumber({ maxDecimalPlaces: 4 })
@Min(0)
price: number;

@IsOptional()
@IsNumber({ maxDecimalPlaces: 4 })
@Min(0)
cost_price?: number;
```

In `UpdateProductDto`, same:

```typescript
@IsOptional()
@IsNumber({ maxDecimalPlaces: 4 })
@Min(0)
price?: number;

@IsOptional()
@IsNumber({ maxDecimalPlaces: 4 })
@Min(0)
cost_price?: number;
```

Also add `@Min(0)` to `price_override` in `CreateVariantDto` and `UpdateVariantDto`:

```typescript
@IsOptional()
@IsNumber({ maxDecimalPlaces: 4 })
@Min(0)
price_override?: number;
```

- [ ] **Step 2: Run tests**

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -10
```

---

### Task 4.3 — Max(1000) on ReportQueryDto.page

**Files:**
- Modify: `apps/backend/src/modules/reports/dto/report-query.dto.ts`

- [ ] **Step 1: Add @Max(1000) to page field**

```typescript
@IsOptional()
@Type(() => Number)
@IsInt()
@Min(1)
@Max(1000)
page?: number;
```

Also add `Max` to the import:

```typescript
import { IsBoolean, IsIn, IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';
```

(`Max` is already in the import for `limit` — verify it's there, add if not.)

- [ ] **Step 2: Run tests**

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -10
```

---

### Task 4.4 — MaxLength on VoidTransactionDto

**Files:**
- Modify: `apps/backend/src/modules/terminal/dto/transaction.dto.ts`

- [ ] **Step 1: Add MaxLength import and decorators to VoidTransactionDto**

Add `MaxLength` to the imports at the top:

```typescript
import {
  IsString, IsOptional, IsNumber, IsUUID,
  IsEnum, IsArray, ValidateNested, IsInt, MaxLength,
} from 'class-validator';
```

Update `VoidTransactionDto`:

```typescript
export class VoidTransactionDto {
  @IsString()
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  manager_pin?: string;
}
```

- [ ] **Step 2: Run full Group 4 test suite**

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -15
```

Expected: **628+ passing, 0 failing.**

---

## Final Verification

- [ ] **Run the complete test suite one last time**

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -20
```

Expected: All 628+ tests passing, 0 failing, 0 test suites with errors.

- [ ] **Verify the backend container is still healthy**

```bash
docker compose exec backend curl -s http://localhost:3000/api/health | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK' if d.get('status')=='ok' else 'FAIL')"
```

Expected: `OK`

---

## Summary of new tests added

| Test file | Cases | What it covers |
|-----------|-------|----------------|
| `kds/kds-legacy.spec.ts` | 2 | KDS updateOrderStatus cross-tenant 404 + happy path |
| `common/gateways/event.gateway.spec.ts` | 7 (replaces 1) | WS disconnect on bad/missing token, room-allowed logic, super_admin bypass, handleJoin enforcement |
| `auth/auth-pin.service.spec.ts` | 4 | bcrypt PIN compare, needs_pin_reset rejection, invalid PIN, terminal not found |
