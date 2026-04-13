// apps/terminal-app/src/services/receiptService.ts
// ESC/POS Receipt Generator + Serial Port Manager

export interface ReceiptData {
  businessName     : string;
  locationName     : string;
  terminalCode     : string;
  transactionNumber: string;
  offlineRef?      : string;
  employeeName     : string;
  items: {
    name     : string;
    variant? : string;
    modifiers?: string[];
    quantity : number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal      : number;
  taxAmount     : number;
  total         : number;
  paymentMethod : string;
  date          : Date;
  currency      : string;
  changeGiven?  : number;
}

// ── Baud rate setting ─────────────────────────────────────────────────────────
// Gap #1: default changed 9600 → 115200. Cashier can override in settings:
//   localStorage.setItem('printer_baud_rate', '9600')
const BAUD_RATE_KEY = 'printer_baud_rate';
export function getPrinterBaudRate(): number {
  return parseInt(localStorage.getItem(BAUD_RATE_KEY) || '115200', 10);
}
export function setPrinterBaudRate(rate: number): void {
  localStorage.setItem(BAUD_RATE_KEY, String(rate));
}

// ── Port manager (Gap #1 core fix) ───────────────────────────────────────────
// Previously: requestPort() was called every print → dialog every time.
// Now:
//   1. Try in-memory cached port (same session)
//   2. Try getPorts() — returns previously granted ports with NO dialog
//   3. Only if nothing found: requestPort() once → dialog shown once, then saved
let _cachedPort: any = null;

async function getOrRequestPort(): Promise<any> {
  const serial = (navigator as any).serial;

  // 1. In-memory cache (already used this session)
  if (_cachedPort) {
    try {
      if (_cachedPort.readable) return _cachedPort;
    } catch {
      _cachedPort = null;
    }
  }

  // 2. Previously granted port (survives page reload, no dialog)
  try {
    const ports: any[] = await serial.getPorts();
    if (ports.length > 0) {
      _cachedPort = ports[0];
      console.log('[Printer] Auto-reconnected to saved port (no dialog)');
      return _cachedPort;
    }
  } catch {
    // getPorts not available — fall through
  }

  // 3. First-time only: show picker dialog and remember the result
  console.log('[Printer] First-time setup — showing port picker');
  const port = await serial.requestPort();
  _cachedPort = port;
  return port;
}

// Call once at app startup to pre-load the port silently
export async function initPrinterPort(): Promise<void> {
  if (!('serial' in navigator)) return;
  try {
    const ports: any[] = await (navigator as any).serial.getPorts();
    if (ports.length > 0) {
      _cachedPort = ports[0];
      console.log('[Printer] Port pre-loaded on startup');
    }
  } catch {
    // No permission yet — will prompt on first print
  }
}

// ── Text receipt (preview / window.print fallback) ────────────────────────────

export function generateTextReceipt(data: ReceiptData): string {
  const w    = 40;
  const line = '='.repeat(w);
  const dash = '-'.repeat(w);

  const center = (s: string) => {
    const pad = Math.max(0, Math.floor((w - s.length) / 2));
    return ' '.repeat(pad) + s;
  };
  const leftRight = (l: string, r: string) => {
    const space = Math.max(1, w - l.length - r.length);
    return l + ' '.repeat(space) + r;
  };
  const fmt     = (n: number) => `${n.toFixed(2)} ${data.currency}`;
  const dateStr = data.date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = data.date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const lines: string[] = [
    '',
    center(data.businessName),
    center(data.locationName),
    center(`Terminal: ${data.terminalCode}`),
    line,
    center(data.transactionNumber),
  ];

  if (data.offlineRef) {
    lines.push(center(`Offline Ref: ${data.offlineRef}`));
    lines.push(center('(will update when synced)'));
  }

  lines.push(
    center(`${dateStr}  ${timeStr}`),
    center(`Cashier: ${data.employeeName}`),
    line, '',
  );

  for (const item of data.items) {
    const name = item.variant ? `${item.name} (${item.variant})` : item.name;
    lines.push(leftRight(name, ''));
    lines.push(leftRight(`  ${item.quantity} x ${fmt(item.unitPrice)}`, fmt(item.lineTotal)));
    if (item.modifiers?.length) lines.push(`  + ${item.modifiers.join(', ')}`);
  }

  lines.push('', dash);
  lines.push(leftRight('Subtotal', fmt(data.subtotal)));
  if (data.taxAmount > 0) lines.push(leftRight('Tax', fmt(data.taxAmount)));
  lines.push(line);
  lines.push(leftRight('TOTAL', fmt(data.total)));
  lines.push(line, '');
  lines.push(leftRight('Payment', formatPaymentMethod(data.paymentMethod)));
  if (data.paymentMethod === 'cash' && data.changeGiven != null) {
    lines.push(leftRight('Change given', fmt(data.changeGiven)));
  }
  lines.push('');
  lines.push(center('Thank you for your visit!'));
  lines.push(center('Please come again'));
  lines.push('', '');

  return lines.join('\n');
}

function formatPaymentMethod(method: string): string {
  return { cash: 'Cash', card_cmi: 'Card (CMI)', card_payzone: 'Card (Payzone)', other: 'Other' }[method] || method;
}

// ── ESC/POS byte commands ─────────────────────────────────────────────────────

const ESC = 0x1b;
const GS  = 0x1d;
const LF  = 0x0a;

export function generateEscPosReceipt(data: ReceiptData): Uint8Array {
  const commands: number[] = [];
  const enc  = new TextEncoder();
  const cmd  = (...bytes: number[]) => commands.push(...bytes);
  const text = (s: string) => commands.push(...enc.encode(s), LF);
  const fmt  = (n: number) => `${n.toFixed(2)} ${data.currency}`;

  cmd(ESC, 0x40);          // init
  cmd(ESC, 0x61, 0x01);    // center
  text(data.businessName);
  text(data.locationName);
  text(`Terminal: ${data.terminalCode}`);
  text('='.repeat(32));
  text(data.transactionNumber);
  if (data.offlineRef) text(`Offline Ref: ${data.offlineRef}`);

  const dateStr = data.date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = data.date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  text(`${dateStr}  ${timeStr}`);
  text(`Cashier: ${data.employeeName}`);
  text('='.repeat(32));
  text('');

  cmd(ESC, 0x61, 0x00);  // left-align

  for (const item of data.items) {
    const name  = item.variant ? `${item.name} (${item.variant})` : item.name;
    const qty   = `  ${item.quantity} x ${fmt(item.unitPrice)}`;
    const total = fmt(item.lineTotal);
    text(name);
    text(qty + ' '.repeat(Math.max(1, 32 - qty.length - total.length)) + total);
    if (item.modifiers?.length) text(`  + ${item.modifiers.join(', ')}`);
  }

  text('');
  text('-'.repeat(32));
  const sub = fmt(data.subtotal);
  text('Subtotal' + ' '.repeat(Math.max(1, 32 - 8 - sub.length)) + sub);
  if (data.taxAmount > 0) {
    const tax = fmt(data.taxAmount);
    text('Tax' + ' '.repeat(Math.max(1, 32 - 3 - tax.length)) + tax);
  }
  text('='.repeat(32));
  cmd(ESC, 0x45, 0x01);  // bold
  const tot = fmt(data.total);
  text('TOTAL' + ' '.repeat(Math.max(1, 32 - 5 - tot.length)) + tot);
  cmd(ESC, 0x45, 0x00);  // bold off
  text('='.repeat(32));
  text('');
  text(`Payment: ${formatPaymentMethod(data.paymentMethod)}`);
  if (data.paymentMethod === 'cash' && data.changeGiven != null) {
    const chg = fmt(data.changeGiven);
    text('Change given' + ' '.repeat(Math.max(1, 32 - 12 - chg.length)) + chg);
  }
  text('');
  cmd(ESC, 0x61, 0x01);  // center
  text('Thank you for your visit!');
  text('Please come again');
  text('');
  text('');

  cmd(GS, 0x56, 0x00);   // full cut

  if (data.paymentMethod === 'cash') {
    cmd(ESC, 0x70, 0x00, 0x19, 0xfa);  // open cash drawer
  }

  return new Uint8Array(commands);
}

// ── Print ─────────────────────────────────────────────────────────────────────

export async function printReceipt(
  data: ReceiptData,
): Promise<{ success: boolean; drawerOpened: boolean }> {
  if ('serial' in navigator) {
    const result = await printViaWebSerial(data);
    if (result !== null) return result;
  }
  printViaWindow(data);
  return { success: true, drawerOpened: false };
}

async function printViaWebSerial(
  data: ReceiptData,
): Promise<{ success: boolean; drawerOpened: boolean } | null> {
  try {
    const port     = await getOrRequestPort();
    const baudRate = getPrinterBaudRate();

    await port.open({ baudRate });

    const writer = port.writable.getWriter();
    await writer.write(generateEscPosReceipt(data));
    writer.releaseLock();
    await port.close();

    const drawerOpened = data.paymentMethod === 'cash';
    console.log(`[Printer] Done — ${baudRate} bps — drawer: ${drawerOpened}`);
    return { success: true, drawerOpened };

  } catch (err: any) {
    // Stale port (unplugged)? Clear cache so next print shows picker again
    if (err?.name === 'NetworkError' || err?.name === 'InvalidStateError') {
      console.warn('[Printer] Port went stale — will re-prompt next print');
      _cachedPort = null;
    } else {
      console.error('[Printer] Serial error:', err);
    }
    return null;  // signals caller to fall back to printViaWindow
  }
}

function printViaWindow(data: ReceiptData): void {
  const text = generateTextReceipt(data);
  const w = window.open('', '_blank', 'width=320,height=600');
  if (!w) return;
  w.document.write(`
    <html><head><style>
      body { font-family:'Courier New',monospace; font-size:12px; margin:0; padding:10px; width:280px; }
      pre  { white-space:pre-wrap; margin:0; }
    </style></head><body>
      <pre>${text}</pre>
      <script>window.print(); setTimeout(()=>window.close(),1000);</script>
    </body></html>
  `);
  w.document.close();
}

// ── Build receipt data ────────────────────────────────────────────────────────

export function buildReceiptData(
  config       : any,
  employee     : any,
  transaction  : any,
  cartItems    : any[],
  paymentMethod: string,
  changeGiven? : number,
): ReceiptData {
  return {
    businessName     : config?.business?.name || 'POS Business',
    locationName     : config?.location?.name || '',
    terminalCode     : config?.terminal?.terminal_code || '',
    transactionNumber: transaction?.transaction_number || `OFL-${Date.now()}`,
    offlineRef       : transaction?.is_offline ? transaction?.transaction_number : undefined,
    employeeName     : `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim(),
    items: cartItems.map((item) => ({
      name     : item.product?.name || item.product_name || 'Item',
      variant  : item.variant?.name || item.variant_name,
      modifiers: item.selectedModifiers?.map((m: any) => m.name) ||
                 item.modifiers_json?.modifiers?.map((m: any) => m.name),
      quantity : item.quantity,
      unitPrice: Number(item.unitPrice || item.unit_price),
      lineTotal: Number(item.lineTotal || item.line_total),
    })),
    subtotal     : Number(transaction?.subtotal   || 0),
    taxAmount    : Number(transaction?.tax_amount || 0),
    total        : Number(transaction?.total      || 0),
    paymentMethod,
    changeGiven,
    date         : new Date(),
    currency     : config?.business?.currency || 'MAD',
  };
}