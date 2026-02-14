# Features

**Path**: `docs/03-features.md`
**Last Updated**: February 14, 2026
**Related**: [Product Vision](01-product-vision.md) | [Development Roadmap](11-development-roadmap.md) | [User Flows](08-user-flows.md)

---

## Table of Contents
- [Current Features (v1.0)](#current-features-v10)
- [8 Standardized Job Fields](#8-standardized-job-fields)
- [Planned Features (v1.1+)](#planned-features-v11)
- [Feature Priority Matrix](#feature-priority-matrix)

---

## Current Features (v1.0)

### 1. Job Board

**Status**: ✅ Completed
**Description**: Automated maritime job aggregation and display system

**Key Capabilities**:
- Real-time job posting ingestion from Telegram groups
- AI-powered field extraction (8 standardized fields)
- Duplicate detection and prevention
- Job status tracking (active/filled/expired/archived)
- Clean, mobile-optimized job listing view
- Basic filtering by status

**User Interface**:
- Card-based job listings
- Expandable job details
- Quick access to agency contact information
- Status badges (Active, Filled, Expired)
- Timestamp display (relative time, e.g., "2 hours ago")

**Technical Implementation**:
- Telegram Bot API webhook integration
- Supabase Edge Function (`telegram-webhook`)
- Gemini AI parsing (`job-parser`)
- PostgreSQL `job_postings` table
- Real-time updates via Supabase Realtime

**Metrics Tracked**:
- Total jobs posted
- Jobs per source group
- Parsing accuracy
- Average fields extracted per job

---

### 2. AI Career Assistant

**Status**: ✅ Completed
**Description**: Gemini-powered chatbot for maritime career guidance

**Key Capabilities**:
- Natural language conversation
- Maritime career advice
- Job search guidance
- Document requirements information
- Sea service calculations
- Promotion eligibility checks

**User Interface**:
- Chat message bubbles
- Real-time typing indicators
- Conversation history
- Clear chat option
- Usage time tracking

**Technical Implementation**:
- Google Gemini 2.5 Flash API
- Chat messages stored in `chat_messages` table
- Usage minutes tracked in `profiles.total_usage_minutes`
- Context-aware responses

**Conversation Topics**:
- Certificate requirements for ranks
- Salary expectations by position
- Interview preparation tips
- Sea service requirements
- Documentation checklist

---

### 3. Document Management

**Status**: ✅ Completed
**Description**: Secure storage and organization of seafarer documents

**Key Capabilities**:
- Upload multiple document types
- Expiry date tracking
- Document categorization
- Quick document access
- Secure file storage

**Document Types Supported**:
- CDC (Continuous Discharge Certificate)
- Passport
- Medical Certificates
- Licenses (STCW, COC, COE)
- Endorsements
- Training Certificates
- Vaccinations
- Flag State Documents

**User Interface**:
- Document cards with icons
- Upload button with file picker
- Expiry warnings (red for expired, yellow for expiring soon)
- Download/view options
- Delete functionality

**Technical Implementation**:
- Supabase Storage bucket (`documents`)
- PostgreSQL `documents` table
- File type validation (PDF, JPG, PNG)
- Max file size: 10 MB per document

---

### 4. Sea Service Tracker

**Status**: ✅ Completed
**Description**: Record and calculate sea time for promotions

**Key Capabilities**:
- Add sea service records
- Track vessel details
- Calculate total sea time
- Rank-specific time tracking
- Automatic duration calculation

**Data Captured**:
- Vessel name and type
- Vessel flag
- Rank held
- Sign-on and sign-off dates
- Duration (auto-calculated)
- Manning agency

**User Interface**:
- Timeline view of sea service
- Add new service button
- Edit/delete existing records
- Total time summary by rank
- Exportable history (future)

**Technical Implementation**:
- JSONB field in `profiles.sea_service_history`
- Array of service objects
- Date calculations in TypeScript
- Validation for overlapping periods

**Calculations**:
- Total sea time (days/months/years)
- Time in current rank
- Time in each previous rank
- Eligibility for next rank (future)

---

### 5. Medical Centers Directory

**Status**: ✅ Completed
**Description**: Directory of DG-approved medical centers for pre-joining medicals

**Key Capabilities**:
- Search by city/name
- View center details
- Contact information
- DG approval verification
- Availability status

**Information Displayed**:
- Center name
- Full address
- Phone number
- Operating hours
- Services offered
- DG approval status

**User Interface**:
- Searchable list
- Filter by city (Dhaka, Chittagong, Khulna)
- Map view (future)
- One-tap call/email

**Technical Implementation**:
- PostgreSQL `medical_centers` table
- Pre-populated with DG-approved centers
- OCR-extracted data from authorized doctors list
- Search using SQL LIKE queries

---

### 6. Manning Agents Directory

**Status**: ✅ Completed
**Description**: Registry of verified manning agencies with MLA numbers

**Key Capabilities**:
- Search agencies by name
- Filter by MLA number
- View contact details
- Email and call directly
- Verification status badges

**Information Displayed**:
- Agency name
- MLA number (Manning License Agreement)
- Full address
- Contact numbers
- Email addresses
- Verification status (Verified/Unverified)

**User Interface**:
- Card-based layout
- Search bar with live filtering
- Quick contact buttons (call, email, WhatsApp)
- Verified badge for approved agencies

**Technical Implementation**:
- PostgreSQL `manning_agents` table
- MLA number validation
- Real-time search
- Admin panel for agency approval

---

### 7. Alumni Association

**Status**: ✅ Completed
**Description**: Connect with fellow mariners from maritime academies

**Key Capabilities**:
- View alumni members
- Search by academy/batch
- Contact fellow alumni
- Share experiences
- Networking opportunities

**Information Displayed**:
- Member name
- Academy/batch
- Current rank
- Contact preferences
- Profile photo (optional)

**User Interface**:
- Member directory
- Filter by academy (BMMTA, MAMI, etc.)
- Filter by batch year
- Profile cards

**Technical Implementation**:
- Extended `profiles` table with academy/batch fields
- Search and filter queries
- Privacy settings for contact visibility

---

### 8. Community Forum

**Status**: ✅ Completed
**Description**: Discussion board for seafarers to share knowledge and experiences

**Key Capabilities**:
- Create discussion topics
- Reply to posts
- Upvote helpful content
- Report inappropriate posts
- Topic categories

**Categories**:
- General Discussion
- Job Market Insights
- Interview Experiences
- Life at Sea
- Technical Discussions
- Regulations & Documentation
- Off-Topic

**User Interface**:
- Thread list view
- Post creation modal
- Nested reply system
- Timestamp and author display
- Upvote/downvote buttons

**Technical Implementation**:
- PostgreSQL `forum_posts` table
- Foreign key to `profiles` for authors
- Upvote counter
- Moderation flags
- RLS policies for content visibility

---

### 9. Admin Dashboard

**Status**: ✅ Completed
**Description**: Administrative panel for managing app content

**Key Capabilities**:
- View user statistics
- Manage job postings (approve/reject/archive)
- Moderate forum posts
- Verify manning agencies
- View system metrics
- Manage document storage

**Admin Features**:
- User count and activity metrics
- Recent job submissions
- Flagged forum content
- Storage usage monitoring
- Database query interface

**Access Control**:
- Role-based access (admin users only)
- Secure login required
- Audit log of admin actions (future)

**Technical Implementation**:
- Protected routes (admin role check)
- RLS policies with admin bypass
- Supabase Dashboard integration
- Admin-specific UI components

---

## 8 Standardized Job Fields

The AI parser extracts these specific fields from unstructured job postings:

### 1. RANK
- **Description**: Position/role on vessel
- **Examples**: Master, Chief Engineer, 2nd Officer, Able Seaman, Oiler
- **Parsing Logic**: Keywords like "rank", "position", "officer", "rating"
- **Required**: ✅ Yes

### 2. SALARY
- **Description**: Monthly compensation (USD/month)
- **Examples**: $8,000/month, USD 5000, 6000-7000
- **Parsing Logic**: Currency symbols, "salary", "wages", numeric values
- **Required**: ⚠️ Recommended

### 3. JOINING DATE
- **Description**: Embarkation date or availability period
- **Examples**: ASAP, March 15 2026, Mid-April, Ready
- **Parsing Logic**: Date patterns, "joining", "embark", "available"
- **Required**: ⚠️ Recommended

### 4. AGENCY
- **Description**: Manning/recruiting agency name
- **Examples**: ABC Maritime Services, XYZ Crew Management
- **Parsing Logic**: Company keywords, "agency", "manager", sender info
- **Required**: ✅ Yes

### 5. MLA NUMBER
- **Description**: Manning License Agreement number (BD government-issued)
- **Examples**: MLA-123, License No: 456
- **Parsing Logic**: "MLA", "license", numeric patterns
- **Required**: ⚠️ Recommended

### 6. THEIR ADDRESS
- **Description**: Agency physical address
- **Examples**: House 12, Road 5, Dhanmondi, Dhaka
- **Parsing Logic**: Address keywords, location patterns
- **Required**: ❌ Optional

### 7. MOBILE NUMBER
- **Description**: Agency contact number
- **Examples**: +880 1711-123456, 01911-234567
- **Parsing Logic**: Phone number patterns, "mobile", "call", "contact"
- **Required**: ✅ Yes

### 8. AGENCY EMAIL ADDRESS
- **Description**: Agency email for applications
- **Examples**: jobs@agency.com, recruitment@maritime.bd
- **Parsing Logic**: Email regex pattern
- **Required**: ⚠️ Recommended

**Parsing Confidence**: The AI returns a confidence score (0.00-1.00) for each extraction. Jobs with <0.70 confidence may require manual review.

---

## Planned Features (v1.1+)

### Advanced Job Filtering
**Priority**: High | **Timeline**: Q2 2026

- Filter by rank category (Deck, Engine, Ratings)
- Salary range slider
- Joining date range
- Agency filter (multi-select)
- Vessel type (Tanker, Bulk Carrier, Container)
- Flag preference
- Save filter presets

### Push Notifications
**Priority**: High | **Timeline**: Q2 2026

- New jobs matching user profile
- Document expiry reminders
- Forum reply notifications
- Agency responses
- Customizable notification preferences

### Saved Jobs / Bookmarks
**Priority**: Medium | **Timeline**: Q2 2026

- Bookmark interesting jobs
- Saved jobs collection
- Apply later functionality
- Notes on saved jobs
- Share saved jobs

### User Profiles & Preferences
**Priority**: High | **Timeline**: Q2 2026

- Comprehensive profile creation
- Rank preferences
- Salary expectations
- Available date
- Preferred vessel types
- CV/Resume upload
- Profile completeness score

### Job Matching Algorithm
**Priority**: Medium | **Timeline**: Q3 2026

- AI-powered job recommendations
- Match score calculation
- "Jobs for You" personalized feed
- Email digest of matched jobs
- Smart notifications

### In-App Messaging
**Priority**: Medium | **Timeline**: Q3 2026

- Direct messaging with agencies
- Message threads
- Read receipts
- File attachments
- Archived conversations

### Resume Builder
**Priority**: Low | **Timeline**: Q4 2026

- Template-based CV generation
- Export to PDF
- Multiple formats (Mariner, Standard)
- Pre-filled from profile data
- Cover letter templates

### WhatsApp Integration
**Priority**: Medium | **Timeline**: Q4 2026

- Monitor WhatsApp groups (via WhatsApp Business API)
- Broader job source coverage
- Unified inbox for all sources

### Mobile Apps (iOS/Android)
**Priority**: High | **Timeline**: Q3 2026

- Native mobile applications
- React Native or Flutter
- App Store and Play Store listings
- Push notifications support
- Better performance

### Agency Dashboard
**Priority**: Low | **Timeline**: Q4 2026

- Direct job posting interface
- Applicant tracking
- Analytics (views, applications)
- Verified agency badge
- Premium listing options

### Salary Insights
**Priority**: Low | **Timeline**: 2027

- Average salary by rank
- Salary trends over time
- Comparison by vessel type
- Market rate indicators

### Interview Preparation
**Priority**: Low | **Timeline**: 2027

- Common interview questions
- Video interview tips
- AI mock interviews
- Feedback and scoring

---

## Feature Priority Matrix

| Feature | Priority | Effort | Impact | Timeline |
|---------|----------|--------|--------|----------|
| Advanced Filtering | 🔴 High | Medium | High | Q2 2026 |
| Push Notifications | 🔴 High | High | High | Q2 2026 |
| User Profiles | 🔴 High | Medium | High | Q2 2026 |
| Saved Jobs | 🟡 Medium | Low | Medium | Q2 2026 |
| Job Matching | 🟡 Medium | High | High | Q3 2026 |
| Mobile Apps | 🔴 High | High | Very High | Q3 2026 |
| In-App Messaging | 🟡 Medium | High | Medium | Q3 2026 |
| WhatsApp Integration | 🟡 Medium | High | High | Q4 2026 |
| Resume Builder | 🟢 Low | Medium | Low | Q4 2026 |
| Agency Dashboard | 🟢 Low | High | Medium | Q4 2026 |
| Salary Insights | 🟢 Low | Medium | Low | 2027 |
| Interview Prep | 🟢 Low | High | Low | 2027 |

**Legend**:
- 🔴 High Priority - Core features for user adoption
- 🟡 Medium Priority - Enhances user experience
- 🟢 Low Priority - Nice-to-have, not critical

---

## Related Documentation
- **[Product Vision](01-product-vision.md)** - Strategic goals and vision
- **[Development Roadmap](11-development-roadmap.md)** - Implementation timeline
- **[User Flows](08-user-flows.md)** - How users interact with features
- **[API Reference](06-api-reference.md)** - Backend APIs supporting features

---

**Next**: [Tech Stack](04-tech-stack.md)
