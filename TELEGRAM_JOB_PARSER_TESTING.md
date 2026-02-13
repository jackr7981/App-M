# Telegram Job Parser - Testing Guide

## 🎯 What Was Fixed

This update resolves all 5 critical issues with the previous Gemini 3 Pro implementation:

### ✅ **Issue #1: Outdated AI Model** - FIXED
- **Before**: Used deprecated `gemini-pro` model
- **After**: Upgraded to `gemini-2.0-flash-exp` (latest experimental model)
- **Benefit**: Better accuracy, structured JSON output, faster responses

### ✅ **Issue #2: Missing Required Fields** - FIXED
- **Before**: Only extracted 7 fields (rank, vessel_type, salary, joining_date, company, contact, remarks)
- **After**: Now extracts all 8 SHIPPED format fields:
  1. ✅ RANK
  2. ✅ SALARY
  3. ✅ JOINING_DATE
  4. ✅ AGENCY
  5. ✅ MLA_NUMBER (NEW)
  6. ✅ ADDRESS (NEW)
  7. ✅ MOBILE (NEW - separated from generic "contact")
  8. ✅ EMAIL (NEW - separated from generic "contact")

### ✅ **Issue #3: No Structured Response Schema** - FIXED
- **Before**: Used plain text prompt hoping for JSON
- **After**: Uses `responseMimeType: "application/json"` for guaranteed JSON output
- **Benefit**: No more markdown-wrapped JSON or parsing errors

### ✅ **Issue #4: Weak Prompt Engineering** - FIXED
- **Before**: Generic "extract details from job posting" prompt
- **After**: Maritime-specific prompt with:
  - Clear field definitions and examples
  - Instructions to preserve original formatting
  - Guidance on handling missing fields (return "N/A")
  - Temperature set to 0.1 for consistency

### ✅ **Issue #5: UI Missing Fields** - FIXED
- **Before**: Only showed generic "contactInfo" with basic phone button
- **After**: Full SHIPPED format display:
  - ✅ MLA Number badge (amber color)
  - ✅ Agency Address with map pin icon (purple)
  - ✅ Mobile number with "Call" button (blue)
  - ✅ Email with "Email" button (green)
  - ✅ Backwards compatible with old job postings

### ✅ **Bonus: Duplicate Detection** - ADDED
- Telegram webhook now checks for duplicate `source_id` (message ID)
- Prevents same message from being processed twice
- Returns 200 OK with "already processed" message

---

## 🧪 Testing Instructions

### Option 1: Test via Telegram Bot (Production)

1. **Verify Webhook is Active**
   ```bash
   curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
   ```
   Should show your webhook URL as active

2. **Send Test Job Posting to Telegram Group**

   Sample maritime job posting text:
   ```
   RANK: Chief Engineer
   SALARY: $8000-$9000 USD/month
   JOINING: 15 March 2026
   AGENCY: ABC Maritime Services
   MLA: MLA/2024/12345
   ADDRESS: 123 Port Road, Marina Bay, Singapore 018956
   MOBILE: +65-1234-5678
   EMAIL: jobs@abcmaritime.com

   Chief Engineer required for Supramax Bulk Carrier.
   2012 built. Trading worldwide. Must have valid US Visa.
   4+/-1 months contract.
   ```

3. **Check Supabase Database**
   ```sql
   SELECT id, source, status, parsed_content, created_at
   FROM job_postings
   ORDER BY created_at DESC
   LIMIT 5;
   ```

4. **Verify in Admin Dashboard**
   - Login as admin
   - Go to "Job Board" tab
   - Should see the new posting with status "pending"
   - Click "Approve" to make it visible on public job board

5. **Check Public Job Board**
   - View as regular user
   - Should see approved job with:
     - MLA number badge
     - Agency address with map pin
     - Blue "Call" button for mobile
     - Green "Email" button for email

### Option 2: Test via Edge Function Directly

1. **Test the Job Parser Edge Function**
   ```bash
   curl -X POST \
     https://<YOUR_SUPABASE_URL>/functions/v1/job-parser \
     -H "Authorization: Bearer <YOUR_ANON_KEY>" \
     -H "Content-Type: application/json" \
     -d '{
       "raw_content": "RANK: Master\nSALARY: $9500\nJOINING: Urgent\nAGENCY: SeaWays Ltd\nMLA: 12345/2026\nADDRESS: 45 Marine Drive, Mumbai\nMOBILE: +91-9876543210\nEMAIL: recruit@seaways.com"
     }'
   ```

   Expected response:
   ```json
   {
     "success": true,
     "data": {
       "rank": "Master",
       "salary": "$9500",
       "joining_date": "Urgent",
       "agency": "SeaWays Ltd",
       "mla_number": "12345/2026",
       "address": "45 Marine Drive, Mumbai",
       "mobile": "+91-9876543210",
       "email": "recruit@seaways.com"
     }
   }
   ```

### Option 3: Test via Smart Import (Admin Dashboard)

