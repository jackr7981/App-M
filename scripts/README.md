# Scripts Directory

This directory contains utility scripts for BD Mariner Hub maintenance and monitoring.

---

## 📊 Gemini Model Availability Checker

**File**: `check_gemini_models.py`

### Purpose

Automatically monitors Google Gemini AI model availability to ensure the app's AI features remain operational. This script:

- Checks if the primary model (Gemini 2.5 Flash) is available
- Lists all available Gemini models
- Recommends fallback models if the primary is unavailable
- Generates daily reports for tracking
- Alerts via GitHub Actions if models become unavailable

### Why This Matters

Google periodically deprecates or updates AI models. If `gemini-2.5-flash` suddenly becomes unavailable and your app tries to use it, the AI chat and job parsing features will break. This monitoring system provides early warning so you can switch to an alternative model before users are affected.

### How It Works

1. **Daily Automated Check**: GitHub Actions runs this script every day at midnight UTC
2. **Model Discovery**: Fetches all available models from Gemini API
3. **Status Verification**: Checks if `models/gemini-2.5-flash` is in the list
4. **Fallback Analysis**: Tests availability of backup models:
   - `gemini-2.0-flash-exp`
   - `gemini-1.5-flash`
   - `gemini-1.5-flash-latest`
   - `gemini-pro`
5. **Report Generation**: Creates JSON reports in `/reports` directory
6. **Alert System**: If primary model is missing, GitHub Actions fails and sends email notification

### Setup

#### 1. Add GitHub Secret

The script requires your Gemini API key to be stored as a GitHub secret:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `GEMINI_API_KEY`
5. Value: Paste your Google AI Studio API key
6. Click **Add secret**

#### 2. Enable GitHub Actions

The workflow is already configured in `.github/workflows/gemini-model-check.yml`. GitHub Actions should automatically enable it when the workflow file is pushed to the repository.

#### 3. Verify Setup

Test the workflow manually:

1. Go to **Actions** tab in your GitHub repository
2. Click **Gemini Model Availability Check** workflow
3. Click **Run workflow** → **Run workflow**
4. Wait for completion (~30 seconds)
5. Check the summary for model availability

### Usage

#### Run Manually (via GitHub Actions)

```
1. Go to Actions tab
2. Select "Gemini Model Availability Check"
3. Click "Run workflow"
4. Select branch (usually main or current branch)
5. Click "Run workflow"
```

#### Run Locally (for testing)

```bash
# Set environment variable
export GEMINI_API_KEY="your-api-key-here"

# Run script
python scripts/check_gemini_models.py
```

### Output

The script generates detailed output including:

**Console Output**:
```
🔍 Fetching available Gemini models...

📊 Total models available: 15
================================================================================

🤖 Gemini Models Found: 8
--------------------------------------------------------------------------------
  • models/gemini-1.5-flash
  • models/gemini-1.5-flash-latest
  • models/gemini-1.5-pro
  • models/gemini-2.0-flash-exp
  • models/gemini-2.5-flash
  • models/gemini-pro

================================================================================
🎯 PRIMARY MODEL CHECK: models/gemini-2.5-flash
================================================================================
✅ SUCCESS: models/gemini-2.5-flash is ACTIVE and available!

📋 Model Details:
  Display Name: Gemini 2.5 Flash
  Description: Fast and versatile multimodal model for scaling across diverse tasks...
  Input Token Limit: 1048576
  Output Token Limit: 8192

================================================================================
🔄 FALLBACK MODEL STATUS
================================================================================
✅ models/gemini-2.0-flash-exp - AVAILABLE
✅ models/gemini-1.5-flash - AVAILABLE
✅ models/gemini-1.5-flash-latest - AVAILABLE
✅ models/gemini-pro - AVAILABLE

================================================================================
💡 RECOMMENDATIONS
================================================================================

✨ All systems operational. No action needed.

📁 Report saved to: reports/gemini-model-check-2026-02-14.json

================================================================================
✅ Check completed at 2026-02-14 12:00:00 UTC
================================================================================
```

