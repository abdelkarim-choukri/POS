#!/bin/bash
# POS System — Start all services
# Run: bash scripts/start-dev.sh

export no_proxy=localhost,127.0.0.1
export NO_PROXY=localhost,127.0.0.1
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY

echo "Starting POS development environment..."
echo ""

# Kill any existing processes
pkill -f "node dist/main.js" 2>/dev/null
pkill -f vite 2>/dev/null
sleep 1

# Start PostgreSQL
echo "[1/4] Starting PostgreSQL..."
sudo service postgresql start 2>/dev/null
echo "  ✓ PostgreSQL running"

# Build and start backend
echo "[2/4] Building backend..."
cd ~/POS/apps/backend
rm -f tsconfig.tsbuildinfo
rm -rf dist
npx tsc 2>&1
if [ ! -f dist/main.js ]; then
  echo "  ✗ Backend build failed!"
  exit 1
fi
node dist/main.js &
sleep 2
echo "  ✓ Backend running on http://127.0.0.1:3000"

# Start dashboard
echo "[3/4] Starting dashboard..."
cd ~/POS/apps/dashboard-web
npm run dev &>/dev/null &
sleep 2
echo "  ✓ Dashboard on http://127.0.0.1:5173"

# Start terminal
echo "[4/4] Starting terminal app..."
cd ~/POS/apps/terminal-app
npm run dev &>/dev/null &
sleep 2
echo "  ✓ Terminal on http://127.0.0.1:5174"

echo ""
echo "========================================="
echo "  All services running!"
echo ""
echo "  Business Dashboard:  http://127.0.0.1:5173/login"
echo "    → owner@demo.com / owner123"
echo ""
echo "  Super Admin:         http://127.0.0.1:5173/super/login"
echo "    → admin@pos.com / admin123"
echo ""
echo "  Terminal App:        http://127.0.0.1:5174"
echo "    → Terminal: T-001, PIN: 1234 or 5678"
echo ""
echo "  Run tests:           bash scripts/test-e2e.sh"
echo "  Stop all:            bash scripts/stop-dev.sh"
echo "========================================="
echo ""
echo "Press Ctrl+C to stop all services"
wait
