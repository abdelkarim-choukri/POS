#!/usr/bin/env bash
# Phase 10 end-to-end flow test
# Requires: curl, jq, running backend at localhost:3000
# Seed credentials: testowner@pos.local / owner123, PIN 1234, terminal T-001
set -euo pipefail

BASE="http://localhost:3000/api"
ok()   { echo -e "\033[32m✓ $*\033[0m"; }
fail() { echo -e "\033[31m✗ $*\033[0m"; exit 1; }
step() { echo -e "\n\033[1;34m=== $* ===\033[0m"; }

# ── Known seed IDs ────────────────────────────────────────────────────────────
LOCATION_ID="cccccccc-0000-0000-0000-000000000001"
PRODUCT1_ID="6676be97-13d9-4d5e-b952-c56b245d10ef"  # Test Product  25.00 MAD
PRODUCT2_ID="ac2ceb42-f9a4-48f4-879a-7ecfb1664915"  # Thé Vert      15.00 MAD
PRODUCT1_NAME="Test Product"
PRODUCT2_NAME="Thé Vert"

# ── 1. Dashboard login (owner) — for /api/business/... endpoints ──────────────
step "1. Dashboard login"
DASH=$(curl -sf -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"testowner@pos.local","password":"owner123"}')
DASH_TOKEN=$(echo "$DASH" | jq -r '.access_token')
[[ "$DASH_TOKEN" != "null" && -n "$DASH_TOKEN" ]] || fail "Dashboard login failed"
ok "Got dashboard token (owner)"

# ── 2. Terminal PIN login — for /api/terminal/... endpoints ───────────────────
step "2. Terminal PIN login"
TERM=$(curl -sf -X POST "$BASE/auth/pin-login" \
  -H "Content-Type: application/json" \
  -d '{"pin":"1234","terminal_code":"T-001"}')
TERM_TOKEN=$(echo "$TERM" | jq -r '.access_token')
TERMINAL_ID=$(echo "$TERM" | jq -r '.terminal.id')
[[ "$TERM_TOKEN" != "null" && -n "$TERM_TOKEN" ]] || fail "PIN login failed"
ok "Got terminal token  (terminal: $TERMINAL_ID)"

