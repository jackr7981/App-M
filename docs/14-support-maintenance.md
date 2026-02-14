# Support & Maintenance

**Path**: `docs/14-support-maintenance.md`
**Last Updated**: February 14, 2026
**Related**: [Testing & QA](12-testing-qa.md) | [Analytics & Metrics](13-analytics-metrics.md) | [Deployment Guide](../DEPLOYMENT_GUIDE.md)

---

## Table of Contents
- [Overview](#overview)
- [User Support](#user-support)
- [System Maintenance](#system-maintenance)
- [Monitoring & Alerts](#monitoring--alerts)
- [Incident Response](#incident-response)
- [Database Maintenance](#database-maintenance)
- [Security Maintenance](#security-maintenance)
- [Documentation Updates](#documentation-updates)
- [Support Metrics](#support-metrics)

---

## Overview

This document outlines the support and maintenance procedures for BD Mariner Hub to ensure smooth operations, quick issue resolution, and continuous improvement.

### Support Philosophy

**Principles**:
- **User-First**: Respond quickly, empathize, solve problems
- **Proactive**: Fix issues before users report them
- **Transparent**: Communicate status clearly
- **Continuous Improvement**: Learn from every support ticket

---

## User Support

### Support Channels

| Channel | Availability | Response Time | Use Case |
|---------|-------------|---------------|----------|
| **Email** | 24/7 | <24 hours | General inquiries, bug reports |
| **In-App Chat** | Future | <2 hours | Quick questions, account issues |
| **WhatsApp** | Future | <4 hours | Urgent issues (Bangladesh users) |
| **FAQ** | 24/7 | Instant | Self-service |
| **Community Forum** | 24/7 | User-driven | Peer support |

---

### Email Support

**Address**: support@bdmarinerhub.com

**Auto-Reply Template**:
```
Subject: Re: [Original Subject]

Dear [Name],

Thank you for contacting BD Mariner Hub!

We've received your message and will respond within 24 hours. For faster assistance, check our FAQ: https://bdmarinerhub.com/faq

Your ticket number: #12345

Best regards,
BD Mariner Hub Support Team
```

**Priority Classification**:

| Priority | Definition | Response SLA | Resolution SLA |
|----------|------------|--------------|----------------|
| **P0 - Critical** | App down, data loss | <1 hour | <4 hours |
| **P1 - High** | Core feature broken | <4 hours | <24 hours |
| **P2 - Medium** | Minor feature issue | <24 hours | <3 days |
| **P3 - Low** | Enhancement request | <48 hours | Future release |

---

### Common Support Tickets

#### Issue: Can't Log In

**Response Template**:
```
Hi [Name],

Sorry you're having trouble logging in! Let's fix this:

1. Double-check your email address
2. Try "Forgot Password" to reset
3. Clear browser cache and try again
4. Make sure cookies are enabled

If none of these work, I can manually reset your password. Just confirm your account email.

Best,
[Support Agent]
```

---

#### Issue: Job Parsing Error (Wrong Fields)

**Response Template**:
```
Hi [Name],

Thank you for reporting the parsing issue! Our AI is learning and improving every day.

I've reviewed Job #[ID] and manually corrected the fields. You should see accurate information now.

We've also flagged this for training data to improve future parsing.

Anything else I can help with?

Best,
[Support Agent]
```

---

#### Issue: Document Won't Upload

**Response Template**:
```
Hi [Name],

Let's troubleshoot your document upload:

1. File size: Max 10 MB (your file: [SIZE])
2. File type: PDF, JPG, PNG only (your file: [TYPE])
3. Internet connection: Must be stable during upload

Can you try:
- Reducing file size (compress PDF)
- Converting to PDF format
- Using WiFi instead of mobile data

Let me know if this helps!

Best,
[Support Agent]
```

---

### FAQ (Frequently Asked Questions)

**Page**: `/faq`

**Categories**:
1. Account & Login
2. Job Board
3. Documents
4. AI Chat
5. Technical Issues

**Example FAQs**:

**Q: Is BD Mariner Hub free?**
A: Yes! BD Mariner Hub is 100% free for seafarers. No subscription, no hidden fees, ever.

**Q: How do I verify an agency's MLA number?**
A: Go to Manning Agents directory, search for the agency. Verified agencies have a green checkmark and valid MLA number.

**Q: Can I use the app offline?**
A: Yes! BD Mariner Hub works offline. Jobs you've viewed are cached and accessible without internet.

**Q: How accurate is the AI job parsing?**
A: Our AI has 92%+ accuracy. If you spot errors, report them and we'll manually fix + improve the AI.

**Q: How do I delete my account?**
A: Go to Settings → Account → Delete Account. Note: This permanently deletes all your data (documents, sea service, etc.).

---

### User Guides & Tutorials

**Format**: Step-by-step with screenshots

**Topics**:
1. How to Create an Account
2. How to Find Your Dream Job
3. How to Upload Documents
4. How to Use AI Career Assistant
5. How to Track Sea Service
6. How to Contact Agencies Safely

**Example Guide Structure**:
```markdown
# How to Upload Your CDC

**Step 1**: Navigate to Documents tab
[Screenshot: Documents tab highlighted]

**Step 2**: Click "Add Document"
[Screenshot: Add button]

**Step 3**: Fill in details
- Document Type: CDC
- Document Number: BD123456
- Expiry Date: 31 Dec 2027

**Step 4**: Upload file
- Click "Choose File"
- Select your CDC PDF
- Click "Upload"

**Step 5**: Verify upload
Your CDC should now appear in the list!
[Screenshot: Document list with CDC]

💡 Tip: Set a reminder 30 days before expiry!
```

---

## System Maintenance

### Maintenance Windows

**Scheduled Maintenance**:
- **Frequency**: Monthly (first Sunday, 2-4 AM Bangladesh Time)
- **Duration**: 2 hours max
- **Advance Notice**: 7 days via email, in-app banner

**Emergency Maintenance**:
- Critical security patches
- Database corruption fixes
- No advance notice (announce ASAP)

---

### Maintenance Checklist

#### Weekly Maintenance (Every Sunday 2 AM)

- [ ] Database health check
  ```sql
  SELECT * FROM pg_stat_activity WHERE state != 'idle';
  VACUUM ANALYZE;
  ```
- [ ] Storage cleanup (delete orphaned files)
- [ ] Review error logs (Sentry)
- [ ] Check disk space (target: <70% used)
- [ ] Verify backups (download and test restore)

---

#### Monthly Maintenance (First Sunday)

- [ ] Update dependencies
  ```bash
  npm update
  npm audit fix
  ```
- [ ] Database optimization
  ```sql
  REINDEX DATABASE postgres;
  VACUUM FULL;
  ```
- [ ] Refresh materialized views
  ```sql
  REFRESH MATERIALIZED VIEW active_jobs;
  ```
- [ ] Expire old jobs (>60 days)
  ```sql
  SELECT auto_expire_old_jobs();
  ```
- [ ] Review and close stale support tickets
- [ ] Security audit (dependency vulnerabilities)
- [ ] Performance review (Lighthouse scores)
- [ ] Cost review (Supabase, Gemini API usage)

---

#### Quarterly Maintenance

- [ ] Major dependency upgrades (React, Supabase, etc.)
- [ ] Performance load testing (k6)
- [ ] Security penetration testing (OWASP ZAP)
- [ ] Disaster recovery drill (restore from backup)
- [ ] Review and update documentation
- [ ] User feedback survey
- [ ] Team retrospective

---

### Deployment Procedures

**Production Deployment**:

**Pre-Deployment**:
1. All tests passing (unit, integration, E2E)
2. Code reviewed and approved
3. Staging tested thoroughly
4. Database migration tested (if any)
5. Backup created
6. Announcement prepared (if user-facing changes)

**Deployment Steps**:
```bash
# 1. Build production bundle
npm run build

# 2. Deploy Edge Functions (if updated)
supabase functions deploy telegram-webhook
supabase functions deploy job-parser

# 3. Run database migrations (if any)
psql -h db.xxx.supabase.co -U postgres -d postgres -f migration.sql

# 4. Deploy frontend
# (Upload dist/ to hosting or push to main branch for auto-deploy)

# 5. Verify deployment
curl https://bdmarinerhub.com/health
```

**Post-Deployment**:
1. Monitor error rates (first 1 hour)
2. Check database performance
3. Test critical user flows
4. Monitor user feedback/support tickets
5. Announce release (changelog, social media)

**Rollback Plan**:
```bash
# If critical issue found, rollback:
git revert HEAD
npm run build
# Redeploy previous version
```

---

## Monitoring & Alerts

### Health Checks

**Endpoint**: `/api/health`

**Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "storage": "available",
  "edge_functions": "operational",
  "uptime_seconds": 86400
}
```

**Monitoring Service**: UptimeRobot (free tier)
- Check every 5 minutes
- Alert if down for 2 consecutive checks
- Email + SMS notification

---

### Error Monitoring

**Tool**: Sentry (future)

**Setup**:
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ]
});
```

**Alert Rules**:
- Email if error count >10 in 1 hour
- Slack if new error type detected
- SMS if error rate >1%

---

### Performance Monitoring

**Metrics**:
- Server response time (target: <500ms)
- Database query time (target: <200ms)
- Edge Function cold start (target: <200ms)
- Frontend TTI (target: <3s)

**Tool**: Supabase Dashboard + Custom scripts

**Query**:
```sql
-- Slow queries (>1s)
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

### User Experience Monitoring

**Tool**: Google Analytics 4 + Mixpanel

**Events to Track**:
- Page load errors
- API call failures
- Form validation errors
- Broken links (404s)
- JavaScript errors

**Example**:
```typescript
window.addEventListener('error', (event) => {
  gtag('event', 'exception', {
    description: event.message,
    fatal: false
  });
});
```

---

## Incident Response

### Incident Severity Levels

| Level | Definition | Example | Response Time |
|-------|------------|---------|---------------|
| **SEV-0** | Complete outage | App down, database unreachable | <15 min |
| **SEV-1** | Major feature broken | Login broken, jobs not loading | <1 hour |
| **SEV-2** | Minor feature broken | AI chat slow, documents won't upload | <4 hours |
| **SEV-3** | Cosmetic issue | UI misaligned, typo | <24 hours |

---

### Incident Response Playbook

**SEV-0: App Down**

**1. Detect** (Alert or User Report)
- Email from UptimeRobot: "BD Mariner Hub is DOWN"
- Verify: Try accessing app from multiple devices

**2. Assess**
- Check Supabase status: https://status.supabase.com
- Check hosting status (Vercel/Netlify)
- Check database connectivity

**3. Communicate**
- Post on social media: "We're aware of an issue and working on it"
- Update status page (if available)

**4. Resolve**
- If Supabase issue: Wait for resolution, monitor status
- If code issue: Rollback to last working version
- If database issue: Restore from backup

**5. Verify**
- Test critical flows: sign-in, view jobs, upload document
- Monitor error rates

**6. Post-Mortem**
- Document what happened, why, how fixed
- Identify prevention measures
- Update runbooks

**Template**:
```markdown
# Incident Report - [Date]

**Summary**: App was down for 47 minutes due to database connection timeout

**Timeline**:
- 2:15 AM: Alert received (UptimeRobot)
- 2:17 AM: Verified outage
- 2:20 AM: Posted status update
- 2:25 AM: Identified cause (Supabase maintenance)
- 2:45 AM: Supabase restored
- 3:02 AM: All systems operational

**Root Cause**: Unannounced Supabase maintenance

**Impact**: 100% of users unable to access app

**Resolution**: Waited for Supabase to complete maintenance

**Prevention**:
- Subscribe to Supabase status notifications
- Implement better status page
- Add retry logic for database connections
```

---

## Database Maintenance

### Backup Strategy

**Automated Backups** (Supabase):
- **Daily**: Full database backup (retained 7 days)
- **Point-in-Time Recovery**: Up to 7 days ago

**Manual Backups** (Before Major Changes):
```bash
# Export database
pg_dump -h db.xxx.supabase.co -U postgres -d postgres -F c -f backup_$(date +%Y%m%d).dump

# Verify backup
pg_restore --list backup_20260214.dump
```

**Backup Testing** (Monthly):
1. Download latest backup
2. Restore to staging database
3. Verify data integrity
4. Test critical queries

---

### Database Cleanup

**Monthly Cleanup Tasks**:

**1. Delete Orphaned Files**
```sql
-- Find documents with no corresponding storage file
SELECT * FROM documents
WHERE NOT EXISTS (
  SELECT 1 FROM storage.objects
  WHERE name = documents.file_path
);

-- Delete orphaned records (after verification)
DELETE FROM documents WHERE id IN (...);
```

**2. Archive Old Jobs**
```sql
-- Move jobs older than 1 year to archive table
INSERT INTO job_postings_archive
SELECT * FROM job_postings
WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM job_postings
WHERE created_at < NOW() - INTERVAL '1 year';
```

**3. Vacuum Database**
```sql
-- Reclaim storage space
VACUUM FULL job_postings;
VACUUM FULL documents;

-- Update statistics
ANALYZE;
```

---

## Security Maintenance

### Security Checklist (Monthly)

**Dependency Vulnerabilities**:
```bash
# Check for vulnerable dependencies
npm audit

# Fix vulnerabilities
npm audit fix

# Force fix (may have breaking changes)
npm audit fix --force
```

**Access Review**:
- [ ] Review admin users (remove inactive)
- [ ] Review API keys (rotate if compromised)
- [ ] Review RLS policies (ensure no gaps)
- [ ] Review Edge Function secrets
- [ ] Review storage bucket policies

**Security Scanning**:
```bash
# Run OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://bdmarinerhub.com
```

**Rotate Secrets** (Every 90 Days):
1. Generate new Gemini API key
2. Generate new webhook secret
3. Update Supabase Edge Function secrets
4. Update environment variables
5. Test thoroughly before removing old keys

---

### SSL Certificate Renewal

**Hosting**: Automatic renewal (Vercel/Netlify/Let's Encrypt)

**Verification**:
```bash
# Check certificate expiry
echo | openssl s_client -connect bdmarinerhub.com:443 2>/dev/null | \
  openssl x509 -noout -dates
```

**Alert**: Set reminder 30 days before expiry (backup plan if auto-renewal fails)

---

## Documentation Updates

### Keeping Docs in Sync

**Trigger for Update**:
- New feature released
- API endpoint changed
- Database schema modified
- Bug fix that changes behavior
- User feedback about confusing docs

**Update Checklist**:
- [ ] Update relevant .md files
- [ ] Update "Last Updated" date
- [ ] Update screenshots (if UI changed)
- [ ] Update code examples
- [ ] Cross-reference related docs
- [ ] Test all links (no broken links)
- [ ] Review for clarity (have someone else read)

---

### Documentation Review Schedule

**Weekly**: Quick review of user-facing docs (FAQ, guides)
**Monthly**: Comprehensive review of all docs
**Quarterly**: Full documentation audit

---

## Support Metrics

### Key Metrics

| Metric | Target | Current |
|--------|--------|---------|
| **First Response Time** | <24 hours | TBD |
| **Resolution Time** | <3 days (avg) | TBD |
| **Customer Satisfaction (CSAT)** | >4.5/5 | TBD |
| **Support Tickets per 100 MAU** | <5 | TBD |
| **FAQ Deflection Rate** | >30% | TBD |

---

### Support Ticket Categories

**Track ticket types to identify patterns**:

| Category | % of Tickets | Trend |
|----------|--------------|-------|
| Login Issues | 25% | ↓ (improving) |
| Job Parsing Errors | 20% | → (stable) |
| Document Upload | 15% | ↑ (investigating) |
| Feature Requests | 20% | → |
| Bug Reports | 10% | ↓ |
| General Questions | 10% | → |

**Action**: If "Document Upload" tickets increasing, prioritize UI improvements

---

### Customer Satisfaction Survey

**Trigger**: After ticket resolved

**Survey**:
```
How satisfied are you with the support you received?

⭐⭐⭐⭐⭐ (1-5 stars)

What could we improve? [Optional text box]

[Submit]
```

**Follow-up** (if rating <3 stars):
```
Thank you for your feedback. We're sorry we didn't meet your expectations.

A team member will reach out within 24 hours to make this right.
```

---

## Escalation Procedures

### When to Escalate

**To Senior Developer**:
- Bug can't be reproduced
- Complex technical issue
- Database corruption suspected

**To Product Manager**:
- Feature request from multiple users
- Competitive threat (users switching to competitor)
- Revenue impact (potential churn)

**To Founder/CEO**:
- Legal issue (DMCA, privacy complaint)
- PR crisis (viral negative review)
- Major partner issue

---

## Crisis Communication

### Status Page (Future)

**URL**: status.bdmarinerhub.com

**Updates**:
- All systems operational ✅
- Investigating issue 🔍
- Partial outage ⚠️
- Major outage ❌

**Example Update**:
```
Feb 14, 2026 2:30 AM

⚠️ Investigating - We're currently investigating slow job loading times.
Some users may experience delays. Our team is working on a fix.

Updates will be posted here every 15 minutes.
```

---

### Social Media Crisis Response

**Template** (for negative viral post):
```
Hi [Name], we're sorry to hear about your experience.
This isn't the quality we strive for.

Please DM us with your account email so we can investigate
and make this right.

We're committed to serving the seafarer community better.
```

**Don't**:
- Get defensive
- Make excuses
- Ignore (respond within 2 hours)
- Argue publicly

---

## Team On-Call Rotation

**Schedule** (Future, when team grows):

| Week | Primary | Secondary |
|------|---------|-----------|
| Week 1 | Dev A | Dev B |
| Week 2 | Dev B | Dev C |
| Week 3 | Dev C | Dev A |

**On-Call Responsibilities**:
- Monitor alerts (24/7)
- Respond to SEV-0/SEV-1 incidents
- Triage support tickets
- Escalate if needed

**Compensation**: Flat fee + per-incident bonus

---

## Related Documentation
- **[Testing & QA](12-testing-qa.md)** - Quality assurance procedures
- **[Analytics & Metrics](13-analytics-metrics.md)** - Monitoring metrics
- **[Deployment Guide](../DEPLOYMENT_GUIDE.md)** - Deployment procedures
- **[Technical Architecture](02-technical-architecture.md)** - System architecture

---

**End of Documentation**

Thank you for reading the BD Mariner Hub documentation! If you have questions or suggestions, please contact the team.
