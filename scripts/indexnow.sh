#!/usr/bin/env bash
set -euo pipefail

# --- Config ---
SITE_HOST="rausr.com"
SITEMAP_PATH="public/sitemap.xml"
INDEXNOW_ENDPOINT="https://api.indexnow.org/indexnow"

# Require key via Netlify env (Site settings → Build & deploy → Environment)
: "${INDEXNOW_KEY:?Environment variable INDEXNOW_KEY is required (add it in Netlify)}"

KEY_LOCATION="https://${SITE_HOST}/${INDEXNOW_KEY}.txt"

if [[ ! -f "$SITEMAP_PATH" ]]; then
  echo "❌ Sitemap not found at $SITEMAP_PATH. Run Hugo before this script."
  exit 0
fi

echo "✓ Preparing IndexNow submission using key $INDEXNOW_KEY"

# Grab up to 100 URLs from the sitemap
mapfile -t URLS < <(awk -v RS="</url>" '/<loc>/{match($0,/<loc>([^<]+)<\/loc>/,a); if(a[1]!="") print a[1]}' "$SITEMAP_PATH" | head -n 100)

if [[ ${#URLS[@]} -eq 0 ]]; then
  echo "ℹ️ No URLs found in sitemap. Skipping IndexNow."
  exit 0
fi

# Build JSON payload
URL_LIST_JSON=$(printf '"%s",' "${URLS[@]}")
URL_LIST_JSON="[${URL_LIST_JSON%,}]"

PAYLOAD=$(cat <<JSON
{
  "host": "${SITE_HOST}",
  "key": "${INDEXNOW_KEY}",
  "keyLocation": "${KEY_LOCATION}",
  "urlList": ${URL_LIST_JSON}
}
JSON
)

echo "→ Submitting ${#URLS[@]} URLs to IndexNow..."
HTTP_CODE=$(curl -sS -o /tmp/indexnow_resp.txt -w "%{http_code}" \
  -H "Content-Type: application/json; charset=utf-8" \
  -X POST "$INDEXNOW_ENDPOINT" \
  --data "$PAYLOAD" || true)

if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "202" ]]; then
  echo "✓ IndexNow submission accepted ($HTTP_CODE)."
else
  echo "⚠️ IndexNow responded with HTTP $HTTP_CODE"
  cat /tmp/indexnow_resp.txt || true
  # Do not fail the build on IndexNow errors
  exit 0
fi