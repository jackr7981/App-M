# MariAid Job Scraper

This directory contains automated scrapes of maritime job listings from [mariaid.com/careers-at-sea](https://mariaid.com/careers-at-sea).

## 📁 Files

- **`latest_jobs.json`** - Most recent scrape with all job details
- **`jobs_YYYY-MM-DD_HH-MM-SS.json`** - Historical timestamped snapshots (JSON)
- **`jobs_YYYY-MM-DD_HH-MM-SS.csv`** - Historical timestamped snapshots (CSV)
- **`jobs_history.json`** - 30-day rolling history with change detection

## 🤖 Automation

The scraper runs automatically via GitHub Actions:
- **Schedule**: Daily at 9:00 AM UTC
- **Workflow**: `.github/workflows/scrape-jobs.yml`
- **Script**: `scripts/scrape_mariaid_jobs.py`

## 🚀 Manual Run

To run the scraper manually:

```bash
# Install dependencies
pip install -r requirements.txt

# Run scraper
python scripts/scrape_mariaid_jobs.py
```

## 📊 Data Structure

Each job listing includes:
- `title` - Job position (e.g., "SECOND OFF - VLCC")
- `salary` - Salary range if available
- `contract` - Contract duration (e.g., "8M (+1)")
- `positions` - Number of open positions
- `apply_url` - Application link
- `raw_text` - Full text content
- `scraped_at` - ISO timestamp

## 🔔 Change Detection

The scraper automatically detects new job postings by comparing against the previous run. New jobs are highlighted in the workflow summary.

## 📈 GitHub Actions Features

- ✅ Automatic daily scraping
- ✅ Git commit and push results
- ✅ Job summary in Actions UI
- ✅ Artifact upload (90-day retention)
- ✅ Manual trigger support (`workflow_dispatch`)

## 🛠️ Configuration

To change the scraping schedule, edit `.github/workflows/scrape-jobs.yml`:

```yaml
schedule:
  - cron: '0 9 * * *'  # Daily at 9 AM UTC
```

[Cron expression reference](https://crontab.guru/)
