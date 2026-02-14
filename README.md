<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# BD Mariner Hub

> Your Complete Maritime Career Platform for Bangladeshi Seafarers

[![Status](https://img.shields.io/badge/status-in%20development-yellow)](https://github.com)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](./CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

BD Mariner Hub is a comprehensive mobile-first career platform designed specifically for Bangladeshi maritime professionals. The platform automatically aggregates job postings from Telegram groups, uses AI to parse and standardize information, and provides a centralized hub for seafarers to discover opportunities, manage documents, track sea service, and connect with the maritime community.

---

## Features

- **Job Board** - AI-powered aggregation of maritime jobs from Telegram groups with 8 standardized fields (RANK, SALARY, JOINING DATE, AGENCY, MLA NUMBER, ADDRESS, MOBILE, EMAIL)
- **AI Career Assistant** - Gemini-powered chatbot for maritime career guidance and advice
- **Document Management** - Secure storage for CDC, passports, certificates, and licenses with expiry tracking
- **Sea Service Tracker** - Record and calculate total sea time for rank promotions
- **Medical Centers Directory** - DG-approved medical centers for pre-joining medicals
- **Manning Agents Registry** - Verified manning agencies with MLA numbers and contact details
- **Alumni Association** - Connect with fellow mariners from maritime academies
- **Community Forum** - Discussion board for sharing experiences and knowledge
- **Admin Dashboard** - Content management and system monitoring for administrators

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Supabase Account** (for database and backend services)
- **Gemini API Key** (for AI features)
- **Telegram Bot Token** (for job aggregation, optional for local development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jackr7981/App-M.git
   cd App-M
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the project root:
   ```env
   # Supabase
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

   # Gemini AI
   GEMINI_API_KEY=your-gemini-api-key

   # Optional: Telegram Bot (for job aggregation)
   TELEGRAM_BOT_TOKEN=your-bot-token
   WEBHOOK_SECRET=your-webhook-secret
   ```

4. **Set up the database**

   Run the database setup script:
   ```bash
   # Using Supabase CLI
   supabase db push

   # Or manually execute db_setup.sql in your Supabase SQL Editor
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open the app**

   Navigate to `http://localhost:5173` in your browser

### Deployment

For production deployment instructions, see the [Deployment Guide](./DEPLOYMENT_GUIDE.md).

---

## Documentation

Comprehensive documentation is available in the [`/docs`](./docs) directory:

### Getting Started
- [Product Vision](docs/01-product-vision.md) - Overview, goals, and target users
- [Features Overview](docs/03-features.md) - Current and planned features
- [User Flows](docs/08-user-flows.md) - User journeys and interactions

### For Developers
- [Technical Architecture](docs/02-technical-architecture.md) - System design and components
- [Tech Stack](docs/04-tech-stack.md) - Technologies and dependencies
- [Database Schema](docs/05-database-schema.md) - Data models and tables
- [API Reference](docs/06-api-reference.md) - Supabase tables, Edge Functions, RPCs
- [Integrations](docs/07-integrations.md) - Telegram Bot, Gemini AI

### Operations & Strategy
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production deployment procedures
- [Testing & QA](docs/12-testing-qa.md) - Testing strategies and procedures
- [Support & Maintenance](docs/14-support-maintenance.md) - Operations and support
- [Development Roadmap](docs/11-development-roadmap.md) - Feature timeline and milestones
- [Marketing & SEO](docs/09-marketing-seo.md) - Marketing strategy and SEO
- [Analytics & Metrics](docs/13-analytics-metrics.md) - KPIs and tracking

**Full Documentation Index**: [docs/README.md](docs/README.md)

---

## Tech Stack

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **PWA**: Offline-first Progressive Web App

### Backend
- **Platform**: Supabase
- **Database**: PostgreSQL 15
- **Runtime**: Deno (Edge Functions)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Realtime**: Supabase Realtime Engine

### AI & Integrations
- **AI Model**: Google Gemini 2.5 Flash
- **Job Source**: Telegram Bot API
- **Analytics**: (Planned) Google Analytics 4, Mixpanel

### DevOps
- **Version Control**: Git + GitHub
- **Hosting**: (TBD) Vercel / Netlify / Self-hosted
- **Monitoring**: Supabase Dashboard

For detailed technology choices and rationale, see [Tech Stack Documentation](docs/04-tech-stack.md).

---

## Project Structure

```
App-M/
├── components/           # React components
│   ├── JobBoard.tsx
│   ├── AIChat.tsx
│   ├── DocumentManager.tsx
│   ├── SeaServiceTracker.tsx
│   ├── MedicalCenters.tsx
│   ├── ManningAgents.tsx
│   ├── AdminDashboard.tsx
│   ├── AlumniAssociation.tsx
│   └── CommunityForum.tsx
├── docs/                 # Comprehensive documentation
│   ├── 01-product-vision.md
│   ├── 02-technical-architecture.md
│   └── ... (14 files total)
├── supabase/
│   ├── functions/        # Edge Functions
│   │   ├── telegram-webhook/
│   │   ├── job-parser/
│   │   └── cdc-verify/
│   └── migrations/       # Database migrations
├── scripts/              # Python scripts
│   └── scrape_mariaid_jobs.py
├── jobs/                 # Job scraper data
│   ├── latest_jobs.json
│   └── jobs_history.json
├── db_setup.sql          # Database schema
├── types.ts              # TypeScript type definitions
├── supabaseClient.ts     # Supabase configuration
├── App.tsx               # Root component
├── metadata.json         # PWA manifest
├── DEPLOYMENT_GUIDE.md   # Deployment instructions
├── TELEGRAM_JOB_PARSER_TESTING.md  # Testing guide
├── CHANGELOG.md          # Version history
└── README.md             # This file
```

---

## Key Features in Detail

### 8 Standardized Job Fields

Every job posting is parsed by AI to extract these critical fields:

1. **RANK** - Position (Master, Chief Engineer, 2nd Officer, etc.)
2. **SALARY** - Monthly compensation (USD)
3. **JOINING DATE** - Embarkation date or availability
4. **AGENCY** - Manning/recruiting agency name
5. **MLA NUMBER** - Manning License Agreement number
6. **AGENCY ADDRESS** - Physical location
7. **MOBILE NUMBER** - Contact number
8. **AGENCY EMAIL** - Email address for applications

### Automated Job Aggregation Pipeline

```
Telegram Group → Bot Webhook → AI Parsing → Database → Real-time Update → User App
```

1. Telegram bot monitors maritime job groups 24/7
2. New messages trigger webhook to Supabase Edge Function
3. Gemini AI extracts structured data (95%+ accuracy)
4. Duplicate detection prevents repeat postings
5. Jobs appear instantly in the app via real-time subscriptions

---

## Development

### Running Tests

```bash
# Unit tests (planned)
npm run test

# E2E tests (planned)
npm run test:e2e

# Telegram webhook testing
# See TELEGRAM_JOB_PARSER_TESTING.md
```

### Code Style

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint configured
- **Formatting**: Prettier (recommended)

### Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

For major changes, please open an issue first to discuss what you would like to change.

---

## Roadmap

### Current Phase: MVP (Q1 2026)
- ✅ Job board with AI parsing
- ✅ Document management
- ✅ Sea service tracker
- ✅ AI career assistant
- ✅ Community features

### Next Phase: Beta Launch (Q2 2026)
- ⏳ Advanced job filtering
- ⏳ Push notifications
- ⏳ User profiles and preferences
- ⏳ Saved jobs/bookmarks
- ⏳ Mobile app development

### Future Phases
- **Q3 2026**: Public launch, native mobile apps (iOS/Android)
- **Q4 2026**: Job matching algorithm, WhatsApp integration
- **2027**: Regional expansion, premium features

See [Development Roadmap](docs/11-development-roadmap.md) for detailed timeline.

---

## Support

- **Documentation**: [docs/README.md](docs/README.md)
- **Issues**: [GitHub Issues](https://github.com/jackr7981/App-M/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jackr7981/App-M/discussions)
- **Email**: support@bdmarinerhub.com (planned)

For support and maintenance procedures, see [Support & Maintenance](docs/14-support-maintenance.md).

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **Bangladeshi Seafarers** - For their feedback and support
- **Maritime Academies** - BMMTA, MAMI, and other institutions
- **Open Source Community** - For amazing tools and libraries
- **Google Gemini** - AI-powered job parsing
- **Supabase** - Backend infrastructure
- **Telegram** - Job source integration

---

## Contact

**Project Maintainer**: jackr7981
**Repository**: https://github.com/jackr7981/App-M

---

<div align="center">

**Built with ❤️ for the Maritime Community of Bangladesh**

[Documentation](docs/README.md) • [Roadmap](docs/11-development-roadmap.md) • [Report Bug](https://github.com/jackr7981/App-M/issues) • [Request Feature](https://github.com/jackr7981/App-M/issues)

</div>
