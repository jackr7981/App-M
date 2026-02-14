# App Store Optimization

**Path**: `docs/10-app-store-optimization.md`
**Last Updated**: February 14, 2026
**Related**: [Marketing & SEO](09-marketing-seo.md) | [Development Roadmap](11-development-roadmap.md) | [Product Vision](01-product-vision.md)

---

## Table of Contents
- [Overview](#overview)
- [Current Status (PWA)](#current-status-pwa)
- [Future Native Apps Strategy](#future-native-apps-strategy)
- [App Store Listing Optimization](#app-store-listing-optimization)
- [Play Store Listing Optimization](#play-store-listing-optimization)
- [App Screenshots & Media](#app-screenshots--media)
- [Ratings & Reviews Strategy](#ratings--reviews-strategy)
- [Launch Strategy](#launch-strategy)

---

## Overview

BD Mariner Hub is currently a **Progressive Web App (PWA)**, which means it's accessible via web browser without app store distribution. However, native mobile apps (iOS and Android) are planned for Q3 2026 to improve user experience, enable push notifications, and increase discoverability.

### Current vs Future

| Aspect | Current (PWA) | Future (Native Apps) |
|--------|---------------|----------------------|
| **Distribution** | Web URL | App Store, Play Store |
| **Installation** | Add to Home Screen | Download from store |
| **Discoverability** | SEO, Social Media | App Store Search |
| **Push Notifications** | Limited (web push) | Full support |
| **Offline Access** | ✅ Yes (Service Worker) | ✅ Yes |
| **Updates** | Automatic | User must update |
| **Development** | Single codebase (React) | React Native/Flutter |

---

## Current Status (PWA)

### PWA Features

**Installed as App**:
- Users can "Add to Home Screen" on mobile
- Appears like native app (no browser UI)
- Works offline with cached data
- Fast loading with Service Worker

**PWA Manifest** (`manifest.json`):
```json
{
  "name": "BD Mariner Hub",
  "short_name": "Mariner Hub",
  "description": "Your Complete Maritime Career Platform for Bangladeshi Seafarers",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1E40AF",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

### PWA Promotion Strategy

**Install Prompts**:

**Banner at Top of Page** (mobile only):
```
┌────────────────────────────────────┐
│ 📲 Install BD Mariner Hub          │
│ Get offline access and faster load │
│ [Install] [✕]                      │
└────────────────────────────────────┘
```

**Modal After First Job View**:
```
┌────────────────────────────────────┐
│         📱                         │
│  Add to Home Screen                │
│                                    │
│  • Access jobs offline             │
│  • Faster loading                  │
│  • No browser clutter              │
│                                    │
│  [Add to Home Screen] [Maybe Later]│
└────────────────────────────────────┘
```

---

### PWA SEO Benefits

**Advantages**:
- Indexed by Google (unlike native apps)
- Deep linking to specific jobs
- Shareable URLs
- Better for long-tail search traffic

**Example Deep Link**:
```
https://bdmarinerhub.com/jobs/550e8400/chief-engineer-abc-maritime

Shared on WhatsApp → Opens directly in browser → User sees job → Signs up
```

---

## Future Native Apps Strategy

### Timeline: Q3 2026

**Development Plan**:

**Month 1-2**: Technology Decision
- Evaluate React Native vs Flutter
- Prototype key screens
- Performance testing

**Month 3-4**: Development
- Convert React components
- Implement native features (push notifications)
- Testing on real devices

**Month 5**: Beta Testing
- TestFlight (iOS), Internal Testing (Android)
- Fix bugs based on feedback

**Month 6**: Launch
- Submit to App Store & Play Store
- Coordinate marketing campaign
- Monitor reviews and ratings

---

### Technology Choice

#### Option 1: React Native (Recommended)

**Pros**:
- Reuse existing React code (80% shared)
- Familiar JavaScript ecosystem
- Strong community support
- Expo for easier development

**Cons**:
- Some performance limitations
- Requires native modules for complex features

---

#### Option 2: Flutter

**Pros**:
- Better performance
- Beautiful UI out of the box
- Single codebase for iOS & Android

**Cons**:
- Need to rewrite everything in Dart
- Longer development time
- Smaller ecosystem than React Native

**Decision**: **React Native** (faster to market, code reuse)

---

## App Store Listing Optimization

### iOS App Store (Apple)

#### App Name
**Format**: [Brand Name] - [Primary Keyword]

**Option 1**: "BD Mariner Hub - Maritime Jobs"
**Option 2**: "BD Mariner Hub - Seafarer Jobs"
**Option 3**: "BD Mariner Hub - Jobs for Seafarers"

**Recommendation**: **"BD Mariner Hub - Maritime Jobs"**
- Character limit: 30 chars (we use 29)
- Includes primary keyword "Maritime Jobs"
- Brand name upfront

---

#### Subtitle (30 chars)
**Purpose**: Secondary keywords, value proposition

**Options**:
1. "Find Jobs, Manage Career" (27 chars) ✅
2. "All Maritime Jobs in One App" (30 chars)
3. "Jobs for Bangladeshi Seafarers" (31 chars) ❌ Too long

**Recommendation**: **"Find Jobs, Manage Career"**

---

#### App Description

**First 170 characters** (visible without "more"):
```
Find all maritime jobs in Bangladesh in one place. BD Mariner Hub aggregates jobs from 10+ sources, helping seafarers discover opportunities faster.
```

**Full Description** (up to 4,000 chars):
```
BD Mariner Hub - Your Complete Maritime Career Platform

FIND MARITIME JOBS FASTER
• 100+ new jobs every week from verified agencies
• AI-powered job parsing for consistent, easy-to-read listings
• All ranks: Master, Chief Engineer, Officers, Ratings
• Search by salary, joining date, agency, vessel type

MANAGE YOUR CAREER
• Upload and track documents (CDC, Passport, Certificates)
• Automatic expiry reminders for important documents
• Sea service history tracker
• Calculate promotion eligibility

AI CAREER ASSISTANT
• Ask questions about certificates, salaries, regulations
• Get personalized career guidance
• Maritime industry knowledge at your fingertips

CONNECT WITH COMMUNITY
• Alumni association from top maritime academies
• Discussion forum with fellow seafarers
• Share experiences and get advice

VERIFIED AGENCIES
• Only MLA-verified manning agents
• Direct contact information (phone, email, WhatsApp)
• Agency ratings and reviews (coming soon)

WHY SEAFARERS TRUST US
✓ 100% FREE - No subscription fees, ever
✓ COMPREHENSIVE - Jobs from Telegram, WhatsApp, Facebook in one app
✓ OFFLINE ACCESS - Works without internet
✓ BANGLADESH-FOCUSED - Built for Bangladeshi mariners

FEATURES
• Job board with smart filters
• Document management system
• Sea service calculator
• Medical center directory (DG-approved)
• Manning agent directory
• AI-powered career chat
• Community forum
• Alumni network

UPCOMING FEATURES
• Push notifications for job matches
• Resume builder
• Salary comparison tool
• Interview preparation guide

Join 20,000+ seafarers already using BD Mariner Hub!

SUPPORT
Email: support@bdmarinerhub.com
Website: www.bdmarinerhub.com
```

---

#### Keywords (100 chars max)

**Primary**: maritime, jobs, seafarer, bangladesh, mariner, ship, vessel

**Format**:
```
maritime jobs,seafarer jobs,bangladesh maritime,mariner,ship jobs,vessel,crew,officer,engineer,CDC
```

**Character Count**: 98 (within limit)

---

#### Screenshots (Required: 5-10)

**iPhone 6.7" Display** (1290 x 2796 px)

1. **Job Board**
   - Title: "Find All Maritime Jobs in One Place"
   - Shows: List of 5 jobs with rank, salary, agency
   - CTA: "100+ New Jobs Every Week"

2. **Job Detail**
   - Title: "Everything You Need to Know"
   - Shows: Full job details with 8 SHIPPED fields
   - CTA: "One-Tap Contact with Agencies"

3. **AI Career Assistant**
   - Title: "Get Expert Career Guidance"
   - Shows: Chat conversation about certificates
   - CTA: "Powered by Google Gemini AI"

4. **Document Manager**
   - Title: "Never Lose Your Documents"
   - Shows: List of uploaded documents with expiry dates
   - CTA: "Automatic Expiry Reminders"

5. **Sea Service Tracker**
   - Title: "Track Your Career Progress"
   - Shows: Sea service history with total time
   - CTA: "Calculate Promotion Eligibility"

6. **Community Forum**
   - Title: "Connect with Fellow Mariners"
   - Shows: Forum posts and discussions
   - CTA: "Join 20,000+ Seafarers"

---

#### App Preview Video (15-30 seconds)

**Script**:
```
0:00 - Logo animation: "BD Mariner Hub"
0:02 - Screen: Job board scrolling (15+ jobs)
       Text: "Find 100+ Maritime Jobs"

0:05 - Screen: Job detail with contact buttons
       Text: "One-Tap Contact with Agencies"

0:08 - Screen: AI chat answering question
       Text: "AI Career Assistant"

0:11 - Screen: Document manager with uploads
       Text: "Manage All Your Documents"

0:14 - Screen: Forum and community
       Text: "Connect with 20,000+ Seafarers"

0:17 - Logo + CTA: "Download Free Today"
```

**Background Music**: Upbeat, professional

---

#### Promotional Text (170 chars)

**Limited-time offer during launch**:
```
🎉 LAUNCH OFFER: Get early access to premium features FREE for life! Download now and join 20,000+ seafarers building their maritime careers.
```

---

## Play Store Listing Optimization

### Android (Google Play)

#### App Title (50 chars max)
**Format**: [Brand] - [Keywords]

**Recommendation**: **"BD Mariner Hub - Maritime Jobs for Seafarers"** (45 chars)

---

#### Short Description (80 chars max)
**Purpose**: One-line pitch

**Options**:
1. "Find all maritime jobs in Bangladesh. Free for seafarers." (60 chars) ✅
2. "Maritime job board + career tools for Bangladeshi seafarers" (61 chars) ✅
3. "Your complete maritime career platform. 100% free." (52 chars) ✅

**Recommendation**: **"Find all maritime jobs in Bangladesh. Free for seafarers."**

---

#### Long Description (4,000 chars max)

**Same as App Store description above** (repurposed)

---

#### Screenshots (2-8 required)

**Same screenshots as App Store**, but optimized for Android dimensions
- Pixel 6 Pro: 1440 x 3120 px

**Order** (most important first):
1. Job Board
2. Job Detail
3. AI Assistant
4. Document Manager
5. Community

---

#### Feature Graphic (1024 x 500 px)

**Design**:
```
┌────────────────────────────────────────────┐
│  [Ship Icon]  BD MARINER HUB               │
│  Find Maritime Jobs | Manage Career        │
│  [Screenshot: Job Board]  [Screenshot: AI] │
│  ★★★★★ 4.8 Rating | 20,000+ Users         │
└────────────────────────────────────────────┘
```

**Colors**: Navy blue (#1E40AF), white text, professional

---

#### Content Rating
**Target**: Everyone
**Reason**: No mature content, professional use

---

#### Category
**Primary**: Business
**Secondary**: Education (if allowed)

---

## App Screenshots & Media

### Design Principles

1. **Text Overlay**: Large, readable text explaining feature
2. **Clear Contrast**: Screenshots must be visible behind text
3. **Call to Action**: Each screenshot has benefit statement
4. **Consistent Branding**: Use brand colors (navy blue, white)
5. **Localization**: Create Bengali versions (future)

---

### Screenshot Templates

**Figma Template Structure**:
```
Frame: iPhone 6.7" (1290 x 2796 px)
├── Background Gradient (top to bottom)
│   ├── Color 1: #1E40AF (navy blue)
│   └── Color 2: #3B82F6 (lighter blue)
├── App Screenshot (centered, 80% width)
│   └── Shadow: Drop shadow for depth
├── Title Text (top, 48px bold)
│   └── "Find All Maritime Jobs"
├── Subtitle Text (below title, 32px)
│   └── "100+ New Jobs Every Week"
└── Device Frame (optional, iPhone mockup)
```

---

### Mockup Tools

**Recommended**:
1. **Figma** (free): Design screenshots
2. **Shotbot.io** (paid): Auto-generate app store screenshots
3. **App Mockup** (free): Device frames
4. **Canva** (free): Quick edits

---

## Ratings & Reviews Strategy

### Pre-Launch Strategy

**Beta Testers** (100 users):
- Recruit via Facebook groups
- TestFlight (iOS), Internal Testing (Android)
- Ask for honest feedback
- Fix critical bugs before launch

**Goal**: Launch with 50+ 5-star reviews

---

### Launch Strategy

**In-App Review Prompts**:

**Trigger Conditions** (must meet ALL):
1. User has been active for 7+ days
2. User viewed 10+ jobs
3. User uploaded at least 1 document
4. User hasn't been prompted before

**Prompt Text**:
```
┌────────────────────────────────────┐
│  Enjoying BD Mariner Hub?          │
│                                    │
│  Help us spread the word!          │
│  Your 5-star review helps fellow   │
│  seafarers discover the app.       │
│                                    │
│  [Rate Us ⭐⭐⭐⭐⭐] [Maybe Later]   │
└────────────────────────────────────┘
```

**Frequency**: Maximum once per 90 days

---

### Review Response Strategy

**5-Star Reviews**:
```
Thank you for your support! 🙏 We're glad BD Mariner Hub is helping you in your maritime career. If you have any suggestions, feel free to reach out to support@bdmarinerhub.com.

- BD Mariner Hub Team
```

**3-Star Reviews**:
```
Thank you for your feedback! We'd love to know how we can improve. Please email us at support@bdmarinerhub.com with details, and we'll work on it.

- BD Mariner Hub Team
```

**1-2 Star Reviews**:
```
We're sorry you had a bad experience. 😔 Your feedback is important to us. Please email support@bdmarinerhub.com with details about the issue, and we'll resolve it ASAP.

- BD Mariner Hub Team
```

---

### Encourage Positive Reviews

**In-App Messaging** (after successful job contact):
```
✅ Great! You contacted ABC Maritime.

Did you know? BD Mariner Hub is 100% free and built by mariners for mariners.

If you're finding it helpful, please leave us a 5-star review. It helps fellow seafarers discover the app!

[Leave Review] [Not Now]
```

---

## Launch Strategy

### Pre-Launch (Month -2 to -1)

**Checklist**:
- [ ] App development complete
- [ ] Beta testing with 100 users
- [ ] Fix all critical bugs
- [ ] Create app store assets (screenshots, videos, descriptions)
- [ ] Set up analytics (Firebase, Mixpanel)
- [ ] Prepare press release
- [ ] Create launch landing page

---

### Launch Week

**Day 1: Soft Launch**
- Submit to App Store & Play Store
- Approval time: 1-3 days (App Store), 1-7 days (Play Store)
- Limited promotion (email list only)

**Day 2-3: Approval & Monitoring**
- Monitor crash reports
- Check analytics for issues
- Respond to early reviews

**Day 4: Public Announcement**
- Press release to maritime media
- Social media announcement
- Email to 10,000 subscribers
- Facebook ads ($500 budget)

**Day 5-7: Amplification**
- Partner with influencers (5 maritime YouTubers)
- Post in Facebook groups
- LinkedIn announcement
- WhatsApp broadcast

---

### Post-Launch (Week 2-4)

**Goals**:
- 10,000 downloads (Month 1)
- 4.5+ star rating
- <1% crash rate
- Featured in "New Apps We Love" (aspirational)

**Tactics**:
- Daily social media posts
- User testimonials
- App Store Optimization (test different screenshots)
- Monitor and respond to all reviews
- Weekly blog post about new features

---

### App Store Feature Request

**Email to Apple/Google Editorial Team**:

**Subject**: App Submission - BD Mariner Hub (Maritime Jobs Platform)

**Body**:
```
Dear App Review Team,

We'd like to submit BD Mariner Hub for consideration in "New Apps We Love" or regional featured apps (Bangladesh).

About the app:
BD Mariner Hub is the first comprehensive maritime career platform for Bangladeshi seafarers. It aggregates job postings from 10+ sources, uses AI to standardize job information, and provides career management tools.

Why it's special:
- Solves a real problem: Seafarers currently check 10+ groups daily for jobs
- AI-powered: Uses Google Gemini to parse unstructured job text
- Social impact: Helps 50,000+ seafarers find better opportunities
- 100% free: No ads, no subscription, built as a public service

We believe this app showcases how technology can improve lives in the maritime industry.

Thank you for considering!

Best regards,
[Name]
BD Mariner Hub Team
support@bdmarinerhub.com
```

---

## ASO Metrics & Tracking

### Key Metrics

| Metric | Target (Month 1) | Target (Month 6) |
|--------|------------------|------------------|
| **Downloads** | 10,000 | 100,000 |
| **Daily Active Users (DAU)** | 2,000 | 20,000 |
| **Rating** | 4.5+ stars | 4.7+ stars |
| **Reviews** | 500 | 5,000 |
| **Crash-Free Rate** | >99% | >99.5% |
| **App Store Search Ranking** | Top 10 for "maritime jobs" | Top 3 |

---

### A/B Testing

**Test Variables**:
1. **App Icon** (3 variations)
   - Ship wheel icon
   - Anchor icon
   - Abstract wave icon

2. **Screenshots** (2 sets)
   - Set A: Focus on job board
   - Set B: Focus on AI assistant

3. **App Title** (2 variations)
   - "BD Mariner Hub - Maritime Jobs"
   - "BD Mariner Hub - Jobs for Seafarers"

**Tools**:
- Google Play Console (built-in A/B testing)
- App Store Connect (requires 3rd party tools)
- SplitMetrics, StoreMaven (paid services)

---

## Related Documentation
- **[Marketing & SEO](09-marketing-seo.md)** - Web marketing strategy
- **[Development Roadmap](11-development-roadmap.md)** - Native app timeline
- **[Product Vision](01-product-vision.md)** - Target users
- **[Analytics & Metrics](13-analytics-metrics.md)** - Success measurement

---

**Next**: [Development Roadmap](11-development-roadmap.md)
