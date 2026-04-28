// apps/backend/test/terminal.e2e-spec.ts
//
// Full terminal flow e2e tests.
// Seed data (T-001 + PIN 1234) is created by jest.setup.ts before this file runs.
// FIXED_IDS are imported so tests never hard-code UUIDs.

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { FIXED_IDS } from '../src/scripts/seed-test';

// ─── helpers ────────────────────────────────────────────────────────────────
function decodeJwt(token: string): Record<string, any> {
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

describe('Terminal API (e2e)', () => {
  let app: INestApplication;
  let terminalToken: string;   // set in "PIN login" test, used by all subsequent tests

  // ── App bootstrap ────────────────────────────────────────────────────────
  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ════════════════════════════════════════════════════════════════════════
  // 1. Terminal Activation
  // ════════════════════════════════════════════════════════════════════════
  describe('Terminal activation', () => {
    it('activates with code T-001', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/terminal/activate')
        .send({ terminal_code: 'T-001' })
        .expect(201);

      expect(res.body).toHaveProperty('terminal');
      expect(res.body.terminal.terminal_code).toBe('T-001');
      expect(res.body).toHaveProperty('business');
    });

    it('returns 404 for unknown terminal code', async () => {
      await request(app.getHttpServer())
        .post('/api/terminal/activate')
        .send({ terminal_code: 'DOES-NOT-EXIST' })
        .expect(404);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 2. PIN Login — THIS IS THE PREVIOUSLY BROKEN TEST
  //    Bug: seed data might not exist → no token → cascade failure
  //    Fix: seed-test.ts runs in globalSetup, T-001 + PIN 1234 always exist
  // ════════════════════════════════════════════════════════════════════════
  describe('PIN login', () => {
    it('logs in with PIN 1234 on terminal T-001 and returns a token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ pin: '1234', terminal_code: 'T-001' })
        .expect(201);

      // Token must exist
      expect(res.body).toHaveProperty('access_token');
      expect(typeof res.body.access_token).toBe('string');
      expect(res.body.access_token.length).toBeGreaterThan(20);

      // ── Bug #1 fix verification: JWT MUST contain business_id ───────────
      const claims = decodeJwt(res.body.access_token);
      expect(claims).toHaveProperty('business_id');
      expect(claims.business_id).toBe(FIXED_IDS.business);
      // Without business_id the catalog endpoint returns 401/403
      // ────────────────────────────────────────────────────────────────────

      expect(claims).toHaveProperty('sub');
      expect(claims).toHaveProperty('role');
      expect(['owner', 'manager', 'employee']).toContain(claims.role);

      // Stash token for downstream tests — this assignment is the key fix.
      // Previously if this test failed, terminalToken stayed undefined and
      // every subsequent test returned 401.
      terminalToken = res.body.access_token;
    });

    it('rejects an incorrect PIN', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ pin: '0000', terminal_code: 'T-001' })
        .expect(401);
    });

    it('rejects a valid PIN on the wrong terminal', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ pin: '1234', terminal_code: 'T-999' })
        .expect(401);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 3. Catalog — previously broke as a CASCADE of the PIN login failure
  //    Now that terminalToken is guaranteed to be set, this always works.
  // ════════════════════════════════════════════════════════════════════════
  describe('Catalog', () => {
    it('returns categories and products when authenticated', async () => {
      // This test was silently broken (returned no token → 401 here)
      const res = await request(app.getHttpServer())
        .get('/api/terminal/catalog')
        .set('Authorization', `Bearer ${terminalToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('categories');
      expect(res.body).toHaveProperty('products');
      expect(Array.isArray(res.body.categories)).toBe(true);
      expect(Array.isArray(res.body.products)).toBe(true);

      // Seed created exactly 1 category + 1 product — verify they're present
      const cat = res.body.categories.find((c: any) => c.id === FIXED_IDS.category);
      expect(cat).toBeDefined();
      expect(cat.name).toBe('Test Category');

      const prod = res.body.products.find((p: any) => p.id === FIXED_IDS.product);
      expect(prod).toBeDefined();
      expect(prod.name).toBe('Test Product');
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer())
        .get('/api/terminal/catalog')
        .expect(401);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 4. Heartbeat
  // ════════════════════════════════════════════════════════════════════════
  describe('Heartbeat', () => {
    it('updates terminal last_seen_at', async () => {
      await request(app.getHttpServer())
        .post('/api/terminal/heartbeat')
        .set('Authorization', `Bearer ${terminalToken}`)
        .send({ terminal_id: FIXED_IDS.terminal })
        .expect(201);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 5. Clock in / out
  // ════════════════════════════════════════════════════════════════════════
  describe('Clock in / out', () => {
    it('clocks in the authenticated employee', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/terminal/clock-in')
        .set('Authorization', `Bearer ${terminalToken}`)
        .send({ terminal_id: FIXED_IDS.terminal })
        .expect(201);

      expect(res.body).toHaveProperty('clock_in');
    });

    it('clocks out the authenticated employee', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/terminal/clock-out')
        .set('Authorization', `Bearer ${terminalToken}`)
        .expect(201);

      expect(res.body).toHaveProperty('clock_out');
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 6. Create transaction
  // ════════════════════════════════════════════════════════════════════════
  describe('Transactions', () => {
    let createdTxnId: string;

    it('creates a cash transaction', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/terminal/transactions')
        .set('Authorization', `Bearer ${terminalToken}`)
        .send({
          subtotal      : 25.00,
          tax_amount    : 0,
          total         : 25.00,
          payment_method: 'cash',
          location_id   : FIXED_IDS.location,
          terminal_id   : FIXED_IDS.terminal,
          items         : [
            {
              product_id  : FIXED_IDS.product,
              variant_id  : null,
              product_name: 'Test Product',
              variant_name: null,
              quantity    : 1,
              unit_price  : 25.00,
              line_total  : 25.00,
              modifiers_json: [],
            },
          ],
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('transaction_number');
      expect(res.body.transaction_number).toMatch(/^TXN-/);
      expect(res.body.status).toBe('completed');

      createdTxnId = res.body.id;
    });

    it("appears in today's transaction list", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/terminal/transactions/today?terminal_id=${FIXED_IDS.terminal}`)
        .set('Authorization', `Bearer ${terminalToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const found = res.body.find((t: any) => t.id === createdTxnId);
      expect(found).toBeDefined();
    });

    it('voids the transaction within the session', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/terminal/transactions/${createdTxnId}/void`)
        .set('Authorization', `Bearer ${terminalToken}`)
        .send({ reason: 'Test void' })
        .expect(201);

      expect(res.body.status).toBe('voided');
    });
  });
});