**JSON Report** (`reports/latest-model-check.json`):
```json
{
  "timestamp": "2026-02-14T00:00:00.123456",
  "primary_model": "models/gemini-2.5-flash",
  "primary_model_available": true,
  "total_models": 15,
  "gemini_models": [
    "models/gemini-1.5-flash",
    "models/gemini-2.5-flash",
    ...
  ],
  "fallback_models": {
    "configured": [...],
    "available": [...]
  },
  "status": "OK"
}
```

### Reports

Reports are saved in the `/reports` directory:

- **Daily Reports**: `gemini-model-check-YYYY-MM-DD.json`
- **Latest Report**: `latest-model-check.json` (always current)

Reports are:
- Committed to the repository (tracking history)
- Uploaded as GitHub Actions artifacts (90-day retention)
- Viewable in the Actions summary page

### Alert System

If the primary model becomes unavailable:

1. **Immediate**:
   - GitHub Actions workflow fails
   - Red ❌ status badge appears
   - GitHub sends email to repository watchers

2. **In Logs**:
   ```
   ❌ WARNING: models/gemini-2.5-flash is NOT AVAILABLE!

   🚨 ALERT: Primary model unavailable. Please review alternatives below.

   ⚠️  IMMEDIATE ACTION REQUIRED:
      Primary model 'models/gemini-2.5-flash' is down.

      Recommended Fallback: models/gemini-2.0-flash-exp

      To update your app:
      1. Update supabase/functions/_shared/gemini-parser.ts
      2. Change model name to: models/gemini-2.0-flash-exp
      3. Redeploy Edge Functions: supabase functions deploy
   ```

### Updating to a Fallback Model

If you receive an alert that the primary model is down:

#### Step 1: Identify Fallback

Check the latest report or workflow logs for the recommended fallback model.

#### Step 2: Update Code

Edit `supabase/functions/_shared/gemini-parser.ts`:

```typescript
// OLD:
const MODEL_NAME = 'models/gemini-2.5-flash';

// NEW (example with gemini-2.0-flash-exp):
const MODEL_NAME = 'models/gemini-2.0-flash-exp';
```

#### Step 3: Redeploy

```bash
# Deploy the updated Edge Function
supabase functions deploy job-parser

# Verify deployment
supabase functions list
```

#### Step 4: Test

Send a test job posting to Telegram and verify parsing still works.

#### Step 5: Update Configuration

Update `scripts/check_gemini_models.py` to make the new model primary:

```python
# Update PRIMARY_MODEL constant
PRIMARY_MODEL = "models/gemini-2.0-flash-exp"
```

### Troubleshooting

#### Workflow Fails: "GEMINI_API_KEY not found"

**Cause**: GitHub secret not configured
**Fix**: Add `GEMINI_API_KEY` secret (see Setup section)

#### Workflow Fails: "API ERROR: Could not connect"

**Causes**:
- Invalid API key
- Network issues
- Gemini API outage

**Fix**:
1. Verify API key is correct
2. Check Google Cloud status: https://status.cloud.google.com/
3. Try running manually to get more details

#### No Models Found

**Cause**: API key may not have access to Gemini models
**Fix**:
1. Verify API key is from Google AI Studio (not Google Cloud)
2. Check API key permissions
3. Generate a new API key if needed

### Schedule

- **Automatic Runs**: Daily at 00:00 UTC (midnight)
- **Manual Runs**: Anytime via GitHub Actions UI
- **On Code Changes**: When `check_gemini_models.py` or workflow file is updated

### Maintenance

This script requires minimal maintenance:

- **Update Fallback Models**: If Google releases new models, add them to `FALLBACK_MODELS` list
- **Adjust Schedule**: Modify cron expression in workflow file if needed
- **Report Cleanup**: Old reports are kept in Git history; consider pruning reports/ folder periodically

---

## 🚢 MariAid Job Scraper

**File**: `scrape_mariaid_jobs.py`

See [jobs/README.md](../jobs/README.md) for documentation.

---

## Future Scripts

Additional maintenance scripts may be added here:

- Database backup automation
- Document cleanup (expired documents)
- User activity reports
- Performance monitoring
- API usage tracking

---

**Last Updated**: February 14, 2026
