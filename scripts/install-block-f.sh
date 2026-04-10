#!/bin/bash
# Block F — Install dependencies and run migration
set -e
export no_proxy=localhost,127.0.0.1
export NO_PROXY=localhost,127.0.0.1

echo "=== Block F: Kitchen Display System ==="
echo ""

# 1. Backend WebSocket deps
echo "[1/4] Installing backend WebSocket packages..."
cd ~/POS/apps/backend
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
echo "  ✓ Backend deps installed"

# 2. Dashboard socket.io-client
echo "[2/4] Installing dashboard socket.io-client..."
cd ~/POS/apps/dashboard-web
npm install socket.io-client --registry=https://registry.npmmirror.com
echo "  ✓ Dashboard deps installed"

# 3. Run migration
echo "[3/4] Running migration..."
cd ~/POS/apps/backend

# Make sure PostgreSQL is running
sudo service postgresql start 2>/dev/null

PGPASSWORD=pos_password psql -h localhost -p 5433 -U pos_user -d pos_db -c "
  ALTER TABLE \"transactions\" ADD COLUMN IF NOT EXISTS \"order_status\" VARCHAR(20) NOT NULL DEFAULT 'new';
  CREATE INDEX IF NOT EXISTS \"IDX_transactions_order_status\" ON \"transactions\"(\"order_status\");
"
echo "  ✓ Migration applied"

# 4. Rebuild backend
echo "[4/4] Rebuilding backend..."
cd ~/POS/apps/backend
npm run clean
npm run build 2>&1
echo "  ✓ Backend rebuilt"

echo ""
echo "=== Block F installed! ==="
echo ""
echo "To test the KDS:"
echo "  1. Start services:    cd ~/POS && bash scripts/start-dev.sh"
echo "  2. Get location ID:   PGPASSWORD=pos_password psql -h localhost -p 5433 -U pos_user -d pos_db -c \"SELECT id, name FROM locations\""
echo "  3. Open KDS:          http://127.0.0.1:5173/kitchen?location_id=YOUR_LOCATION_ID"
echo "  4. Create an order from the Terminal app (http://127.0.0.1:5174)"
echo "  5. Watch it appear on the KDS in real-time!"
echo ""

# --- Patch terminal module to import KDS ---
echo "Patching terminal module..."
cd ~/POS/apps/backend

# Add KdsModule import to terminal.module.ts
if ! grep -q "KdsModule" src/modules/terminal/terminal.module.ts; then
  sed -i "s/import { TypeOrmModule/import { TypeOrmModule/" src/modules/terminal/terminal.module.ts
  sed -i "/^import/a import { KdsModule } from '../kds/kds.module';" src/modules/terminal/terminal.module.ts
  sed -i "s/imports: \[/imports: [\n    KdsModule,/" src/modules/terminal/terminal.module.ts
  echo "  ✓ Terminal module patched"
fi

# Add KdsService injection to terminal.service.ts  
if ! grep -q "KdsService" src/modules/terminal/terminal.service.ts; then
  sed -i "/^import/a import { KdsService } from '../kds/kds.service';" src/modules/terminal/terminal.service.ts
  sed -i "s/constructor(/constructor(\n    private kdsService: KdsService,/" src/modules/terminal/terminal.service.ts
  # Add notification after transaction save
  sed -i "/return this.transactionRepo.findOne/i\\    \/\/ Notify KDS\n    try { this.kdsService.notifyNewOrder(saved); } catch(e) {}" src/modules/terminal/terminal.service.ts
  echo "  ✓ Terminal service patched"
fi

# Rebuild
cd ~/POS/apps/backend
npm run clean && npm run build 2>&1
echo "  ✓ Final rebuild complete"
