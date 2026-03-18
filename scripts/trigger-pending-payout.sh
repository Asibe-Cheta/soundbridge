#!/usr/bin/env bash
# Trigger a pending payout. With PAYOUT_REQUEST_ID: use it. Without: GET pending_requests and pick the 40.44 one (or first).
# Requires: ADMIN_JWT, API_BASE_URL. Optional: PAYOUT_REQUEST_ID.
set -e
if [[ -z "$ADMIN_JWT" || -z "$API_BASE_URL" ]]; then
  echo "Usage: ADMIN_JWT=... API_BASE_URL=... [PAYOUT_REQUEST_ID=...] $0"
  echo "Example: ADMIN_JWT=eyJ... API_BASE_URL=https://app.example.com $0"
  exit 1
fi
BASE="${API_BASE_URL%/}"

if [[ -z "$PAYOUT_REQUEST_ID" ]]; then
  echo "Listing pending payout requests..."
  RESP=$(curl -s "${BASE}/api/admin/payouts?pending_requests=1" -H "Authorization: Bearer $ADMIN_JWT")
  if ! command -v jq &>/dev/null; then
    echo "No jq — set PAYOUT_REQUEST_ID manually. Response: $RESP"
    exit 1
  fi
  # API returns { success, payout_requests: [...] } for ?pending_requests=1
  PAYOUT_REQUEST_ID=$(echo "$RESP" | jq -r '(.payout_requests // [])[] | select((.amount | tonumber) == 40.44) | .id' 2>/dev/null | head -1)
  if [[ -z "$PAYOUT_REQUEST_ID" || "$PAYOUT_REQUEST_ID" == "null" ]]; then
    PAYOUT_REQUEST_ID=$(echo "$RESP" | jq -r '(.payout_requests // [])[0].id // empty' 2>/dev/null)
  fi
  if [[ -z "$PAYOUT_REQUEST_ID" ]]; then
    echo "No pending payout request found."
    echo "$RESP" | jq . 2>/dev/null || echo "$RESP"
    exit 1
  fi
  echo "Using payout_request_id=$PAYOUT_REQUEST_ID"
fi

echo "POST ${BASE}/api/admin/payouts"
curl -s -X POST "${BASE}/api/admin/payouts" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"payout_request_id\": \"$PAYOUT_REQUEST_ID\"}" | (jq . 2>/dev/null || cat)
echo ""
