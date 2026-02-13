# Maritime Job Board - Telegram Integration Deployment Guide

## 🎯 Implementation Summary

This deployment guide covers the complete Telegram Bot integration for automated maritime job posting collection and parsing. The system uses **Gemini 2.0 Flash** for AI-powered parsing with enhanced database schema, retry logic, and webhook security.

---

## 📋 Prerequisites

Before deployment, ensure you have:

1. ✅ **Supabase Project** - Active project with database access
2. ✅ **Telegram Bot** - Created via @BotFather
3. ✅ **Gemini API Key** - From Google AI Studio (https://aistudio.google.com/app/apikey)
4. ✅ **Supabase CLI** - Installed locally (`npm install -g supabase`)

---

## 🤖 Step 1: Create Telegram Bot

### 1.1 Create Bot with BotFather

```
1. Open Telegram and search for @BotFather
2. Send: /newbot
3. Provide bot name: "Maritime Jobs Aggregator"
4. Provide username: "maritime_jobs_bot" (must end with "bot")
5. Save the bot token provided by BotFather
```

### 1.2 Configure Bot Settings

```
# Disable privacy mode so bot can read all group messages
/setprivacy @maritime_jobs_bot
Select: DISABLED

# Set description
/setdescription @maritime_jobs_bot
"Automated maritime job postings aggregator for seafarers"

# Set about text
/setabouttext @maritime_jobs_bot
"This bot collects maritime job opportunities from verified sources"
```

### 1.3 Add Bot to Job Groups

1. Add the bot to each maritime job Telegram group
2. Ensure bot has permission to read messages
3. Bot does NOT need admin rights

---

## 🗄️ Step 2: Database Migration

### 2.1 Run Enhanced Schema Migration

Execute the migration SQL in Supabase SQL Editor:

```bash
# The migration file is located at:
supabase/migrations/002_enhanced_job_postings.sql
```

This migration adds:
- ✅ Individual columns for each SHIPPED field (rank, salary, joining_date, etc.)
- ✅ Tracking fields (parsing_attempts, last_parsing_error, source_group_name)
- ✅ Status management (pending/parsed/published/rejected/expired)
- ✅ Indexes for performance optimization
- ✅ Materialized view for active jobs
- ✅ Auto-sync trigger (JSONB → individual columns)
- ✅ Auto-expiry function for old jobs

### 2.2 Verify Migration

```sql
-- Check that all new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'job_postings'
ORDER BY ordinal_position;

-- Verify materialized view exists
SELECT * FROM active_jobs LIMIT 5;

-- Test increment function
SELECT increment_parsing_attempts('00000000-0000-0000-0000-000000000000');
```

---

## 🔐 Step 3: Environment Configuration

### 3.1 Set Supabase Edge Function Secrets

In Supabase Dashboard → Edge Functions → Settings, add:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
WEBHOOK_SECRET=generate_random_32_char_string
```

**Generate webhook secret:**
```bash
openssl rand -hex 32
```

### 3.2 Verify Environment Variables

```bash
# List all secrets (values are hidden)
supabase secrets list
```

---

## 🚀 Step 4: Deploy Edge Functions

### 4.1 Deploy Telegram Webhook Function

```bash
cd /path/to/App-M

# Deploy telegram-webhook
supabase functions deploy telegram-webhook --project-ref your-project-ref

# Verify deployment
supabase functions list
```

### 4.2 Deploy Job Parser Function

```bash
# Deploy job-parser (for retry logic)
supabase functions deploy job-parser --project-ref your-project-ref
```

### 4.3 Verify Functions are Live

```bash
# Check function logs
supabase functions logs telegram-webhook
supabase functions logs job-parser
```

---

## 🔗 Step 5: Set Telegram Webhook

### 5.1 Configure Webhook URL

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-project-ref.supabase.co/functions/v1/telegram-webhook",
    "secret_token": "your_webhook_secret_from_env",
    "allowed_updates": ["message", "edited_message"]
  }'
```

Replace:
- `<YOUR_BOT_TOKEN>` → Your actual bot token
- `your-project-ref` → Your Supabase project reference
- `your_webhook_secret_from_env` → The WEBHOOK_SECRET you set in step 3

### 5.2 Verify Webhook is Active

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Expected response:
```json
{
  "ok": true,
  "result": {
    "url": "https://your-project-ref.supabase.co/functions/v1/telegram-webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40
  }
}
```

---

## 🧪 Step 6: Testing

### 6.1 Test with Sample Job Posting

Send this message to a Telegram group where your bot is a member:

```
🚢 URGENT VACANCY 🚢

RANK: Chief Engineer
VESSEL TYPE: Bulk Carrier (Supramax)
SALARY: USD 8,500/month
JOINING DATE: 15 March 2026
AGENCY: Global Maritime Services Ltd
MLA NUMBER: MLA/2026/GMS-4567
ADDRESS: 123 Harbor Street, Manila, Philippines
MOBILE: +63 917 123 4567
EMAIL: recruitment@globalmaritime.ph

Requirements:
- Valid COC Class 1
- 5+ years experience on bulk carriers
- US Visa preferred

Contact us today!
```

### 6.2 Verify in Database

```sql
-- Check if job was inserted
SELECT id, source, source_group_name, status, parsing_attempts, created_at
FROM job_postings
ORDER BY created_at DESC
LIMIT 5;

-- Check parsed fields
SELECT rank, salary, joining_date, agency, mla_number, mobile_number, agency_email
FROM job_postings
WHERE id = 'your-job-id';

-- Check materialized view
SELECT * FROM active_jobs LIMIT 5;
```

### 6.3 Test Job Parser Manually

```bash
curl -X POST "https://your-project-ref.supabase.co/functions/v1/job-parser" \
  -H "Authorization: Bearer your_service_role_key" \
  -H "Content-Type: application/json" \
  -d '{"job_id": "your-job-uuid"}'
```

### 6.4 Test Edge Cases

1. **Duplicate Detection**: Send the same message twice → Should skip second one
2. **Missing Fields**: Send incomplete job posting → Should parse what's available
3. **Non-Job Message**: Send random text → Should be filtered out by `isLikelyJobPosting()`
4. **Retry Logic**: Manually set `parsing_attempts = 2` and call parser → Should reject after 3rd attempt

---

## 📊 Step 7: Monitoring and Maintenance

### 7.1 Monitor Edge Function Logs

```bash
# Real-time logs
supabase functions logs telegram-webhook --tail

# Filter by time
supabase functions logs job-parser --since 1h
```

### 7.2 Monitor Database Health

```sql
-- Jobs by status (last 24 hours)
SELECT
  status,
  COUNT(*) as count,
  AVG(parsing_attempts) as avg_attempts
FROM job_postings
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Failed parsing jobs (needs review)
SELECT id, raw_content, last_parsing_error, parsing_attempts
FROM job_postings
WHERE status = 'pending' AND parsing_attempts >= 2
ORDER BY created_at DESC;

-- Jobs by source group
SELECT source_group_name, COUNT(*) as job_count
FROM job_postings
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY source_group_name
ORDER BY job_count DESC;
```

### 7.3 Refresh Materialized View

```sql
-- Manually refresh (run daily via cron)
REFRESH MATERIALIZED VIEW active_jobs;

-- Or use the function
SELECT refresh_active_jobs();
```

### 7.4 Auto-Expire Old Jobs

```sql
-- Manually expire jobs older than 60 days
SELECT auto_expire_old_jobs();

-- Returns: Number of jobs expired
```

**Set up daily cron job** (via pg_cron or external scheduler):
```sql
-- Run daily at 2 AM
SELECT cron.schedule('auto-expire-jobs', '0 2 * * *', 'SELECT auto_expire_old_jobs();');
SELECT cron.schedule('refresh-active-jobs', '0 3 * * *', 'SELECT refresh_active_jobs();');
```

---

## 🔧 Troubleshooting

### Issue: Webhook Not Receiving Messages

**Check:**
```bash
# 1. Verify webhook is set
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# 2. Check bot privacy settings
# In BotFather: /setprivacy → DISABLED

# 3. Verify bot is in the group and can read messages

# 4. Check Edge Function logs
supabase functions logs telegram-webhook --tail
```

### Issue: Parsing Returns Empty/Incorrect Fields

**Possible causes:**
1. GEMINI_API_KEY not set or invalid
2. API quota exceeded
3. Job text too short/ambiguous

**Debug:**
```bash
# Check function logs
supabase functions logs job-parser --tail

# Test parser directly with raw content
curl -X POST "https://your-project.supabase.co/functions/v1/job-parser" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -d '{"job_id": "failing-job-uuid"}'
```

### Issue: Duplicate Messages Being Processed

**Fixed!** Webhook checks `source_id` before inserting.

**Verify:**
```sql
-- Check for duplicates
SELECT source_id, COUNT(*)
FROM job_postings
WHERE source = 'telegram'
GROUP BY source_id
HAVING COUNT(*) > 1;
```

### Issue: UI Not Showing New Fields

**Fixes:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Verify job was parsed AFTER migration
3. Check database:
   ```sql
   SELECT rank, salary, mla_number, agency_address, mobile_number, agency_email
   FROM job_postings WHERE id = 'job-id';
   ```

### Issue: "Max parsing attempts reached"

**Solution:** Jobs are auto-rejected after 3 failed attempts. Review manually:

```sql
SELECT id, raw_content, last_parsing_error
FROM job_postings
WHERE status = 'rejected' AND parsing_attempts >= 3
ORDER BY created_at DESC;
```

---

## 🎨 Frontend Usage

### Public Job Board

Users can view jobs at `/jobs` route. Only jobs with status `approved`, `parsed`, or `published` are shown.

**Features:**
- ✅ Filter by rank and ship type
- ✅ View all 8 SHIPPED fields
- ✅ Interactive Call and Email buttons
- ✅ MLA number and address display

### Admin Dashboard

Admins can:
- ✅ View all job postings (any status)
- ✅ Approve/reject jobs
- ✅ See parsing attempts and errors
- ✅ View source group names
- ✅ Manually retry failed parsing

**Access:** `/admin` (requires `is_admin = true` in profiles table)

---

## 📈 Performance Optimization

### 1. Use Materialized View for Public Queries

Instead of querying `job_postings` directly on the public job board, use `active_jobs`:

```typescript
// Faster for public view
const { data } = await supabase
  .from('active_jobs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(50);
```

### 2. Index Usage

Queries on these columns will use indexes:
- `status`
- `rank`
- `agency`
- `created_at`
- `source_id`
- `source_group_id`

### 3. Query Optimization

```sql
-- ✅ GOOD: Uses index
SELECT * FROM job_postings
WHERE status = 'published' AND rank LIKE '%Engineer%'
ORDER BY created_at DESC;

-- ❌ BAD: Full table scan
SELECT * FROM job_postings
WHERE raw_content LIKE '%engineer%';
```

---

## 🔒 Security Best Practices

1. **Never expose Service Role Key** in frontend code
2. **Always validate webhook secret** in Edge Functions
3. **Use RLS policies** for public vs admin access
4. **Rotate API keys** periodically (Gemini, Telegram)
5. **Monitor function logs** for suspicious activity
6. **Limit webhook updates** to `message` and `edited_message` only

---

## 📊 Success Metrics

After deployment, monitor:

| Metric | Target | Query |
|--------|--------|-------|
| Parsing Success Rate | >85% | `SELECT COUNT(*) FILTER (WHERE status='parsed') / COUNT(*)::float FROM job_postings` |
| Avg Parsing Attempts | <1.5 | `SELECT AVG(parsing_attempts) FROM job_postings WHERE status='parsed'` |
| Jobs Rejected | <10% | `SELECT COUNT(*) FILTER (WHERE status='rejected') / COUNT(*)::float FROM job_postings` |
| Duplicate Rate | 0% | `SELECT COUNT(*) FROM (SELECT source_id FROM job_postings GROUP BY source_id HAVING COUNT(*) > 1)` |

---

## 🆘 Support and Next Steps

### Phase 1: Initial Deployment (Week 1)
- ✅ Deploy all Edge Functions
- ✅ Run database migration
- ✅ Set up Telegram webhook
- ✅ Test with sample messages
- ✅ Monitor parsing accuracy

### Phase 2: Optimization (Week 2-3)
- [ ] Fine-tune Gemini prompt for better accuracy
- [ ] Set up daily cron jobs (auto-expire, refresh materialized view)
- [ ] Implement analytics dashboard
- [ ] Add email notifications for failed parsing

### Phase 3: Advanced Features (Month 2)
- [ ] Auto-categorization by ship type
- [ ] Duplicate job detection (not just duplicate messages)
- [ ] Smart matching (notify users of relevant jobs)
- [ ] Multi-language support

---

## 📝 Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2026-02-13 | Enhanced schema, retry logic, individual columns, materialized views |
| 1.0 | 2026-02-13 | Initial Gemini-based implementation with 8 SHIPPED fields |

---

## ✅ Post-Deployment Checklist

- [ ] Database migration completed successfully
- [ ] Environment variables set in Supabase
- [ ] telegram-webhook function deployed and accessible
- [ ] job-parser function deployed and accessible
- [ ] Telegram webhook URL configured
- [ ] Bot added to at least one test group
- [ ] Test message sent and processed successfully
- [ ] Parsed fields visible in database
- [ ] Parsed job visible on public job board
- [ ] Admin dashboard shows all tracking fields
- [ ] Materialized view refreshed
- [ ] Monitoring set up (logs, database queries)

---

**Status:** ✅ Ready for Production Deployment
**AI Model:** Gemini 2.0 Flash (via Google AI)
**Database:** Supabase PostgreSQL
**Runtime:** Deno/TypeScript Edge Functions

**For issues or questions, check Supabase function logs and database queries above.**
