// ESC/POS Receipt Generator
// Generates receipt data as formatted text + ESC/POS byte commands

export interface ReceiptData {
  businessName: string;
  locationName: string;
  terminalCode: string;
  transactionNumber: string;
  employeeName: string;
  items: {
    name: string;
    variant?: string;
    modifiers?: string[];
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  date: Date;
  currency: string;
}

// ===== TEXT RECEIPT (for preview / fallback) =====

export function generateTextReceipt(data: ReceiptData): string {
  const w = 40; // character width of thermal receipt
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

  const fmt = (amount: number) => `${amount.toFixed(2)} ${data.currency}`;
  const dateStr = data.date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = data.date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const lines: string[] = [
    '',
    center(data.businessName),
    center(data.locationName),
    center(`Terminal: ${data.terminalCode}`),
    line,
    center(data.transactionNumber),
    center(`${dateStr}  ${timeStr}`),
    center(`Cashier: ${data.employeeName}`),
    line,
    '',
  ];

  // Items
  for (const item of data.items) {
    const nameStr = item.variant ? `${item.name} (${item.variant})` : item.name;
    lines.push(leftRight(nameStr, ''));
    lines.push(leftRight(`  ${item.quantity} x ${fmt(item.unitPrice)}`, fmt(item.lineTotal)));
    if (item.modifiers && item.modifiers.length > 0) {
      lines.push(`  + ${item.modifiers.join(', ')}`);
    }
  }

  lines.push('');
  lines.push(dash);
  lines.push(leftRight('Subtotal', fmt(data.subtotal)));
  if (data.taxAmount > 0) {
    lines.push(leftRight('Tax', fmt(data.taxAmount)));
  }
  lines.push(line);
  lines.push(leftRight('TOTAL', fmt(data.total)));
  lines.push(line);
  lines.push('');
  lines.push(leftRight('Payment', formatPaymentMethod(data.paymentMethod)));
  lines.push('');
  lines.push(center('Thank you for your visit!'));
  lines.push(center('Please come again'));
  lines.push('');
  lines.push('');

  return lines.join('\n');
}

function formatPaymentMethod(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash',
    card_cmi: 'Card (CMI)',
    card_payzone: 'Card (Payzone)',
    other: 'Other',
  };
  return labels[method] || method;
}

// ===== ESC/POS COMMANDS =====

const ESC = 0x1b;
const GS = 0x1d;

export function generateEscPosReceipt(data: ReceiptData): Uint8Array {
  const encoder = new TextEncoder();
  const commands: number[] = [];

  // Helper to add text
  const addText = (text: string) => {
    const bytes = encoder.encode(text + '\n');
    commands.push(...bytes);
  };

  // Helper for ESC/POS commands
  const cmd = (...bytes: number[]) => commands.push(...bytes);

  // Initialize printer
  cmd(ESC, 0x40); // ESC @ — Initialize

  // Center align
  cmd(ESC, 0x61, 0x01); // ESC a 1 — Center

  // Bold + Double size for business name
  cmd(ESC, 0x45, 0x01); // ESC E 1 — Bold on
  cmd(GS, 0x21, 0x11);  // GS ! 0x11 — Double width + height
  addText(data.businessName);
  cmd(GS, 0x21, 0x00);  // GS ! 0x00 — Normal size
  cmd(ESC, 0x45, 0x00); // ESC E 0 — Bold off

  addText(data.locationName);
  addText(`Terminal: ${data.terminalCode}`);
  addText('');

  // Transaction info
  cmd(ESC, 0x45, 0x01); // Bold
  addText(data.transactionNumber);
  cmd(ESC, 0x45, 0x00);

  const dateStr = data.date.toLocaleDateString('en-GB');
  const timeStr = data.date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  addText(`${dateStr}  ${timeStr}`);
  addText(`Cashier: ${data.employeeName}`);

  // Separator
  addText('================================');

  // Left align for items
  cmd(ESC, 0x61, 0x00); // ESC a 0 — Left align

  const fmt = (n: number) => `${n.toFixed(2)} ${data.currency}`;

  for (const item of data.items) {
    const name = item.variant ? `${item.name} (${item.variant})` : item.name;
    addText(name);
    addText(`  ${item.quantity} x ${fmt(item.unitPrice)}    ${fmt(item.lineTotal)}`);
    if (item.modifiers && item.modifiers.length > 0) {
      addText(`  + ${item.modifiers.join(', ')}`);
    }
  }

  addText('');
  addText('--------------------------------');
  addText(`Subtotal:           ${fmt(data.subtotal)}`);
  if (data.taxAmount > 0) {
    addText(`Tax:                ${fmt(data.taxAmount)}`);
  }
  addText('================================');

  // Bold total
  cmd(ESC, 0x45, 0x01);
  cmd(GS, 0x21, 0x01); // Double height
  addText(`TOTAL:    ${fmt(data.total)}`);
  cmd(GS, 0x21, 0x00);
  cmd(ESC, 0x45, 0x00);

  addText('================================');
  addText(`Payment: ${formatPaymentMethod(data.paymentMethod)}`);
  addText('');

  // Center footer
  cmd(ESC, 0x61, 0x01);
  addText('Thank you for your visit!');
  addText('Please come again');
  addText('');
  addText('');

  // Cut paper
  cmd(GS, 0x56, 0x00); // GS V 0 — Full cut

  // Open cash drawer (for cash payments)
  if (data.paymentMethod === 'cash') {
    cmd(ESC, 0x70, 0x00, 0x19, 0xfa); // ESC p 0 — Open drawer
  }

  return new Uint8Array(commands);
}

