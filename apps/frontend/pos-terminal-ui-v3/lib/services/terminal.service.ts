/**
 * Terminal Service
 * Handles all terminal operations for the POS system
 */

import { apiFetch, setToken, clearToken, ApiError } from '../api';

// ============================================================
// TYPES
// ============================================================

export interface TerminalConfig {
  terminal_id: string;
  terminal_code: string;
  business_id: string;
  business_name: string;
  location_id: string;
  location_name: string;
  currency: string;
  tax_rate: number;
  receipt_header: string;
  receipt_footer: string;
  offline_mode_enabled: boolean;
  auto_sync_interval: number; // in seconds
  printer_enabled: boolean;
  cash_drawer_enabled: boolean;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  pin_hash: string;
  role: 'owner' | 'manager' | 'cashier' | 'server';
  can_void: boolean;
  can_discount: boolean;
  can_refund: boolean;
  avatar_url?: string;
  is_active: boolean;
  clock_in_time?: string;
}

export interface ActiveEmployee extends Employee {
  clock_in_time: string;
  session_id: string;
}

// Matches the backend terminal customer payload (lookup / quick-add):
// { id, customer_code, first_name, last_name, grade: {name,color_hex}|null, points_balance }
export interface Customer {
  id: string;
  customer_code: string;
  first_name: string;
  last_name: string;
  grade: { name: string; color_hex: string } | null;
  points_balance: number;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
  product_count: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  price_override: number;
  sku?: string;
  is_default: boolean;
}

export interface Modifier {
  id: string;
  name: string;
  price: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  is_required: boolean;
  min_selection: number;
  max_selection: number;
  modifiers: Modifier[];
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  image_url?: string;
  category_id: string;
  variants?: ProductVariant[];
  modifier_groups?: ModifierGroup[];
  is_sold_out: boolean;
  is_active: boolean;
  sku?: string;
  barcode?: string;
  stock_quantity?: number;
  track_stock: boolean;
}

export interface CatalogData {
  categories: Category[];
  products: Product[];
  last_updated: string;
}

export interface Promotion {
  id: string;
  name: string;
  type: 'percentage' | 'fixed' | 'bogo' | 'bundle';
  value: number;
  min_purchase?: number;
  applicable_products?: string[];
  applicable_categories?: string[];
  start_date: string;
  end_date: string;
  is_active: boolean;
  auto_apply: boolean;
}

export interface AppliedPromotion {
  promotion_id: string;
  name: string;
  discount_amount: number;
}

