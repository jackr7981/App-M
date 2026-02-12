#!/bin/bash
# Project Ref from App.tsx
PROJECT_REF="zlgfadgwlwreezwegpkx"
FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/telegram-webhook"

echo "---------------------------------------------------"
echo "Testing Telegram Webhook: $FUNCTION_URL"
echo "---------------------------------------------------"

# Send a fake Telegram update
# Note: We are NOT sending Authorization header because Telegram doesn't send it.
# If this returns 401 Unauthorized, checks 'debug_telegram.md'.

curl -i -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": 999999,
    "message": {
      "message_id": 12345,
      "from": {
        "id": 123456789,
        "is_bot": false,
        "first_name": "TestUser"
      },
      "chat": {
        "id": 123456789,
        "type": "private"
      },
      "date": 1678886000,
      "text": "NEW JOB TEST 777: Chief Engineer needed. Salary $15,000. Apply now."
    }
  }'

echo ""
echo "---------------------------------------------------"
echo "If you see '401 Unauthorized', you need to disable JWT Verification."