# ── 3. Create dining area ─────────────────────────────────────────────────────
step "3. Create dining area"
AREA_NAME="Terrace-$(date +%s)"
AREA=$(curl -sf -X POST "$BASE/business/dining-areas" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DASH_TOKEN" \
  -d "{\"location_id\":\"$LOCATION_ID\",\"name\":\"$AREA_NAME\",\"sort_order\":1}")
AREA_ID=$(echo "$AREA" | jq -r '.id')
[[ "$AREA_ID" != "null" && -n "$AREA_ID" ]] || fail "Create dining area failed: $AREA"
ok "Dining area created  (id: $AREA_ID, name: $AREA_NAME)"

# ── 4. Create table ───────────────────────────────────────────────────────────
step "4. Create table"
TABLE_NUMBER="T-$(date +%s)"
TABLE=$(curl -sf -X POST "$BASE/business/tables" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DASH_TOKEN" \
  -d "{
    \"location_id\":\"$LOCATION_ID\",
    \"area_id\":\"$AREA_ID\",
    \"table_number\":\"$TABLE_NUMBER\",
    \"capacity\":4
  }")
TABLE_ID=$(echo "$TABLE" | jq -r '.id')
[[ "$TABLE_ID" != "null" && -n "$TABLE_ID" ]] || fail "Create table failed: $TABLE"
ok "Table created  (id: $TABLE_ID, number: $TABLE_NUMBER)"

# ── 5. Open table session ─────────────────────────────────────────────────────
step "5. Open table"
SESSION=$(curl -sf -X POST "$BASE/terminal/tables/$TABLE_ID/open" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TERM_TOKEN" \
  -d '{"guest_count":2}')
SESSION_ID=$(echo "$SESSION" | jq -r '.id')
SESSION_STATUS=$(echo "$SESSION" | jq -r '.status')
[[ "$SESSION_ID" != "null" && -n "$SESSION_ID" ]] || fail "Open table failed: $SESSION"
[[ "$SESSION_STATUS" == "open" ]] || fail "Session status should be 'open', got '$SESSION_STATUS'"
ok "Session opened  (id: $SESSION_ID, status: $SESSION_STATUS)"

# ── 6. Add 2 items to session ─────────────────────────────────────────────────
step "6. Add 2 items"
ITEMS=$(curl -sf -X POST "$BASE/terminal/table-sessions/$SESSION_ID/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TERM_TOKEN" \
  -d "{\"items\":[
    {\"product_id\":\"$PRODUCT1_ID\",\"quantity\":2,\"notes\":\"no salt\"},
    {\"product_id\":\"$PRODUCT2_ID\",\"quantity\":1}
  ]}")
ITEM1_ID=$(echo "$ITEMS" | jq -r '.added_items[0].id')
ITEM2_ID=$(echo "$ITEMS" | jq -r '.added_items[1].id')
ITEM1_PRICE=$(echo "$ITEMS" | jq -r '.added_items[0].unit_price_ttc')
SESSION_TOTAL=$(echo "$ITEMS" | jq -r '.session_total_ttc')
[[ "$ITEM1_ID" != "null" ]] || fail "Add items failed: $ITEMS"
ok "Items added  (item1: $ITEM1_ID @ ${ITEM1_PRICE} MAD, item2: $ITEM2_ID)"
ok "Session total: ${SESSION_TOTAL} MAD"

# ── 7. KDS: mark item 1 as preparing ─────────────────────────────────────────
step "7. KDS status update (new → preparing)"
KDS=$(curl -sf -X POST "$BASE/terminal/kds/items/$ITEM1_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TERM_TOKEN" \
  -d '{"status":"preparing"}')
KDS_STATUS=$(echo "$KDS" | jq -r '.kds_status')
[[ "$KDS_STATUS" == "preparing" ]] || fail "KDS update failed — expected 'preparing', got '$KDS_STATUS': $KDS"
ok "Item 1 kds_status → preparing"

# ── 8. Close table → checkout payload ────────────────────────────────────────
step "8. Close table (single bill)"
CLOSE=$(curl -sf -X POST "$BASE/terminal/table-sessions/$SESSION_ID/close" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TERM_TOKEN")
PAYLOAD_SESSION_ID=$(echo "$CLOSE" | jq -r '.checkout_payload.table_session_id')
PAYLOAD_ITEM_COUNT=$(echo "$CLOSE" | jq '.checkout_payload.items | length')
[[ "$PAYLOAD_SESSION_ID" == "$SESSION_ID" ]] || fail "checkout_payload.table_session_id mismatch"
[[ "$PAYLOAD_ITEM_COUNT" -eq 2 ]] || fail "checkout_payload should have 2 items (preparing items still included), got $PAYLOAD_ITEM_COUNT"

# Compute subtotal from payload (qty × unit_price_ttc for each item)
SUBTOTAL=$(echo "$CLOSE" | jq '[.checkout_payload.items[] | (.quantity * .unit_price_ttc)] | add | (. * 100 | round) / 100')
ok "checkout_payload ready  (session_id: $PAYLOAD_SESSION_ID, items: $PAYLOAD_ITEM_COUNT, subtotal: ${SUBTOTAL} MAD)"

# Verify session transitioned to awaiting_payment (visible in floor plan)
FLOOR=$(curl -sf "$BASE/terminal/tables/floor-plan" \
  -H "Authorization: Bearer $TERM_TOKEN")
TABLE_STATUS_AFTER_CLOSE=$(echo "$FLOOR" | jq -r ".tables[] | select(.id == \"$TABLE_ID\") | .session_status")
[[ "$TABLE_STATUS_AFTER_CLOSE" == "awaiting_payment" ]] \
  || fail "Table should be 'awaiting_payment' after close, got '$TABLE_STATUS_AFTER_CLOSE'"
ok "Floor plan shows table as awaiting_payment"

# ── 9. Create transaction — links session ─────────────────────────────────────
step "9. Create transaction (table_session_id attached)"
TXN=$(curl -sf -X POST "$BASE/terminal/transactions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TERM_TOKEN" \
  -d "{
    \"items\": [
      {
        \"product_id\": \"$PRODUCT1_ID\",
        \"product_name\": \"$PRODUCT1_NAME\",
        \"quantity\": 2,
        \"unit_price\": 25,
        \"line_total\": 50
      },
      {
        \"product_id\": \"$PRODUCT2_ID\",
        \"product_name\": \"$PRODUCT2_NAME\",
        \"quantity\": 1,
        \"unit_price\": 15,
        \"line_total\": 15
      }
    ],
    \"subtotal\": $SUBTOTAL,
    \"total\": $SUBTOTAL,
    \"payment_method\": \"cash\",
    \"table_session_id\": \"$SESSION_ID\"
  }")

TXN_ID=$(echo "$TXN" | jq -r '.id')
INVOICE_NUMBER=$(echo "$TXN" | jq -r '.invoice_number')
TOTAL_TTC=$(echo "$TXN" | jq -r '.total_ttc')
POINTS_EARNED=$(echo "$TXN" | jq -r '.points_earned')
TXN_SESSION_ID=$(echo "$TXN" | jq -r '.table_session_id')

[[ "$TXN_ID" != "null" && -n "$TXN_ID" ]] || fail "createTransaction failed: $TXN"
[[ "$INVOICE_NUMBER" != "null" ]] || fail "invoice_number missing from transaction"
[[ "$TXN_SESSION_ID" == "$SESSION_ID" ]] || fail "table_session_id not stored on transaction"

echo "  Transaction:    $TXN_ID"
echo "  Invoice:        $INVOICE_NUMBER"
echo "  Total TTC:      $TOTAL_TTC MAD"
echo "  Points earned:  $POINTS_EARNED  (0 — no loyalty customer attached)"
echo "  Session ID:     $TXN_SESSION_ID"
ok "Transaction created with invoice_number and table_session_id"

# ── 10. Verify session auto-transitioned to paid ──────────────────────────────
step "10. Verify session auto-transitioned to 'paid'"
FLOOR2=$(curl -sf "$BASE/terminal/tables/floor-plan" \
  -H "Authorization: Bearer $TERM_TOKEN")
TABLE_STATUS_FINAL=$(echo "$FLOOR2" | jq -r ".tables[] | select(.id == \"$TABLE_ID\") | .session_status")
[[ "$TABLE_STATUS_FINAL" == "available" ]] \
  || fail "Table should be 'available' (session paid), got '$TABLE_STATUS_FINAL'"
ok "Table is now 'available' — session auto-transitioned to paid"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "\033[1;32m════════════════════════════════════════════\033[0m"
echo -e "\033[1;32m  Phase 10 flow test PASSED\033[0m"
echo -e "\033[1;32m════════════════════════════════════════════\033[0m"
echo "  Dining area:  $AREA_ID"
echo "  Table:        $TABLE_ID  ($TABLE_NUMBER)"
echo "  Session:      $SESSION_ID  (paid)"
echo "  Transaction:  $TXN_ID"
echo "  Invoice:      $INVOICE_NUMBER"
echo "  Total TTC:    $TOTAL_TTC MAD"