export interface Coupon {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_purchase?: number;
  max_discount?: number;
  usage_limit?: number;
  used_count: number;
  applicable_products?: string[];
  applicable_categories?: string[];
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface CouponValidation {
  valid: boolean;
  coupon?: Coupon;
  discount_amount?: number;
  error?: string;
}

export interface TransactionItem {
  id: string;
  product_id: string;
  product_name: string;
  variant_id?: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  modifiers?: { id: string; name: string; price: number }[];
  notes?: string;
  discount_amount?: number;
}

export interface Transaction {
  id: string;
  transaction_number: string;
  terminal_id: string;
  employee_id: string;
  employee_name: string;
  customer_id?: string;
  customer_name?: string;
  items: TransactionItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  payment_method: 'cash' | 'card' | 'mobile' | 'split';
  payment_details?: {
    cash_amount?: number;
    card_amount?: number;
    mobile_amount?: number;
    change_amount?: number;
    card_last_four?: string;
    mobile_reference?: string;
  };
  applied_promotions?: AppliedPromotion[];
  applied_coupon?: string;
  status: 'completed' | 'voided' | 'refunded' | 'pending';
  void_reason?: string;
  void_by?: string;
  void_at?: string;
  created_at: string;
  is_offline: boolean;
  synced_at?: string;
}

// ── Restaurant / Table Session types ─────────────────────────────────────────

export interface FloorPlanTableSession {
  id: string;
  opened_at: string;
  guest_count: number | null;
  customer_name: string | null;
  item_count: number;
  current_total_ttc: number;
  server_name: string | null;
}

export interface FloorPlanTable {
  id: string;
  table_number: string;
  capacity: number;
  area_id: string;
  area_name: string;
  position_x: number | null;
  position_y: number | null;
  session_status: 'available' | 'occupied' | 'awaiting_payment';
  current_session: FloorPlanTableSession | null;
}

export interface FloorPlanResponse {
  tables: FloorPlanTable[];
}

export interface OpenedSession {
  id: string;
  table_id: string;
  table_number: string;
  status: 'open' | 'awaiting_payment';
  opened_at: string;
  guest_count: number | null;
  customer_id: string | null;
  items: SessionItem[];
}

export interface SessionItem {
  id: string;
  product_id: string;
  product_name: string | null;
  variant_id?: string | null;
  quantity: number;
  unit_price_ttc: number;
  kds_status: 'new' | 'preparing' | 'ready' | 'served' | 'cancelled';
  notes?: string | null;
  modifiers_json?: { modifiers?: { name: string; price: number }[] } | null;
  customer_id?: string | null;
}

export interface AddSessionItemPayload {
  product_id: string;
  quantity: number;
  variant_id?: string;
  notes?: string;
  customer_id?: string;
}

export interface AddItemsResponse {
  added_items: SessionItem[];
  session_total_ttc: number;
}

// ── End restaurant types ──────────────────────────────────────────────────────

export interface SyncStatus {
  pending_transactions: number;
  pending_clock_events: number;
  last_sync_at?: string;
  is_syncing: boolean;
  last_error?: string;
}

export interface HeartbeatResponse {
  online: boolean;
  server_time: string;
  pending_updates: boolean;
}

// ============================================================
// TERMINAL SERVICE CLASS
// ============================================================

class TerminalService {
  private config: TerminalConfig | null = null;
  private activeEmployees: Map<string, ActiveEmployee> = new Map();
  private catalogCache: CatalogData | null = null;
  private offlineTransactions: Transaction[] = [];
  private offlineClockEvents: { employee_id: string; type: 'in' | 'out'; timestamp: string }[] = [];
  private isOnline: boolean = true;

  // ============================================================
  // ACTIVATION & CONFIGURATION
  // ============================================================

  private readonly CONFIG_KEY = 'terminal_config';

