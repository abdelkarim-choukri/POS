#!/bin/bash
# Block F Setup — Kitchen Display System
# Run: bash scripts/setup-block-f.sh

set -e
export no_proxy=localhost,127.0.0.1
export NO_PROXY=localhost,127.0.0.1

echo ""
echo "========================================="
echo "  Block F: Kitchen Display System Setup"
echo "========================================="
echo ""

# 1. Install backend WebSocket dependencies
echo "[1/4] Installing backend WebSocket deps..."
cd ~/POS/apps/backend
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io --registry=https://registry.npmmirror.com
echo "  ✓ Backend deps installed"

# 2. Install frontend socket.io-client
echo "[2/4] Installing dashboard socket.io-client..."
cd ~/POS/apps/dashboard-web
npm install socket.io-client --registry=https://registry.npmmirror.com
echo "  ✓ Dashboard deps installed"

# 3. Run migration
echo "[3/4] Running database migration..."
cd ~/POS/apps/backend

# Make sure PostgreSQL is running
sudo service postgresql start 2>/dev/null

# Build first
npm run clean
npm run build

# Run migration
npx typeorm-ts-node-commonjs migration:run -d src/config/data-source.ts 2>&1
echo "  ✓ Migration complete"

# 4. Verify
echo "[4/4] Verifying..."
PGPASSWORD=pos_password psql -h localhost -p 5433 -U pos_user -d pos_db -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='transactions' AND column_name='order_status';"

echo ""
echo "========================================="
echo "  Block F Setup Complete!"
echo ""
echo "  Start dev:      bash scripts/start-dev.sh"
echo ""
echo "  Kitchen Display: http://127.0.0.1:5173/kitchen?location=LOCATION_ID"
echo ""
echo "  To get your location ID:"
echo "    PGPASSWORD=pos_password psql -h localhost -p 5433 -U pos_user -d pos_db -c \"SELECT id, name FROM locations;\""
echo "========================================="
