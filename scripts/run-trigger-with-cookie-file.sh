#!/usr/bin/env bash
# Usage: ./scripts/run-trigger-with-cookie-file.sh <path-to-file-containing-base64-cookie-value>
# The file should contain only the cookie value (starts with base64-...). No other lines.
set -e

if [[ -z "$1" || ! -f "$1" ]]; then
  echo "Usage: $0 <path-to-file-with-cookie-value>"
  echo "Example: $0 ~/Desktop/sb_cookie.txt"
  echo "Create the file in TextEdit, paste the base64-... value (one line), save, then run this."
  exit 1
fi

COOKIE_FILE="$1"
export API_BASE_URL="${API_BASE_URL:-https://www.soundbridge.live}"
export PAYOUT_REQUEST_ID="${PAYOUT_REQUEST_ID:-386a9fbf-86f9-4b7a-b069-64bda672c0c1}"

export ADMIN_JWT="$(cat "$COOKIE_FILE" | ./scripts/extract-jwt-from-safari-cookie.sh 2>/dev/null)"

if [[ -z "$ADMIN_JWT" ]]; then
  echo "Failed to extract access_token from file. Ensure the file contains only the base64-... cookie value (one line)."
  exit 1
fi

echo "ADMIN_JWT length: ${#ADMIN_JWT}"
exec ./scripts/trigger-pending-payout.sh