  /**
   * Persist the resolved terminal config to memory + localStorage so it
   * survives page reloads (the backend issues no token at activation, so the
   * config is the only record of which terminal/location/business this is).
   */
  private persistConfig(cfg: TerminalConfig): void {
    this.config = cfg;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.CONFIG_KEY, JSON.stringify(cfg));
      } catch {
        // localStorage unavailable (private mode / quota) — memory copy still works for this session
      }
    }
  }

  /**
   * Activate terminal with activation code.
   *
   * The backend returns a NESTED payload { terminal, business, location } and
   * mints no token here. We flatten it into TerminalConfig and persist it; the
   * identity-bearing JWT is obtained later at pin-login.
   */
  async activate(activationCode: string): Promise<{ success: boolean; config?: TerminalConfig; error?: string }> {
    try {
      const data = await apiFetch<{
        terminal: { id: string; terminal_code: string; device_name?: string };
        business: { id: string; name: string; currency?: string };
        location: { id: string; name: string };
      }>('/api/terminal/activate', {
        method: 'POST',
        body: JSON.stringify({ terminal_code: activationCode }),
      });

      const cfg: TerminalConfig = {
        terminal_id: data.terminal.id,
        terminal_code: data.terminal.terminal_code,
        business_id: data.business.id,
        business_name: data.business.name,
        location_id: data.location.id,
        location_name: data.location.name,
        currency: data.business.currency ?? 'MAD',
        tax_rate: 0,
        receipt_header: '',
        receipt_footer: '',
        offline_mode_enabled: false,
        auto_sync_interval: 60,
        printer_enabled: false,
        cash_drawer_enabled: false,
      };
      this.persistConfig(cfg);
      return { success: true, config: cfg };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Activation failed';
      return { success: false, error: message };
    }
  }

  /**
   * Get current terminal configuration (memory, falling back to localStorage
   * so a reloaded tab is still "activated").
   */
  getConfig(): TerminalConfig | null {
    if (this.config) return this.config;
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(this.CONFIG_KEY);
      if (raw) {
        try {
          this.config = JSON.parse(raw) as TerminalConfig;
        } catch {
          // corrupt config — ignore, caller will treat as not activated
        }
      }
    }
    return this.config;
  }

  /**
   * True when the terminal has been activated (config present).
   */
  isActivated(): boolean {
    return this.getConfig() !== null;
  }

  // ============================================================
  // CONNECTIVITY
  // ============================================================

  /**
   * Check server connectivity and sync status
   */
  async heartbeat(): Promise<HeartbeatResponse> {
    try {
      const data = await apiFetch<HeartbeatResponse>('/api/terminal/heartbeat', { method: 'POST' });
      this.isOnline = true;
      return data;
    } catch {
      this.isOnline = false;
      return { online: false, server_time: new Date().toISOString(), pending_updates: false };
    }
  }

  // ============================================================
  // EMPLOYEE MANAGEMENT
  // ============================================================

  /**
   * Clock in an employee
   */
  async clockIn(employeeId: string, pin: string): Promise<{ success: boolean; employee?: ActiveEmployee; error?: string }> {
    try {
      const cfg = this.getConfig();
      if (!cfg) {
        return { success: false, error: 'Terminal not configured' };
      }

      // pin-login resolves the employee against the terminal's business and
      // mints the JWT (business_id / terminal_id / location_id claims). The
      // backend field is `access_token`, NOT `token`.
      const auth = await apiFetch<{
        access_token: string;
        user: {
          id: string;
          first_name: string;
          last_name: string;
          role: string;
          business_id: string;
          permissions?: Record<string, boolean> | null;
        };
      }>('/api/auth/pin-login', {
        method: 'POST',
        body: JSON.stringify({ pin, terminal_code: cfg.terminal_code }),
      });
      setToken(auth.access_token);

      // Record the clock entry (best-effort; auth already succeeded above).
      try {
        await apiFetch('/api/terminal/clock-in', {
          method: 'POST',
          body: JSON.stringify({ terminal_id: cfg.terminal_id }),
        });
      } catch {
        // clock entry is non-critical for the session; token is already set
      }

      const perms = auth.user.permissions ?? {};
      const active: ActiveEmployee = {
        id: auth.user.id,
        first_name: auth.user.first_name,
        last_name: auth.user.last_name,
        pin_hash: '',
        role: auth.user.role as Employee['role'],
        can_void: perms.can_void ?? false,
        can_discount: perms.can_discount ?? false,
        can_refund: perms.can_refund ?? false,
        is_active: true,
        clock_in_time: new Date().toISOString(),
        session_id: '',
      };
      this.activeEmployees.set(active.id, active);
      return { success: true, employee: active };
    } catch (err) {
      clearToken();
      const message = err instanceof Error ? err.message : 'Authentication failed';
      return { success: false, error: message };
    }
  }

  /**
   * Clock out an employee
   */
  async clockOut(employeeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await apiFetch('/api/terminal/clock-out', { method: 'POST' });
      this.activeEmployees.delete(employeeId);
      clearToken();
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Clock out failed';
      return { success: false, error: message };
    }
  }

  /**
   * Get all currently clocked-in employees
   */
  getActiveEmployees(): ActiveEmployee[] {
    return Array.from(this.activeEmployees.values());
  }

  // ============================================================
  // CATALOG
  // ============================================================

  /**
   * Get product catalog (categories and products)
   */
  async getCatalog(forceRefresh: boolean = false): Promise<CatalogData> {
    if (this.catalogCache && !forceRefresh) {
      return this.catalogCache;
    }
    try {
      const data = await apiFetch<CatalogData>('/api/terminal/catalog');
      this.catalogCache = data;
      return data;
    } catch {
      if (this.catalogCache) return this.catalogCache;
      throw new Error('Unable to load catalog');
    }
  }

  // ============================================================
  // CUSTOMER MANAGEMENT
  // ============================================================

  /**
   * Lookup customer by phone number or name
   */
  async lookupCustomer(query: string): Promise<Customer[]> {
    try {
      const encoded = encodeURIComponent(query);
      const data = await apiFetch<Customer>(`/api/terminal/customers/lookup?phone=${encoded}`);
      return [data];
    } catch {
      return [];
    }
  }

  /**
   * Quick add a new customer
   */
  async quickAddCustomer(name: string, phone: string): Promise<{ success: boolean; customer?: Customer; error?: string }> {
    try {
      const [first_name, ...rest] = name.trim().split(' ');
      const last_name = rest.join(' ') || first_name;
      const data = await apiFetch<Customer>('/api/terminal/customers/quick-add', {
        method: 'POST',
        body: JSON.stringify({ first_name, last_name, phone }),
      });
      return { success: true, customer: data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create customer';
      return { success: false, error: message };
    }
  }

  // ============================================================
  // PROMOTIONS & COUPONS
  // ============================================================

  /**
   * Evaluate and return applicable promotions for cart
   */
  async evaluatePromotions(items: TransactionItem[]): Promise<AppliedPromotion[]> {
    try {
      const data = await apiFetch<{ applicable_promotions: AppliedPromotion[] }>(
        '/api/terminal/promotions/evaluate',
        {
          method: 'POST',
          body: JSON.stringify({ items }),
        },
      );
      return data.applicable_promotions ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Validate a coupon code
   */
  async validateCoupon(code: string): Promise<CouponValidation> {
    try {
      const encoded = encodeURIComponent(code);
      const data = await apiFetch<{ valid: boolean; coupon: Coupon; discount_amount: number }>(
        `/api/terminal/coupons/validate?code=${encoded}`,
      );
      return { valid: true, coupon: data.coupon, discount_amount: data.discount_amount };
    } catch (err) {
      if (err instanceof ApiError && err.status === 410) {
        return { valid: false, error: 'Coupon already redeemed' };
      }
      const message = err instanceof Error ? err.message : 'Failed to validate coupon';
      return { valid: false, error: message };
    }
  }

  // ============================================================
  // TRANSACTIONS
  // ============================================================

  /**
   * Create a new transaction
   */
  async createTransaction(
    _employeeId: string,
    items: TransactionItem[],
    // Backend PaymentMethod enum: 'cash' | 'card_cmi' | 'card_payzone' | 'other'.
    paymentMethod: string,
    _paymentDetails?: Transaction['payment_details'],
    customerId?: string,
    appliedPromotions?: AppliedPromotion[],
    appliedCoupon?: string,
  ): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
    try {
      if (!this.config) return { success: false, error: 'Terminal not configured' };

      const subtotal = items.reduce((sum, i) => sum + i.line_total, 0);
      const promotionDiscount = appliedPromotions?.reduce((s, p) => s + p.discount_amount, 0) ?? 0;
      const total = subtotal - promotionDiscount;

      // Body must conform exactly to CreateTransactionDto — the backend uses
      // forbidNonWhitelisted, so any extra field (payment_details, per-item
      // notes, …) is rejected with a 400.
      const body: Record<string, unknown> = {
        items: items.map((i) => ({
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          line_total: i.line_total,
          ...(i.variant_id ? { variant_id: i.variant_id } : {}),
        })),
        subtotal,
        total,
        payment_method: paymentMethod,
        ...(customerId ? { customer_id: customerId } : {}),
        ...(appliedPromotions?.length
          ? { promotion_ids: appliedPromotions.map((p) => p.promotion_id) }
          : {}),
        ...(appliedCoupon ? { coupon_codes: [appliedCoupon] } : {}),
      };

      const data = await apiFetch<Transaction>('/api/terminal/transactions', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return { success: true, transaction: { ...data, is_offline: false } };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create transaction';
      return { success: false, error: message };
    }
  }

  /**
   * Void a transaction
   */
  async voidTransaction(
    transactionId: string,
    reason: string,
    managerPin?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await apiFetch(`/api/terminal/transactions/${transactionId}/void`, {
        method: 'POST',
        body: JSON.stringify({ reason, ...(managerPin ? { manager_pin: managerPin } : {}) }),
      });
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to void transaction';
      return { success: false, error: message };
    }
  }

  /**
   * Get today's transactions
   */
  async getTodayTransactions(): Promise<Transaction[]> {
    try {
      // The backend requires terminal_id as a query param and returns a raw
      // array (not { data: [...] }).
      const cfg = this.getConfig();
      const qs = cfg?.terminal_id ? `?terminal_id=${encodeURIComponent(cfg.terminal_id)}` : '';
      const data = await apiFetch<Transaction[]>(`/api/terminal/transactions/today${qs}`);
      const serverTxns = Array.isArray(data) ? data : [];
      return [...serverTxns, ...this.offlineTransactions];
    } catch {
      return this.offlineTransactions;
    }
  }

  // ============================================================
  // RESTAURANT — TABLE SESSIONS (Phase 10)
  // ============================================================

  /**
   * RST-030: Fetch the live floor plan (all tables + their active session summaries)
   */
  async getFloorPlan(locationId?: string): Promise<FloorPlanResponse> {
    const qs = locationId ? `?location_id=${encodeURIComponent(locationId)}` : '';
    return apiFetch<FloorPlanResponse>(`/api/terminal/tables/floor-plan${qs}`);
  }

  /**
   * RST-031: Open a table session
   */
  async openTable(
    tableId: string,
    guestCount?: number,
    customerId?: string,
  ): Promise<{ success: boolean; session?: OpenedSession; error?: string }> {
    try {
      const body: Record<string, unknown> = {};
      if (guestCount !== undefined) body.guest_count = guestCount;
      if (customerId) body.customer_id = customerId;
      const data = await apiFetch<OpenedSession>(`/api/terminal/tables/${tableId}/open`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return { success: true, session: data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open table';
      return { success: false, error: message };
    }
  }

  /**
   * RST-032: Add items to an open table session
   */
  async addSessionItems(
    sessionId: string,
    items: AddSessionItemPayload[],
  ): Promise<{ success: boolean; data?: AddItemsResponse; error?: string }> {
    try {
      const data = await apiFetch<AddItemsResponse>(`/api/terminal/table-sessions/${sessionId}/items`, {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add items';
      return { success: false, error: message };
    }
  }

  /**
   * RST-033: Modify a table session item (quantity / notes / customer_id)
   */
  async modifySessionItem(
    itemId: string,
    patch: { quantity?: number; notes?: string; customer_id?: string | null },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await apiFetch(`/api/terminal/table-session-items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to modify item';
      return { success: false, error: message };
    }
  }

  /**
   * RST-034: Remove (soft-delete) a table session item
   */
  async removeSessionItem(itemId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await apiFetch(`/api/terminal/table-session-items/${itemId}`, { method: 'DELETE' });
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove item';
      return { success: false, error: message };
    }
  }

  /**
   * RST-037: Transfer items between sessions
   */
  async transferSessionItems(
    itemIds: string[],
    targetSessionId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await apiFetch('/api/terminal/table-session-items/transfer', {
        method: 'POST',
        body: JSON.stringify({ item_ids: itemIds, target_table_session_id: targetSessionId }),
      });
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to transfer items';
      return { success: false, error: message };
    }
  }

  /**
   * RST-035: Close table → single checkout payload
   */
  async closeTable(sessionId: string): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const data = await apiFetch(`/api/terminal/table-sessions/${sessionId}/close`, { method: 'POST' });
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to close table';
      return { success: false, error: message };
    }
  }

  /**
   * RST-036: Split bill
   */
  async splitBill(
    sessionId: string,
    splitType: 'even' | 'by_item' | 'custom',
    count?: number,
    splits?: { label: string; item_ids?: string[] }[],
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const body: Record<string, unknown> = { split_type: splitType };
      if (splitType === 'even' && count !== undefined) {
        body.splits = Array.from({ length: count }, (_, i) => ({ label: `Guest ${i + 1}` }));
      } else if (splits) {
        body.splits = splits;
      }
      const data = await apiFetch(`/api/terminal/table-sessions/${sessionId}/split`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to split bill';
      return { success: false, error: message };
    }
  }

  /**
   * RST-038: Cancel / force-close a session
   */
  async cancelSession(
    sessionId: string,
    reason: string,
    forceClosePartial?: boolean,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const body: Record<string, unknown> = { reason };
      if (forceClosePartial !== undefined) body.force_close_partial = forceClosePartial;
      await apiFetch(`/api/terminal/table-sessions/${sessionId}/cancel`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel session';
      return { success: false, error: message };
    }
  }

  // ============================================================
  // SYNC
  // ============================================================

  /**
   * Push offline data to server
   */
  async pushSync(): Promise<{ success: boolean; synced_count: number; error?: string }> {
    try {
      if (!this.isOnline) {
        return { success: false, synced_count: 0, error: 'No network connection' };
      }

      const payload = {
        offline_transactions: this.offlineTransactions,
        offline_clock_events: this.offlineClockEvents,
      };

      const result = await apiFetch<{ synced_count?: number }>('/api/terminal/sync', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Clear offline data after successful server sync
      this.offlineTransactions = [];
      this.offlineClockEvents = [];

      return { success: true, synced_count: result?.synced_count ?? 0 };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      return { success: false, synced_count: 0, error: message };
    }
  }

  /**
   * Get current sync status from server
   */
  async fetchSyncStatus(): Promise<SyncStatus> {
    try {
      const data = await apiFetch<{ last_sync_at?: string; is_syncing: boolean; last_error?: string }>(
        '/api/terminal/sync/status',
      );
      return {
        pending_transactions: this.offlineTransactions.length,
        pending_clock_events: this.offlineClockEvents.length,
        last_sync_at: data.last_sync_at,
        is_syncing: data.is_syncing,
        last_error: data.last_error,
      };
    } catch {
      return this.getSyncStatus();
    }
  }

  /**
   * Get local sync status without a server round-trip
   */
  getSyncStatus(): SyncStatus {
    return {
      pending_transactions: this.offlineTransactions.length,
      pending_clock_events: this.offlineClockEvents.length,
      last_sync_at: undefined,
      is_syncing: false,
    };
  }

  /**
   * Fetch resolved items for a recommendation template (cross-sell / upsell)
   */
  async getRecommendationItems(templateId: string): Promise<Product[]> {
    try {
      const data = await apiFetch<{ items?: Product[] } | Product[]>(
        `/api/terminal/recommendation-templates/${templateId}/items`,
      );
      return Array.isArray(data) ? data : (data.items ?? []);
    } catch {
      return [];
    }
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  /**
   * Check if terminal is online
   */
  isTerminalOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Set online status (for testing/mock purposes)
   */
  setOnlineStatus(online: boolean): void {
    this.isOnline = online;
  }
}

// Export singleton instance
export const terminalService = new TerminalService();

// Export class for testing
export { TerminalService };
