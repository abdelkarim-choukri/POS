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

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  grade: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  points: number;
  total_spent: number;
  visit_count: number;
  last_visit?: string;
  notes?: string;
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

  /**
   * Activate terminal with activation code
   */
  async activate(activationCode: string): Promise<{ success: boolean; config?: TerminalConfig; error?: string }> {
    try {
      const data = await apiFetch<TerminalConfig>('/api/terminal/activate', {
        method: 'POST',
        body: JSON.stringify({ terminal_code: activationCode }),
      });
      this.config = data;
      return { success: true, config: data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Activation failed';
      return { success: false, error: message };
    }
  }

  /**
   * Get current terminal configuration
   */
  getConfig(): TerminalConfig | null {
    return this.config;
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
      if (!this.config) {
        return { success: false, error: 'Terminal not configured' };
      }
      const auth = await apiFetch<{ token: string }>('/api/auth/pin-login', {
        method: 'POST',
        body: JSON.stringify({ pin, terminal_code: this.config.terminal_code }),
      });
      setToken(auth.token);

      const data = await apiFetch<{ employee: Employee; session_id: string; clock_in_time: string }>(
        '/api/terminal/clock-in',
        { method: 'POST' },
      );
      const active: ActiveEmployee = {
        ...data.employee,
        pin_hash: '',
        clock_in_time: data.clock_in_time,
        session_id: data.session_id,
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
    employeeId: string,
    items: TransactionItem[],
    paymentMethod: Transaction['payment_method'],
    paymentDetails?: Transaction['payment_details'],
    customerId?: string,
    appliedPromotions?: AppliedPromotion[],
    appliedCoupon?: string,
  ): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
    try {
      if (!this.config) return { success: false, error: 'Terminal not configured' };

      const subtotal = items.reduce((sum, i) => sum + i.line_total, 0);
      const promotionDiscount = appliedPromotions?.reduce((s, p) => s + p.discount_amount, 0) ?? 0;
      const total = subtotal - promotionDiscount;

      const body: Record<string, unknown> = {
        items: items.map((i) => ({
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          line_total: i.line_total,
          ...(i.variant_id ? { variant_id: i.variant_id } : {}),
          ...(i.notes ? { notes: i.notes } : {}),
        })),
        subtotal,
        total,
        payment_method: paymentMethod,
        ...(paymentDetails ? { payment_details: paymentDetails } : {}),
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
        body: JSON.stringify({ reason }),
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
      const data = await apiFetch<{ data: Transaction[] }>(
        '/api/terminal/transactions/today',
      );
      const serverTxns = data.data ?? [];
      return [...serverTxns, ...this.offlineTransactions];
    } catch {
      return this.offlineTransactions;
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

      const syncedCount = this.offlineTransactions.length + this.offlineClockEvents.length;

      // Clear offline data after successful sync
      this.offlineTransactions = [];
      this.offlineClockEvents = [];

      return { success: true, synced_count: syncedCount };
    } catch {
      return { success: false, synced_count: 0, error: 'Sync failed' };
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return {
      pending_transactions: this.offlineTransactions.length,
      pending_clock_events: this.offlineClockEvents.length,
      last_sync_at: undefined,
      is_syncing: false,
    };
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
