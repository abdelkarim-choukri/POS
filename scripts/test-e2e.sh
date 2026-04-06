#!/bin/bash
# POS System — Block E End-to-End Test Script
# Run: bash scripts/test-e2e.sh

set -e
export no_proxy=localhost,127.0.0.1
export NO_PROXY=localhost,127.0.0.1

BASE="http://127.0.0.1:3000/api"
PASS=0
FAIL=0

test_endpoint() {
  local METHOD=$1 URL=$2 DATA=$3 EXPECT=$4 DESC=$5
  if [ "$METHOD" = "POST" ]; then
    RESP=$(curl --noproxy localhost -s -w "\n%{http_code}" -X POST "$BASE$URL" -H "Content-Type: application/json" -d "$DATA" 2>/dev/null)
  else
    RESP=$(curl --noproxy localhost -s -w "\n%{http_code}" -X GET "$BASE$URL" -H "Content-Type: application/json" -H "Authorization: Bearer $DATA" 2>/dev/null)
  fi
  CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d')
  if [ "$CODE" = "$EXPECT" ]; then
    echo "  ✓ $DESC (HTTP $CODE)"
    PASS=$((PASS+1))
  else
    echo "  ✗ $DESC — expected $EXPECT, got $CODE"
    echo "    Response: $(echo $BODY | head -c 200)"
    FAIL=$((FAIL+1))
  fi
  echo "$BODY"
}

echo ""
echo "========================================="
echo "  POS System — E2E Test"
echo "========================================="
echo ""

# ------------------------------------------
echo "--- 1. Auth Endpoints ---"
# ------------------------------------------

