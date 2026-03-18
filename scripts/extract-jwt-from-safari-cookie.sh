#!/usr/bin/env bash
# Paste the VALUE of cookie sb-...-auth-token.0 (the whole base64-eyJ... string, nothing else).
# Usage: paste the value, then run: ./scripts/extract-jwt-from-safari-cookie.sh
# Or: echo 'base64-eyJ...' | ./scripts/extract-jwt-from-safari-cookie.sh
set -e
INPUT=$(cat)
# Strip leading "base64-" and any trailing whitespace/tab (Safari sometimes copies tab and domain)
VAL=$(echo "$INPUT" | sed 's/^base64-//' | tr -d '\n\r' | sed 's/[	 ].*//')
if [[ -z "$VAL" ]]; then
  echo "No base64 value found. Paste the cookie value (starts with base64-eyJ...)." >&2
  exit 1
fi
DECODED=$(echo "$VAL" | base64 -d 2>/dev/null) || { echo "Base64 decode failed. Paste only the cookie value (base64-...)." >&2; exit 1; }
if command -v jq &>/dev/null; then
  JWT=$(echo "$DECODED" | jq -r '.access_token // empty')
else
  JWT=$(echo "$DECODED" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
fi
if [[ -z "$JWT" || "$JWT" == "null" ]]; then
  echo "Could not find access_token in cookie. Is the value complete?" >&2
  exit 1
fi
echo "$JWT"
