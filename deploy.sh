#!/bin/bash
# Trigger Sevalla deploy for wio-advertorial-pages after git push
# Usage: ./deploy.sh [branch]
# Requires SEVALLA_API_KEY env var

BRANCH="${1:-main}"
SITE_ID="eea01bda-5c9c-48f5-a05b-38372cda1d90"
API_KEY="${SEVALLA_API_KEY}"

if [ -z "$API_KEY" ]; then
  echo "Error: SEVALLA_API_KEY not set"
  echo "Run: export SEVALLA_API_KEY=svl_..."
  exit 1
fi

echo "Deploying wio-advertorial-pages (branch: $BRANCH)..."

RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.sevalla.com/v2/static-sites/deployments" \
  -d "{\"static_site_id\":\"$SITE_ID\",\"branch\":\"$BRANCH\"}")

STATUS=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('deployment',{}).get('status','error'))" 2>/dev/null)
DEPLOY_ID=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('deployment',{}).get('id',''))" 2>/dev/null)

if [ "$STATUS" = "waiting" ] || [ "$STATUS" = "building" ]; then
  echo "Deploy triggered: $DEPLOY_ID (status: $STATUS)"
else
  echo "Deploy failed: $RESPONSE"
  exit 1
fi