1. Login as admin
2. Navigate to "Job Board" tab
3. Click "Import Job" button
4. Paste test job posting text (same as above)
5. Click "Parse & Add to Board"
6. Should immediately see job with all 8 fields populated
7. Status will be "approved" (manual imports auto-approve)

### Option 4: Test via Smart Import (Public Job Board)

1. Login as regular user
2. Go to "Jobs" section
3. Click "Smart Import Job" button
4. Paste job posting text
5. Click "Parse & Add to Board"
6. Should see job appear locally (not saved to DB for public users)

---

## 📊 Expected Test Results

### Parsing Accuracy Expectations

| Field | Expected Accuracy | Notes |
|-------|-------------------|-------|
| RANK | 95%+ | Well-structured field, easy to extract |
| SALARY | 90%+ | Handles ranges, currencies, variations |
| JOINING_DATE | 90%+ | Handles "Urgent", "ASAP", actual dates |
| AGENCY | 85%+ | Sometimes embedded in footer/header |
| MLA_NUMBER | 70%+ | Not always present in postings |
| ADDRESS | 75%+ | Varies widely in format |
| MOBILE | 85%+ | Regex patterns help |
| EMAIL | 90%+ | Well-defined format |

### Edge Cases to Test

1. **Missing Fields**
   - Job posting without MLA number → Should return "N/A"
   - Job with only phone, no email → Email should be "N/A"

2. **Multiple Contact Methods**
   - Job with 2 phone numbers → Should extract primary one
   - Multiple emails → Should extract primary/first one

3. **Unstructured Format**
   ```
   Urgent Master needed for Bulk Carrier!
   Wages: USD 9000
   Join ASAP
   Contact: ABC Shipping +880170000000
   ```
   Should still extract rank, salary, joining date, agency, mobile

4. **Non-Job Messages**
   - Random chat messages → May not parse well, but won't crash
   - Admin can reject these in dashboard

---

## 🐛 Troubleshooting

### Issue: Webhook Not Receiving Messages

**Check:**
```bash
# Verify webhook is set
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo

# If not set, set it:
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -d "url=https://<YOUR_SUPABASE_URL>/functions/v1/telegram-webhook"
```

### Issue: Parsing Returns Empty Fields

**Possible causes:**
1. GEMINI_API_KEY not set in Supabase Edge Function secrets
2. API quota exceeded
3. Job text too short/ambiguous

**Check logs:**
```bash
supabase functions logs telegram-webhook --tail
```

### Issue: Duplicate Messages Being Processed

**Fixed!** Webhook now checks `source_id` before inserting.

If still happening:
```sql
-- Check for duplicates
SELECT source_id, COUNT(*)
FROM job_postings
WHERE source = 'telegram'
GROUP BY source_id
HAVING COUNT(*) > 1;
```

### Issue: UI Not Showing New Fields

**Check:**
1. Browser cache - Hard refresh (Ctrl+Shift+R)
2. Verify job was parsed after this update
3. Check parsed_content in database:
   ```sql
   SELECT parsed_content FROM job_postings WHERE id = '<job_id>';
   ```

---

## 📝 Database Schema Reference

### job_postings table

```sql
CREATE TABLE job_postings (
  id uuid PRIMARY KEY,
  source text NOT NULL, -- 'telegram', 'whatsapp', 'facebook', 'manual'
  source_id text, -- Telegram message ID for deduplication
  raw_content text NOT NULL, -- Original message text
  parsed_content jsonb DEFAULT '{}', -- Structured data (see below)
  status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'expired'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### parsed_content structure

```json
{
  "rank": "Chief Engineer",
  "salary": "$8000-$9000",
  "joining_date": "15 March 2026",
  "agency": "ABC Maritime Services",
  "mla_number": "MLA/2024/12345",
  "address": "123 Port Road, Singapore",
  "mobile": "+65-1234-5678",
  "email": "jobs@abcmaritime.com"
}
```

---

## 🚀 Next Steps

### Phase 1: Monitor Initial Performance (Week 1)
- [ ] Track parsing accuracy in production
- [ ] Review admin dashboard for flagged jobs
- [ ] Collect user feedback

### Phase 2: Improvements (Week 2-3)
- [ ] Fine-tune prompt based on real-world postings
- [ ] Add field validation rules (e.g., email format)
- [ ] Implement auto-rejection for spam/non-job messages

### Phase 3: Advanced Features (Month 2)
- [ ] Auto-categorization by ship type
- [ ] Duplicate job detection (not just duplicate messages)
- [ ] Expiry date tracking (auto-expire old jobs)
- [ ] Notification system for matching jobs

---

## 📞 Support

If parsing fails consistently:
1. Share sample job posting text
2. Check Supabase Edge Function logs
3. Verify Gemini API key is active
4. Review prompt engineering in `gemini-parser.ts`

---

**Updated**: 2026-02-13
**Version**: 2.0 (Post-Gemini 3 Pro Fix)
**Status**: ✅ Ready for Production Testing
