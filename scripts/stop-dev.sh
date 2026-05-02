#!/bin/bash
# Stop all POS services
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

echo "Stopping POS services..."

# Stop frontends
pkill -f vite 2>/dev/null && echo "  ✓ Frontends stopped"

# Stop Docker stack (preserves data — use 'down -v' to wipe)
docker compose down
echo "  ✓ Docker stack stopped"

echo "Done."