// ===== PRINT VIA USB/SERIAL (Electron) =====

export async function printReceipt(data: ReceiptData): Promise<boolean> {
  try {
    // Try Web Serial API (Chrome/Electron)
    if ('serial' in navigator) {
      return await printViaWebSerial(data);
    }
    // Fallback: generate text and open print dialog
    return printViaWindow(data);
  } catch (error) {
    console.error('[Receipt] Print failed:', error);
    return printViaWindow(data);
  }
}

async function printViaWebSerial(data: ReceiptData): Promise<boolean> {
  try {
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: 9600 });
    const writer = port.writable.getWriter();
    const escPosData = generateEscPosReceipt(data);
    await writer.write(escPosData);
    writer.releaseLock();
    await port.close();
    return true;
  } catch {
    return false;
  }
}

function printViaWindow(data: ReceiptData): boolean {
  const text = generateTextReceipt(data);
  const printWindow = window.open('', '_blank', 'width=320,height=600');
  if (!printWindow) return false;

  printWindow.document.write(`
    <html><head><style>
      body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 10px; width: 280px; }
      pre { white-space: pre-wrap; margin: 0; }
    </style></head><body>
      <pre>${text}</pre>
      <script>window.print(); setTimeout(() => window.close(), 1000);</script>
    </body></html>
  `);
  printWindow.document.close();
  return true;
}

// Build receipt data from transaction context
export function buildReceiptData(
  config: any,
  employee: any,
  transaction: any,
  cartItems: any[],
  paymentMethod: string,
): ReceiptData {
  return {
    businessName: config?.business?.name || 'POS Business',
    locationName: config?.location?.name || '',
    terminalCode: config?.terminal?.terminal_code || '',
    transactionNumber: transaction?.transaction_number || `OFL-${Date.now()}`,
    employeeName: `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim(),
    items: cartItems.map((item) => ({
      name: item.product?.name || item.product_name || 'Item',
      variant: item.variant?.name || item.variant_name,
      modifiers: item.selectedModifiers?.map((m: any) => m.name) ||
        item.modifiers_json?.modifiers?.map((m: any) => m.name),
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice || item.unit_price),
      lineTotal: Number(item.lineTotal || item.line_total),
    })),
    subtotal: Number(transaction?.subtotal || 0),
    taxAmount: Number(transaction?.tax_amount || 0),
    total: Number(transaction?.total || 0),
    paymentMethod,
    date: new Date(),
    currency: config?.business?.currency || 'MAD',
  };
}