# Super Admin login
echo ""
RESP=$(curl --noproxy localhost -s -X POST "$BASE/auth/super-admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pos.com","password":"admin123"}')
SA_TOKEN=$(echo $RESP | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
if [ -n "$SA_TOKEN" ]; then
  echo "  ✓ Super Admin login OK"
  PASS=$((PASS+1))
else
  echo "  ✗ Super Admin login FAILED"
  echo "    $RESP"
  FAIL=$((FAIL+1))
fi

# Business Owner login
RESP=$(curl --noproxy localhost -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@demo.com","password":"owner123"}')
BIZ_TOKEN=$(echo $RESP | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
if [ -n "$BIZ_TOKEN" ]; then
  echo "  ✓ Business Owner login OK"
  PASS=$((PASS+1))
else
  echo "  ✗ Business Owner login FAILED"
  echo "    $RESP"
  FAIL=$((FAIL+1))
fi

# PIN login
RESP=$(curl --noproxy localhost -s -X POST "$BASE/auth/pin-login" \
  -H "Content-Type: application/json" \
  -d '{"pin":"1234","terminal_code":"T-001"}')
PIN_TOKEN=$(echo $RESP | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
if [ -n "$PIN_TOKEN" ]; then
  echo "  ✓ PIN login (1234) OK"
  PASS=$((PASS+1))
else
  echo "  ✗ PIN login FAILED"
  echo "    $RESP"
  FAIL=$((FAIL+1))
fi

# Wrong password
RESP=$(curl --noproxy localhost -s -o /dev/null -w "%{http_code}" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@demo.com","password":"wrong"}')
if [ "$RESP" = "401" ]; then
  echo "  ✓ Wrong password returns 401"
  PASS=$((PASS+1))
else
  echo "  ✗ Wrong password returned $RESP (expected 401)"
  FAIL=$((FAIL+1))
fi

# Get profile — Super Admin
RESP=$(curl --noproxy localhost -s -o /dev/null -w "%{http_code}" -X GET "$BASE/auth/me" \
  -H "Authorization: Bearer $SA_TOKEN")
if [ "$RESP" = "200" ]; then
  echo "  ✓ Super Admin profile OK"
  PASS=$((PASS+1))
else
  echo "  ✗ Super Admin profile returned $RESP"
  FAIL=$((FAIL+1))
fi

# Get profile — Business Owner
RESP=$(curl --noproxy localhost -s -o /dev/null -w "%{http_code}" -X GET "$BASE/auth/me" \
  -H "Authorization: Bearer $BIZ_TOKEN")
if [ "$RESP" = "200" ]; then
  echo "  ✓ Business Owner profile OK"
  PASS=$((PASS+1))
else
  echo "  ✗ Business Owner profile returned $RESP"
  FAIL=$((FAIL+1))
fi

# ------------------------------------------
echo ""
echo "--- 2. Super Admin Endpoints ---"
# ------------------------------------------

RESP=$(curl --noproxy localhost -s -o /dev/null -w "%{http_code}" -X GET "$BASE/super/businesses" \
  -H "Authorization: Bearer $SA_TOKEN")
if [ "$RESP" = "200" ]; then
  echo "  ✓ List businesses OK"
  PASS=$((PASS+1))
else
  echo "  ✗ List businesses returned $RESP"
  FAIL=$((FAIL+1))
fi

RESP=$(curl --noproxy localhost -s -o /dev/null -w "%{http_code}" -X GET "$BASE/super/business-types" \
  -H "Authorization: Bearer $SA_TOKEN")
if [ "$RESP" = "200" ]; then
  echo "  ✓ List business types OK"
  PASS=$((PASS+1))
else
  echo "  ✗ List business types returned $RESP"
  FAIL=$((FAIL+1))
fi

RESP=$(curl --noproxy localhost -s -o /dev/null -w "%{http_code}" -X GET "$BASE/super/terminals" \
  -H "Authorization: Bearer $SA_TOKEN")
if [ "$RESP" = "200" ]; then
  echo "  ✓ List terminals OK"
  PASS=$((PASS+1))
else
  echo "  ✗ List terminals returned $RESP"
  FAIL=$((FAIL+1))
fi

RESP=$(curl --noproxy localhost -s -o /dev/null -w "%{http_code}" -X GET "$BASE/super/dashboard/stats" \
  -H "Authorization: Bearer $SA_TOKEN")
if [ "$RESP" = "200" ]; then
  echo "  ✓ Dashboard stats OK"
  PASS=$((PASS+1))
else
  echo "  ✗ Dashboard stats returned $RESP"
  FAIL=$((FAIL+1))
fi

# ------------------------------------------
echo ""
echo "--- 3. Business Admin Endpoints ---"
# ------------------------------------------

RESP=$(curl --noproxy localhost -s -o /dev/null -w "%{http_code}" -X GET "$BASE/business/categories" \
  -H "Authorization: Bearer $BIZ_TOKEN")
if [ "$RESP" = "200" ]; then
  echo "  ✓ List categories OK"
  PASS=$((PASS+1))
else
  echo "  ✗ List categories returned $RESP"
  FAIL=$((FAIL+1))
fi

RESP=$(curl --noproxy localhost -s -o /dev/null -w "%{http_code}" -X GET "$BASE/business/products" \
  -H "Authorization: Bearer $BIZ_TOKEN")
if [ "$RESP" = "200" ]; then
  echo "  ✓ List products OK"
  PASS=$((PASS+1))
else
  echo "  ✗ List products returned $RESP"
  FAIL=$((FAIL+1))
fi

RESP=$(curl --noproxy localhost -s -o /dev/null -w "%{http_code}" -X GET "$BASE/business/employees" \
  -H "Authorization: Bearer $BIZ_TOKEN")
if [ "$RESP" = "200" ]; then
  echo "  ✓ List employees OK"
  PASS=$((PASS+1))
else
  echo "  ✗ List employees returned $RESP"
  FAIL=$((FAIL+1))
fi

RESP=$(curl --noproxy localhost -s -o /dev/null -w "%{http_code}" -X GET "$BASE/business/locations" \
  -H "Authorization: Bearer $BIZ_TOKEN")
if [ "$RESP" = "200" ]; then
  echo "  ✓ List locations OK"
  PASS=$((PASS+1))
else
  echo "  ✗ List locations returned $RESP"
  FAIL=$((FAIL+1))
fi

# ------------------------------------------
echo ""
echo "--- 4. Terminal Endpoints ---"
# ------------------------------------------

RESP=$(curl --noproxy localhost -s -o /dev/null -w "%{http_code}" -X GET "$BASE/terminal/catalog" \
  -H "Authorization: Bearer $PIN_TOKEN")
if [ "$RESP" = "200" ]; then
  echo "  ✓ Get catalog OK"
  PASS=$((PASS+1))
else
  echo "  ✗ Get catalog returned $RESP"
  FAIL=$((FAIL+1))
fi

# ------------------------------------------
echo ""
echo "========================================="
echo "  Results: $PASS passed, $FAIL failed"
echo "========================================="
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
