# Analytics & Metrics

**Path**: `docs/13-analytics-metrics.md`
**Last Updated**: February 14, 2026
**Related**: [Product Vision](01-product-vision.md) | [Marketing & SEO](09-marketing-seo.md) | [User Flows](08-user-flows.md)

---

## Table of Contents
- [Overview](#overview)
- [Key Performance Indicators (KPIs)](#key-performance-indicators-kpis)
- [User Acquisition Metrics](#user-acquisition-metrics)
- [Engagement Metrics](#engagement-metrics)
- [Retention Metrics](#retention-metrics)
- [Business Metrics](#business-metrics)
- [Technical Metrics](#technical-metrics)
- [Analytics Implementation](#analytics-implementation)
- [Reporting & Dashboards](#reporting--dashboards)

---

## Overview

This document outlines the metrics and analytics framework for BD Mariner Hub to measure success, identify opportunities, and make data-driven decisions.

### Analytics Philosophy

**Principles**:
- **User Privacy First**: Minimal data collection, GDPR-compliant
- **Actionable Metrics**: Track only what informs decisions
- **Real-time Insights**: Monitor critical metrics live
- **A/B Testing**: Experiment and validate hypotheses

**Analytics Stack** (Planned Q2 2026):
- Google Analytics 4 (web analytics)
- Mixpanel (product analytics)
- Supabase Analytics (database queries)
- Custom dashboard (key metrics)

---

## Key Performance Indicators (KPIs)

### North Star Metric

**Definition**: The single metric that best captures core value delivered to users

**BD Mariner Hub North Star**: **Jobs Contacted per Active User per Month**

**Why?**
- Measures actual value (user found job and took action)
- Correlates with long-term success (finding employment)
- Easy to track and understand

**Target**: 2.5 jobs contacted per active user per month

---

### OKRs (Objectives & Key Results)

**Q1 2026 Objective**: Establish Product-Market Fit

**Key Results**:
- ✅ KR1: 5,000 monthly active users (MAU)
- ✅ KR2: 60% D7 retention rate
- ✅ KR3: 30% job contact rate (users who contact agencies)

---

**Q2 2026 Objective**: Drive Engagement & Retention

**Key Results**:
- KR1: 15,000 MAU
- KR2: 70% D7 retention rate
- KR3: 5+ jobs viewed per session (avg)

---

**Q3 2026 Objective**: Scale User Base

**Key Results**:
- KR1: 50,000 MAU
- KR2: 10,000 app downloads (native apps)
- KR3: 4.5+ star rating on app stores

---

## User Acquisition Metrics

### New Users

**Definition**: Users who created an account for the first time

**Formula**: COUNT(DISTINCT user_id WHERE created_at >= start_date AND created_at <= end_date)

**Target**:
- Month 1: 1,000 new users
- Month 3: 2,000 new users
- Month 6: 5,000 new users
- Month 12: 10,000 new users

**Tracking**:
```sql
SELECT
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as new_users
FROM profiles
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY date
ORDER BY date;
```

---

### Acquisition Channels

**Definition**: Source of user sign-ups

**Channels**:
- Organic (direct URL)
- Social Media (Facebook, LinkedIn)
- Search (Google)
- Referral (word-of-mouth)
- Paid Ads (Facebook Ads, Google Ads)

**UTM Tracking**:
```
https://bdmarinerhub.com/?utm_source=facebook&utm_medium=social&utm_campaign=launch
```

**Query**:
```sql
SELECT
  utm_source,
  utm_medium,
  COUNT(*) as users,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM profiles
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY utm_source, utm_medium
ORDER BY users DESC;
```

**Target Distribution**:
- Organic: 40%
- Social Media: 30%
- Referral: 20%
- Search: 7%
- Paid Ads: 3%

---

### Sign-Up Conversion Rate

**Definition**: Percentage of visitors who create an account

**Formula**: (New Users / Total Visitors) × 100

**Funnel**:
```
1,000 visitors
  ↓ 70% view job board (700)
  ↓ 40% click sign-up (280)
  ↓ 80% complete form (224)
  ↓ 90% verify email (201)
= 20.1% conversion rate
```

**Target**: >20% conversion rate

**Optimization**:
- Reduce form fields (email + password only)
- Social sign-in (Google, Facebook) - future
- Guest mode (browse without account) - future

---

## Engagement Metrics

### Monthly Active Users (MAU)

**Definition**: Users who logged in at least once in the past 30 days

**Formula**: COUNT(DISTINCT user_id WHERE last_sign_in >= NOW() - INTERVAL '30 days')

**Target**:
- Month 1: 1,000 MAU
- Month 3: 5,000 MAU
- Month 6: 15,000 MAU
- Month 12: 50,000 MAU

**Query**:
```sql
SELECT COUNT(DISTINCT id) as mau
FROM profiles
WHERE last_sign_in_at >= NOW() - INTERVAL '30 days';
```

---

### Daily Active Users (DAU)

**Definition**: Users who logged in today

**Formula**: COUNT(DISTINCT user_id WHERE last_sign_in >= TODAY)

**Target**:
- DAU/MAU ratio: >30% (sticky app)

**Query**:
```sql
SELECT COUNT(DISTINCT id) as dau
FROM profiles
WHERE last_sign_in_at >= CURRENT_DATE;
```

---

### Session Duration

**Definition**: Average time spent per session

**Target**: >3 minutes per session

**Tracking** (Google Analytics):
```javascript
// Track session start
gtag('event', 'session_start', {
  timestamp: Date.now()
});

// Track session end
window.addEventListener('beforeunload', () => {
  const duration = Date.now() - sessionStart;
  gtag('event', 'session_end', {
    duration_seconds: Math.floor(duration / 1000)
  });
});
```

---

### Jobs Viewed per Session

**Definition**: Average number of jobs a user views in one session

**Target**: >5 jobs per session

**Formula**: Total Job Views / Total Sessions

**Query**:
```sql
SELECT
  AVG(jobs_viewed) as avg_jobs_per_session
FROM (
  SELECT
    user_id,
    session_id,
    COUNT(DISTINCT job_id) as jobs_viewed
  FROM job_views
  GROUP BY user_id, session_id
) subquery;
```

---

### Feature Adoption Rate

**Definition**: Percentage of users who use a specific feature

| Feature | Adoption Target | Current |
|---------|----------------|---------|
| **Job Board** | 100% | TBD |
| **AI Chat** | 50% | TBD |
| **Document Upload** | 40% | TBD |
| **Sea Service Tracker** | 30% | TBD |
| **Forum** | 10% | TBD |
| **Alumni** | 5% | TBD |

**Query**:
```sql
SELECT
  (SELECT COUNT(DISTINCT user_id) FROM chat_messages) * 100.0 /
  (SELECT COUNT(*) FROM profiles WHERE created_at >= NOW() - INTERVAL '30 days')
  as ai_chat_adoption_rate;
```

---

## Retention Metrics

### D1, D7, D30 Retention

**Definition**: Percentage of users who return after X days

**Formula**:
- **D1**: Users who return next day / New users on day 0
- **D7**: Users who return in week 1 / New users in week 0
- **D30**: Users who return in month 1 / New users in month 0

**Targets**:
- D1 Retention: >40%
- D7 Retention: >25%
- D30 Retention: >15%

**Query** (D7 Retention):
```sql
WITH new_users AS (
  SELECT id, DATE(created_at) as signup_date
  FROM profiles
  WHERE created_at >= NOW() - INTERVAL '7 days'
),
returning_users AS (
  SELECT DISTINCT nu.id
  FROM new_users nu
  JOIN profiles p ON p.id = nu.id
  WHERE p.last_sign_in_at >= nu.signup_date + INTERVAL '7 days'
    AND p.last_sign_in_at < nu.signup_date + INTERVAL '14 days'
)
SELECT
  COUNT(DISTINCT ru.id) * 100.0 / COUNT(DISTINCT nu.id) as d7_retention
FROM new_users nu
LEFT JOIN returning_users ru ON ru.id = nu.id;
```

---

### Cohort Analysis

**Definition**: Track retention by signup cohort (month)

**Example**:

| Cohort | Month 0 | Month 1 | Month 2 | Month 3 |
|--------|---------|---------|---------|---------|
| **Jan 2026** | 100% | 60% | 40% | 30% |
| **Feb 2026** | 100% | 65% | 45% | - |
| **Mar 2026** | 100% | 70% | - | - |

**Insight**: Feb cohort has better retention than Jan (65% vs 60% in Month 1)

---

### Churn Rate

**Definition**: Percentage of users who stop using the app

**Formula**: (Users who left / Total users at start) × 100

**Target**: <60% churn after 3 months

**Definition of "Churned"**: No activity in 60 days

**Query**:
```sql
SELECT
  COUNT(*) * 100.0 / (SELECT COUNT(*) FROM profiles)
  as churn_rate
FROM profiles
WHERE last_sign_in_at < NOW() - INTERVAL '60 days';
```

---

## Business Metrics

### Job Contact Rate

**Definition**: Percentage of users who contact agencies

**Formula**: (Users who clicked contact / Total users) × 100

**Target**: >30%

**Query**:
```sql
SELECT
  COUNT(DISTINCT user_id) * 100.0 / (SELECT COUNT(*) FROM profiles)
  as job_contact_rate
FROM job_contacts
WHERE created_at >= NOW() - INTERVAL '30 days';
```

---

### Job-to-Hire Conversion (Future)

**Definition**: Percentage of contacted jobs that result in employment

**Formula**: (Jobs hired / Jobs contacted) × 100

**Target**: >5% (industry benchmark)

**Tracking**: User survey, follow-up emails

---

### Document Upload Rate

**Definition**: Percentage of users who upload at least 1 document

**Formula**: (Users with documents / Total users) × 100

**Target**: >40%

**Query**:
```sql
SELECT
  COUNT(DISTINCT user_id) * 100.0 / (SELECT COUNT(*) FROM profiles)
  as upload_rate
FROM documents;
```

---

### AI Chat Usage

**Definition**: Average messages per active chat user

**Target**: >5 messages per user who uses chat

**Query**:
```sql
SELECT AVG(message_count) as avg_messages
FROM (
  SELECT user_id, COUNT(*) as message_count
  FROM chat_messages
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY user_id
) subquery;
```

---

### Forum Participation

**Definition**: Percentage of users who post in forum

**Target**: >5%

**Query**:
```sql
SELECT
  COUNT(DISTINCT author_id) * 100.0 / (SELECT COUNT(*) FROM profiles)
  as forum_participation
FROM forum_posts
WHERE created_at >= NOW() - INTERVAL '30 days';
```

---

## Technical Metrics

### Job Parsing Accuracy

**Definition**: Percentage of jobs with all 8 fields correctly extracted

**Target**: >90%

**Measurement**:
- Manual review of 100 random jobs
- Compare AI extraction vs human verification
- Calculate accuracy per field

**Query**:
```sql
SELECT
  COUNT(*) FILTER (WHERE rank IS NOT NULL) * 100.0 / COUNT(*) as rank_accuracy,
  COUNT(*) FILTER (WHERE salary IS NOT NULL) * 100.0 / COUNT(*) as salary_accuracy,
  COUNT(*) FILTER (WHERE agency IS NOT NULL) * 100.0 / COUNT(*) as agency_accuracy
FROM job_postings
WHERE created_at >= NOW() - INTERVAL '30 days';
```

---

### Average Parsing Attempts

**Definition**: Average number of AI parsing attempts per job

**Target**: <1.5 (most jobs parse on first try)

**Query**:
```sql
SELECT AVG(parsing_attempts) as avg_attempts
FROM job_postings
WHERE status = 'parsed' AND created_at >= NOW() - INTERVAL '30 days';
```

---

### Database Performance

**Metrics**:

| Query | Target | Current |
|-------|--------|---------|
| **Job Listing** | <500ms | 250ms ✅ |
| **Profile Load** | <200ms | 150ms ✅ |
| **Document Upload** | <2s | 1.5s ✅ |
| **AI Chat Response** | <3s | 1.8s ✅ |

**Monitoring**:
```sql
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

### Error Rate

**Definition**: Percentage of requests that result in errors

**Target**: <0.5%

**Tracking**:
```javascript
// Frontend error tracking (Sentry integration)
Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  tracesSampleRate: 0.1
});

// Log errors
try {
  await fetchJobs();
} catch (error) {
  Sentry.captureException(error);
}
```

**Query** (Edge Function errors):
```bash
supabase functions logs telegram-webhook --filter "level=error"
```

---

### Uptime

**Definition**: Percentage of time app is available

**Target**: >99.5% (3.6 hours downtime per month)

**Monitoring**: UptimeRobot, Pingdom, or StatusCake

---

## Analytics Implementation

### Google Analytics 4 Setup

**Installation**:
```html
<!-- Add to index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**Track Custom Events**:
```typescript
// Track job view
gtag('event', 'view_job', {
  job_id: job.id,
  rank: job.rank,
  agency: job.agency
});

// Track job contact
gtag('event', 'contact_agency', {
  job_id: job.id,
  contact_method: 'phone' // or 'email'
});

// Track document upload
gtag('event', 'upload_document', {
  document_type: 'CDC',
  user_id: user.id
});
```

---

### Mixpanel Setup

**Installation**:
```bash
npm install mixpanel-browser
```

**Implementation**:
```typescript
import mixpanel from 'mixpanel-browser';

// Initialize
mixpanel.init('YOUR_MIXPANEL_TOKEN');

// Identify user
mixpanel.identify(user.id);
mixpanel.people.set({
  $email: user.email,
  $name: `${user.first_name} ${user.last_name}`,
  rank: user.rank
});

// Track events
mixpanel.track('Job Viewed', {
  job_id: job.id,
  rank: job.rank,
  salary: job.salary
});
```

**Benefits**:
- User-centric analytics (track individual journeys)
- Funnel analysis
- Cohort analysis
- A/B testing

---

### Custom Analytics Dashboard

**Tech Stack**: Supabase + React + Recharts

**Metrics Displayed**:
- MAU/DAU (line chart)
- New users (bar chart)
- Job contact rate (KPI card)
- Top jobs (table)
- User retention (cohort grid)

**Query Example**:
```typescript
const { data: mauData } = await supabase.rpc('get_mau_trend', {
  start_date: '2026-01-01',
  end_date: '2026-02-14'
});

// Display in line chart
<LineChart data={mauData}>
  <Line dataKey="mau" stroke="#1E40AF" />
  <XAxis dataKey="date" />
  <YAxis />
</LineChart>
```

---

## Reporting & Dashboards

### Weekly Metrics Report

**Recipients**: Team, investors
**Format**: Email (automated)

**Contents**:
```
📊 BD Mariner Hub - Weekly Metrics (Feb 7-14, 2026)

🚀 KEY METRICS
- MAU: 5,247 (+12% vs last week)
- New Users: 423 (+8%)
- Job Contact Rate: 32.1% (+2.1%)

📈 ENGAGEMENT
- Avg Jobs Viewed: 5.8 per session
- AI Chat Users: 48% of MAU
- Document Uploads: 187 this week

💼 JOBS
- New Jobs Posted: 156
- Active Jobs: 189
- Top Agency: ABC Maritime (23 jobs)

🐛 TECH HEALTH
- Uptime: 99.98%
- Error Rate: 0.12%
- Avg Response Time: 240ms

🎯 GOALS
✅ MAU Goal: 5,000 (achieved 105%)
⚠️ D7 Retention: 23% (target: 25%)
✅ Job Contact Rate: 32% (target: 30%)
```

---

### Monthly Business Review

**Format**: Presentation (Google Slides)

**Sections**:
1. **Executive Summary**: Key wins, challenges, next steps
2. **User Growth**: MAU trend, acquisition channels, cohorts
3. **Engagement**: Session duration, feature adoption, retention
4. **Business Metrics**: Job contact rate, document uploads, revenue (future)
5. **Product Updates**: New features, bug fixes, roadmap progress
6. **Goals for Next Month**: OKRs, key initiatives

---

### Real-Time Dashboard

**Tool**: Grafana + Prometheus (future) or Supabase Dashboard

**Metrics**:
- Current online users (WebSocket connections)
- Jobs posted today
- Sign-ups today
- Error rate (last 1 hour)
- Database query performance

**Alerts**:
- Email if error rate >1%
- Slack if uptime <99%
- SMS if database unresponsive

---

### A/B Testing Framework

**Tool**: Google Optimize, Optimizely, or Custom

**Test Examples**:

**Test 1: Sign-Up CTA**
- Variant A: "Sign Up Free"
- Variant B: "Get Started"
- Metric: Sign-up conversion rate
- Winner: Variant A (22% vs 18%)

**Test 2: Job Card Layout**
- Variant A: Compact (1 line per field)
- Variant B: Spacious (2 lines per field)
- Metric: Job click-through rate
- Winner: Variant B (42% vs 38%)

**Implementation**:
```typescript
// Simple A/B test
const variant = Math.random() < 0.5 ? 'A' : 'B';

// Show variant
{variant === 'A' ? (
  <button>Sign Up Free</button>
) : (
  <button>Get Started</button>
)}

// Track conversion
gtag('event', 'sign_up', { variant });
```

---

## Data Privacy & Compliance

### GDPR Compliance

**User Rights**:
- Right to access data (export feature)
- Right to delete data (account deletion)
- Right to opt-out (analytics toggle)

**Implementation**:
```typescript
// Privacy settings
const { data } = await supabase
  .from('profiles')
  .update({ analytics_enabled: false })
  .eq('id', user.id);
```

**Cookie Banner**:
```
🍪 We use cookies to improve your experience.
[Accept] [Decline] [Learn More]
```

---

### Data Retention Policy

**Policy**:
- User data: Retained indefinitely (until user deletes account)
- Analytics data: Retained 2 years
- Logs: Retained 90 days
- Deleted user data: Permanently deleted within 30 days

---

## Related Documentation
- **[Product Vision](01-product-vision.md)** - Success metrics
- **[User Flows](08-user-flows.md)** - Conversion funnels
- **[Marketing & SEO](09-marketing-seo.md)** - Acquisition channels
- **[Development Roadmap](11-development-roadmap.md)** - Feature tracking

---

**Next**: [Support & Maintenance](14-support-maintenance.md)
