# Changelog

All notable changes to BD Mariner Hub will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - In Development

### Added
- **Comprehensive Documentation Suite**
  - 14 detailed documentation files covering all aspects of the project
  - Product vision and strategic planning documents
  - Technical architecture with Mermaid diagrams
  - Complete API reference and database schema documentation
  - Marketing, SEO, and ASO strategy guides
  - Testing, analytics, and support procedures
  - Updated README.md with project overview and quick start guide
  - Documentation hub at `/docs/README.md` for easy navigation

- **Automated MariAid Job Scraper**
  - GitHub Actions workflow for daily job scraping at 9 AM UTC
  - Python script to fetch jobs from mariaid.com/careers-at-sea
  - Change detection to identify new job postings
  - JSON and CSV export formats
  - 30-day rolling history
  - Successfully scraped 28 maritime job listings in first run

- **Job Board with AI Parsing**
  - Telegram bot integration for automated job aggregation
  - Google Gemini 2.5 Flash AI-powered job parsing
  - 8 standardized fields (RANK, SALARY, JOINING DATE, AGENCY, MLA NUMBER, ADDRESS, MOBILE, EMAIL)
  - Duplicate detection via source_id
  - Real-time job updates via Supabase Realtime
  - Job status tracking (active, filled, expired, archived)
  - Enhanced job postings table with comprehensive metadata

- **AI Career Assistant**
  - Gemini-powered chatbot for maritime career guidance
  - Natural language conversation interface
  - Usage time tracking (total_usage_minutes)
  - Chat message history storage

- **Document Management System**
  - Secure document storage via Supabase Storage
  - Support for CDC, passports, certificates, licenses
  - Expiry date tracking and warnings
  - File type validation (PDF, JPG, PNG)
  - Document categorization

- **Sea Service Tracker**
  - Record sea service history (vessel, rank, dates)
  - Automatic duration calculation
  - Total sea time aggregation
  - JSONB storage for flexible data structure

- **Medical Centers Directory**
  - DG-approved medical centers database
  - OCR-extracted data from authorized doctors list
  - Search by city/name functionality
  - Contact information (phone, address, hours)

- **Manning Agents Registry**
  - Verified manning agencies directory
  - MLA number tracking and verification
  - Agency contact details
  - Verification status badges

- **Alumni Association**
  - Member directory by academy and batch
  - Profile information (rank, contact preferences)
  - Search and filter capabilities

- **Community Forum**
  - Discussion board with categories
  - Post creation and reply system
  - Upvote/downvote functionality
  - Moderation features

- **Admin Dashboard**
  - User statistics and metrics
  - Job posting management (approve/reject/archive)
  - Forum moderation
  - Agency verification
  - Storage usage monitoring

- **Database Infrastructure**
  - PostgreSQL database with 8 core tables
  - Row-Level Security (RLS) policies
  - Materialized view for active jobs
  - Database triggers and functions
  - Comprehensive indexing strategy

- **Supabase Edge Functions**
  - `telegram-webhook`: Receives and processes Telegram job postings
  - `job-parser`: AI-powered job field extraction
  - `cdc-verify`: CDC number verification
  - Deno runtime with TypeScript

### Changed
- **AI Model Evolution**
  - Migrated from OpenAI GPT-4o-mini to Google Gemini
  - Updated to gemini-2.5-flash (stable 2026 model)
  - Improved parsing accuracy and cost-effectiveness

- **Deployment Process**
  - Removed deployment tab from admin dashboard (migrated to comprehensive guide)
  - Updated deployment guide with enhanced SQL migration instructions
  - Fixed SQL syntax errors in migration procedures

- **Telegram Webhook**
  - Enhanced error handling and logging
  - Fixed 401 authentication errors
  - Added debugging endpoints (GET method support)
  - Improved message filtering logic
  - Disabled secret token check for compatibility

### Fixed
- **Job Parser Issues**
  - Resolved SHIPPED format extraction bugs
  - Fixed maritime job visibility issues
  - Improved field extraction accuracy (95%+ confidence)
  - Enhanced duplicate detection

- **Gemini AI Integration**
  - Fixed API version compatibility (v1beta vs v1)
  - Corrected model naming (gemini-1.5-flash, gemini-pro, gemini-2.5-flash)
  - Resolved responseMimeType parameter issues
  - Fixed 404 "model not found" errors

- **Deployment Verification**
  - Fixed function deployment checks to handle 401/403 responses
  - Improved deployment status validation

- **Database Migrations**
  - Corrected SQL syntax errors in migration scripts
  - Fixed enhanced_job_postings migration issues

### Security
- **Row-Level Security (RLS)**
  - Implemented RLS policies on all user data tables
  - Users can only access their own profiles, documents, and messages
  - Public read access for job postings and directories
  - Admin-level policies for dashboard operations

- **Authentication**
  - Supabase Auth integration
  - JWT token-based session management
  - Secure password hashing

- **Environment Variables**
  - API keys stored securely in environment variables
  - No sensitive data in codebase
  - Webhook secret token validation (configurable)

### Documentation
- Created comprehensive documentation suite covering:
  - Product vision and strategy
  - Technical architecture and system design
  - Feature specifications
  - Technology stack and rationale
  - Database schema and data models
  - API reference and usage examples
  - Integration guides (Telegram, Gemini AI)
  - User flows and journey maps
  - Marketing and SEO strategy
  - App Store Optimization (ASO)
  - Development roadmap
  - Testing and QA procedures
  - Analytics and metrics framework
  - Support and maintenance procedures

---

## [Unreleased] - Future Versions

### Planned for v1.1 (Q2 2026)
- Advanced job filtering (rank, salary range, vessel type)
- Push notifications for new jobs
- User profiles and preferences
- Saved jobs/bookmarks functionality
- Enhanced search capabilities

### Planned for v1.2 (Q3 2026)
- Native mobile apps (iOS and Android)
- Job matching algorithm (AI-powered recommendations)
- In-app messaging with agencies
- Resume/CV builder

### Planned for v1.3 (Q4 2026)
- WhatsApp integration for job aggregation
- Agency dashboard for direct job posting
- Premium features exploration
- Regional expansion

### Planned for v2.0 (2027)
- Salary insights and market trends
- Interview preparation tools
- Multi-language support (Tagalog, Hindi, Spanish)
- Advanced analytics dashboard

---

## Version History

- **1.0.0** - In Development (Current)
  - Initial release with core features
  - Job board, AI assistant, document management
  - Community features (alumni, forum)
  - Admin dashboard
  - Comprehensive documentation

---

## Notes

### Breaking Changes
- None (initial version)

### Deprecations
- None (initial version)

### Migration Guide
- For database setup, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- For testing procedures, see [TELEGRAM_JOB_PARSER_TESTING.md](TELEGRAM_JOB_PARSER_TESTING.md)

### Contributors
- jackr7981 - Project Lead and Developer
- Claude AI - Documentation and development assistance

---

## Links

- [Documentation](docs/README.md)
- [Development Roadmap](docs/11-development-roadmap.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [GitHub Repository](https://github.com/jackr7981/App-M)

---

**Last Updated**: February 14, 2026
