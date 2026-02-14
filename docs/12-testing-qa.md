# Testing & QA

**Path**: `docs/12-testing-qa.md`
**Last Updated**: February 14, 2026
**Related**: [Development Roadmap](11-development-roadmap.md) | [Technical Architecture](02-technical-architecture.md) | [Deployment Guide](../DEPLOYMENT_GUIDE.md)

---

## Table of Contents
- [Testing Strategy](#testing-strategy)
- [Manual Testing](#manual-testing)
- [Automated Testing](#automated-testing)
- [Integration Testing](#integration-testing)
- [Performance Testing](#performance-testing)
- [Security Testing](#security-testing)
- [User Acceptance Testing](#user-acceptance-testing)
- [Bug Reporting & Tracking](#bug-reporting--tracking)
- [QA Checklist](#qa-checklist)

---

## Testing Strategy

### Testing Pyramid

```
         /\
        /  \  E2E Tests (5%)
       /____\
      /      \
     / Integration Tests (20%)
    /__________\
   /            \
  /  Unit Tests (75%)
 /________________\
```

**Principle**: More unit tests, fewer E2E tests

### Current Testing Status

| Test Type | Coverage | Status |
|-----------|----------|--------|
| **Unit Tests** | 0% | ❌ Not Implemented |
| **Integration Tests** | 0% | ❌ Not Implemented |
| **E2E Tests** | 0% | ❌ Not Implemented |
| **Manual Tests** | 100% | ✅ Active |
| **Performance Tests** | Partial | 🔄 Ongoing |

**Target** (by Q2 2026):
- Unit Tests: 80% coverage
- Integration Tests: 60% coverage
- E2E Tests: Critical flows only

---

## Manual Testing

### Testing Environments

**1. Local Development**
- URL: http://localhost:5173
- Database: Supabase (dev project)
- Purpose: Feature development, quick testing

**2. Staging**
- URL: https://staging.bdmarinerhub.com
- Database: Supabase (staging project)
- Purpose: Pre-production testing, QA

**3. Production**
- URL: https://bdmarinerhub.com
- Database: Supabase (production project)
- Purpose: Live app, real users

---

### Manual Test Cases

#### 1. User Authentication

**Test Case: Sign Up**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to app | Sign-up form visible |
| 2 | Enter email: test@example.com | Email field accepts input |
| 3 | Enter password: Test1234! | Password field masked |
| 4 | Click "Sign Up" | Loading indicator appears |
| 5 | Wait 2 seconds | Success message: "Account created" |
| 6 | Check email inbox | Verification email received |
| 7 | Click verification link | Redirected to app, logged in |

**Pass Criteria**: User can sign up and verify email

---

**Test Case: Sign In**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to app | Sign-in form visible |
| 2 | Enter email: test@example.com | Email field accepts input |
| 3 | Enter password: Test1234! | Password field masked |
| 4 | Click "Sign In" | Loading indicator appears |
| 5 | Wait 1 second | Redirected to dashboard |
| 6 | Check user menu | Email displayed correctly |

**Pass Criteria**: User can sign in with valid credentials

---

**Test Case: Sign Out**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click user menu | Dropdown menu opens |
| 2 | Click "Sign Out" | Loading indicator appears |
| 3 | Wait 1 second | Redirected to sign-in page |
| 4 | Try to access dashboard | Redirected to sign-in (not logged in) |

**Pass Criteria**: User successfully signed out

---

#### 2. Job Board

**Test Case: View Jobs**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Jobs tab | Job list loads |
| 2 | Verify job cards | At least 1 job visible |
| 3 | Check job fields | Rank, salary, agency displayed |
| 4 | Click job card | Job detail page opens |
| 5 | Verify all 8 fields | All SHIPPED fields visible (or N/A) |
| 6 | Click "Back" button | Returns to job list |

**Pass Criteria**: Jobs load and display correctly

---

**Test Case: Filter Jobs**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Filter" button | Filter modal opens |
| 2 | Select rank: Chief Engineer | Checkbox checked |
| 3 | Click "Apply" | Modal closes |
| 4 | Verify job list | Only Chief Engineer jobs shown |
| 5 | Check job count | Count updates (e.g., "12 jobs found") |
| 6 | Click "Clear Filters" | All jobs shown again |

**Pass Criteria**: Filters work correctly

---

**Test Case: Contact Agency**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open job detail | Contact buttons visible |
| 2 | Click "Call" button | Phone dialer opens with number |
| 3 | Go back to job | Still on job page |
| 4 | Click "Email" button | Email app opens with template |
| 5 | Verify email content | To, Subject, Body pre-filled |

**Pass Criteria**: Contact buttons work correctly

---

#### 3. AI Chat Assistant

**Test Case: Send Message**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Chat tab | Chat interface visible |
| 2 | Type: "What is CDC?" | Text appears in input field |
| 3 | Click "Send" or press Enter | Message appears in chat |
| 4 | Wait 2-3 seconds | Typing indicator shows |
| 5 | AI responds | Response appears in chat |
| 6 | Verify response quality | Relevant answer about CDC |

**Pass Criteria**: AI responds correctly to questions

---

#### 4. Document Management

**Test Case: Upload Document**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Documents tab | Document list (may be empty) |
| 2 | Click "Add Document" | Upload form opens |
| 3 | Select type: CDC | Dropdown shows CDC |
| 4 | Enter number: BD123456 | Number field accepts input |
| 5 | Select expiry: 31 Dec 2027 | Date picker works |
| 6 | Click "Choose File" | File picker opens |
| 7 | Select PDF file (2 MB) | File name shown |
| 8 | Click "Upload" | Progress bar appears |
| 9 | Wait for upload | Success message shown |
| 10 | Check document list | New document appears |

**Pass Criteria**: Document uploads successfully

---

**Test Case: Download Document**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Documents tab | Document list visible |
| 2 | Find uploaded CDC | Document card shown |
| 3 | Click "Download" button | File downloads |
| 4 | Open downloaded file | File opens correctly in PDF viewer |

**Pass Criteria**: Document downloads correctly

---

#### 5. Sea Service Tracker

**Test Case: Add Sea Service**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Sea Service tab | Service list (may be empty) |
| 2 | Click "Add Service" | Form opens |
| 3 | Enter vessel: MV Pacific Star | Text field accepts input |
| 4 | Select type: Bulk Carrier | Dropdown works |
| 5 | Enter rank: Third Engineer | Text field accepts input |
| 6 | Select sign-on: 15 Jan 2025 | Date picker works |
| 7 | Select sign-off: 20 Jul 2025 | Date picker works |
| 8 | Verify duration calculation | Shows "186 days" automatically |
| 9 | Click "Save" | Success message shown |
| 10 | Check service list | New entry appears |

**Pass Criteria**: Sea service added correctly

---

#### 6. Mobile Responsiveness

**Test Case: Mobile View**

| Device | Screen Size | Test |
|--------|-------------|------|
| **iPhone 14 Pro** | 393 x 852 | All tabs accessible, no horizontal scroll |
| **Samsung Galaxy S21** | 360 x 800 | Buttons tap-friendly (min 44px) |
| **iPad** | 768 x 1024 | Tablet layout responsive |

**Tools**:
- Chrome DevTools (Device Toolbar)
- BrowserStack (real devices)

---

### Browser Compatibility

**Supported Browsers**:

| Browser | Version | Status |
|---------|---------|--------|
| **Chrome** | 100+ | ✅ Fully Supported |
| **Firefox** | 95+ | ✅ Fully Supported |
| **Safari** | 15+ | ✅ Fully Supported |
| **Edge** | 100+ | ✅ Fully Supported |
| **Opera** | 85+ | ⚠️ Partially Tested |

**Testing Priority**: Chrome > Safari > Firefox > Edge

---

## Automated Testing

### Unit Testing (Future)

**Framework**: Vitest (fast, Vite-native)

**Example Test**:
```typescript
import { describe, it, expect } from 'vitest';
import { calculateSeaTime } from './seaService';

describe('calculateSeaTime', () => {
  it('calculates correct duration in days', () => {
    const signOn = '2025-01-15';
    const signOff = '2025-07-20';
    const result = calculateSeaTime(signOn, signOff);
    expect(result).toBe(186);
  });

  it('handles same-day sign-on/off', () => {
    const signOn = '2025-01-15';
    const signOff = '2025-01-15';
    const result = calculateSeaTime(signOn, signOff);
    expect(result).toBe(0);
  });
});
```

**Run Tests**:
```bash
npm run test
npm run test:coverage
```

---

### Integration Testing (Future)

**Framework**: React Testing Library

**Example Test**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { JobBoard } from './JobBoard';

describe('JobBoard', () => {
  it('renders job list', async () => {
    render(<JobBoard />);

    // Wait for jobs to load
    const jobCard = await screen.findByText(/Chief Engineer/i);
    expect(jobCard).toBeInTheDocument();
  });

  it('filters jobs by rank', async () => {
    render(<JobBoard />);

    // Click filter button
    fireEvent.click(screen.getByText(/Filter/i));

    // Select rank
    fireEvent.click(screen.getByLabelText(/Chief Engineer/i));

    // Apply filter
    fireEvent.click(screen.getByText(/Apply/i));

    // Verify filtered results
    const jobs = await screen.findAllByRole('article');
    jobs.forEach(job => {
      expect(job).toHaveTextContent(/Chief Engineer/i);
    });
  });
});
```

---

### E2E Testing (Future)

**Framework**: Playwright or Cypress

**Example Test** (Playwright):
```typescript
import { test, expect } from '@playwright/test';

test('user can sign up and view jobs', async ({ page }) => {
  // Navigate to app
  await page.goto('https://bdmarinerhub.com');

  // Sign up
  await page.click('text=Sign Up');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'Test1234!');
  await page.click('button:has-text("Create Account")');

  // Wait for dashboard
  await expect(page).toHaveURL(/dashboard/);

  // Navigate to jobs
  await page.click('text=Jobs');

  // Verify jobs loaded
  await expect(page.locator('article')).toHaveCount(10, { timeout: 5000 });
});
```

**Run E2E Tests**:
```bash
npx playwright test
npx playwright test --headed # See browser
npx playwright test --debug # Debug mode
```

---

## Integration Testing

### Telegram Job Parser Testing

**Reference**: See `/home/user/App-M/TELEGRAM_JOB_PARSER_TESTING.md`

**Test Scenarios**:

1. **Complete Job Posting** (all 8 fields)
   ```
   RANK: Chief Engineer
   SALARY: $8,500/month
   JOINING: 15 March 2026
   AGENCY: ABC Maritime
   MLA: MLA-002
   ADDRESS: 123 Port Rd, Chittagong
   MOBILE: +880 1711-123456
   EMAIL: jobs@abc.com
   ```
   **Expected**: All fields parsed correctly

2. **Incomplete Job Posting** (missing fields)
   ```
   Chief Engineer needed
   Salary: $8500
   Urgent joining
   ```
   **Expected**: Rank and salary parsed, others N/A

3. **Unstructured Format**
   ```
   Urgent! CE required for Supramax. 8500 USD. Join ASAP.
   Contact ABC Shipping +880170000000
   ```
   **Expected**: AI extracts rank, salary, mobile, agency

4. **Duplicate Detection**
   - Send same message twice
   **Expected**: Second message skipped

---

### Gemini AI Testing

**Test**: Parsing Accuracy

```bash
curl -X POST https://xxx.supabase.co/functions/v1/job-parser \
  -H "Authorization: Bearer xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "raw_content": "RANK: Master\nSALARY: $9500\nJOINING: Urgent"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "rank": "Master",
    "salary": "$9500",
    "joining_date": "Urgent",
    "agency": "N/A",
    "mla_number": "N/A",
    "address": "N/A",
    "mobile": "N/A",
    "email": "N/A"
  }
}
```

---

### Supabase Integration Testing

**Test**: Database Connection

```typescript
// Test database query
const { data, error } = await supabase
  .from('job_postings')
  .select('*')
  .limit(1);

console.log('Database test:', error ? 'FAILED' : 'PASSED');
```

**Test**: Real-time Subscription

```typescript
// Test realtime updates
const channel = supabase
  .channel('test-channel')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'job_postings' },
    (payload) => console.log('Realtime test: PASSED', payload)
  )
  .subscribe();

// Insert test job
await supabase.from('job_postings').insert({ /* ... */ });

// Should trigger realtime listener
```

---

## Performance Testing

### Metrics to Track

| Metric | Target | Current |
|--------|--------|---------|
| **First Contentful Paint (FCP)** | <1.5s | 1.2s ✅ |
| **Largest Contentful Paint (LCP)** | <2.5s | 2.1s ✅ |
| **Time to Interactive (TTI)** | <3.5s | 3.0s ✅ |
| **Total Bundle Size** | <500KB | 320KB ✅ |
| **Job Listing Query Time** | <500ms | 250ms ✅ |
| **Job Parsing Time (AI)** | <3s | 1.8s ✅ |

---

### Lighthouse Testing

**Tool**: Chrome DevTools > Lighthouse

**Run Audit**:
1. Open Chrome DevTools (F12)
2. Go to "Lighthouse" tab
3. Select: Performance, Accessibility, Best Practices, SEO
4. Click "Analyze page load"

**Target Scores**:
- Performance: >90
- Accessibility: >95
- Best Practices: >90
- SEO: >95

---

### Load Testing

**Tool**: k6 (https://k6.io)

**Scenario**: 100 concurrent users browsing jobs

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 100, // 100 virtual users
  duration: '30s',
};

export default function () {
  const res = http.get('https://bdmarinerhub.com/api/jobs');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

**Run Load Test**:
```bash
k6 run loadtest.js
```

**Expected**: <500ms response time, 0% error rate

---

## Security Testing

### Manual Security Checks

**1. SQL Injection Test**

**Test**: Try to inject SQL in search
- Input: `' OR 1=1 --`
- Expected: No SQL error, query returns 0 results

**2. XSS (Cross-Site Scripting) Test**

**Test**: Try to inject script in profile
- Input name: `<script>alert('XSS')</script>`
- Expected: Script escaped, shows as plain text

**3. Authentication Bypass Test**

**Test**: Access protected routes without login
- URL: `/admin` (without logging in)
- Expected: Redirect to sign-in page

**4. RLS (Row-Level Security) Test**

**Test**: Try to access other user's documents
- SQL: `SELECT * FROM documents WHERE user_id != 'current_user_id'`
- Expected: Query returns 0 rows (RLS blocks access)

---

### Automated Security Scanning

**Tool**: OWASP ZAP (Zed Attack Proxy)

**Run Scan**:
```bash
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://bdmarinerhub.com
```

**Check For**:
- SQL injection
- XSS vulnerabilities
- Insecure headers
- Outdated dependencies

---

### Dependency Vulnerability Scanning

**Tool**: npm audit

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Force fix (breaking changes)
npm audit fix --force
```

---

## User Acceptance Testing

### Beta Testing Program

**Goal**: 100 beta testers before public launch

**Recruitment**:
- Post in Facebook maritime groups
- Email maritime academy students
- Reach out to seafarer connections

**Feedback Collection**:
- In-app feedback form
- Google Forms survey
- WhatsApp group for testers

**Survey Questions**:
1. How easy was it to sign up? (1-5)
2. Did you find relevant jobs? (Yes/No)
3. How accurate was the AI job parsing? (1-5)
4. What features are missing?
5. Would you recommend to fellow seafarers? (Yes/No)

---

### Usability Testing

**Task-Based Testing**:

**Task 1**: Find a Chief Engineer job
- Success: User finds job within 1 minute
- Difficulty: Easy/Medium/Hard

**Task 2**: Upload your CDC
- Success: User uploads document within 2 minutes
- Difficulty: Easy/Medium/Hard

**Task 3**: Ask AI about salary
- Success: User gets relevant answer
- Difficulty: Easy/Medium/Hard

**Observation**: Watch users complete tasks, note pain points

---

## Bug Reporting & Tracking

### Bug Report Template

```markdown
**Title**: [Component] Brief description

**Severity**: Critical / High / Medium / Low

**Steps to Reproduce**:
1. Go to Jobs tab
2. Click filter
3. Select "Chief Engineer"
4. Click apply

**Expected Result**: Jobs filtered correctly

**Actual Result**: All jobs still shown (filter not applied)

**Environment**:
- Browser: Chrome 120
- OS: Windows 11
- Device: Desktop
- User: test@example.com

**Screenshots**: [Attach screenshot]

**Console Errors**: [Paste error messages]
```

---

### Bug Severity Levels

| Severity | Definition | SLA |
|----------|------------|-----|
| **Critical** | App unusable, data loss | Fix within 24h |
| **High** | Core feature broken | Fix within 3 days |
| **Medium** | Feature partially broken | Fix within 1 week |
| **Low** | Minor issue, cosmetic bug | Fix in next release |

---

### Bug Tracking Tools

**Current**: GitHub Issues
**Future**: Linear, Jira, or ClickUp

**Issue Labels**:
- `bug`: Something isn't working
- `critical`: Must fix ASAP
- `enhancement`: New feature or improvement
- `documentation`: Documentation updates
- `good-first-issue`: Good for new contributors

---

## QA Checklist

### Pre-Release Checklist

**Code Quality**:
- [ ] No console.log() statements in production
- [ ] No commented-out code
- [ ] All TypeScript errors resolved
- [ ] ESLint warnings addressed
- [ ] Code reviewed by peer

**Functionality**:
- [ ] All features working as expected
- [ ] No broken links
- [ ] Forms validate correctly
- [ ] Error messages user-friendly
- [ ] Loading states implemented

**Performance**:
- [ ] Lighthouse score >90
- [ ] Bundle size <500KB
- [ ] Images optimized (WebP format)
- [ ] Lazy loading implemented
- [ ] No memory leaks

**Security**:
- [ ] API keys not exposed in frontend
- [ ] RLS policies tested
- [ ] Input sanitization implemented
- [ ] HTTPS enforced
- [ ] Dependency vulnerabilities fixed

**Mobile**:
- [ ] Responsive on all screen sizes
- [ ] Touch targets >44px
- [ ] No horizontal scroll
- [ ] PWA installable
- [ ] Offline mode works

**Browser Compatibility**:
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)

**Deployment**:
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Edge Functions deployed
- [ ] Monitoring enabled
- [ ] Backup verified

---

### Post-Release Monitoring

**First 24 Hours**:
- [ ] Monitor error rates (target: <0.1%)
- [ ] Check performance metrics
- [ ] Review user feedback
- [ ] Fix critical bugs immediately

**First Week**:
- [ ] Analyze user behavior (analytics)
- [ ] Collect user feedback (survey)
- [ ] Plan hotfixes if needed
- [ ] Update documentation

---

## Related Documentation
- **[Development Roadmap](11-development-roadmap.md)** - Feature timeline
- **[Deployment Guide](../DEPLOYMENT_GUIDE.md)** - Production deployment
- **[Telegram Job Parser Testing](../TELEGRAM_JOB_PARSER_TESTING.md)** - Integration testing
- **[Technical Architecture](02-technical-architecture.md)** - System architecture

---

**Next**: [Analytics & Metrics](13-analytics-metrics.md)
