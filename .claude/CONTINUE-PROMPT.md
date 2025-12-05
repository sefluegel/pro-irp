# PRO IRP - Continuation Prompt for Claude

**Tomorrow just say: "Read .claude/CONTINUE-PROMPT.md and continue from there"**

---

## Context: PRO IRP Insurance CRM - HIPAA Compliance & Pilot Metrics

I'm continuing work on my insurance CRM application. Here's where we left off:

### What This Project Is:
- **PRO IRP**: A CRM for insurance agents to manage Medicare/health insurance clients
- **Tech Stack**: React frontend, Node.js/Express backend, PostgreSQL database
- **Key Features**: Client management, risk scoring, churn prediction, AI briefings, Blue Button Medicare integration, calendar sync, email/SMS communications

### What Was Completed (Dec 5, 2025):

#### Founder Command Center Dashboard (COMPLETED):
A comprehensive 3-level drill-down dashboard for tracking pilot program metrics.

**Backend Files Created:**
```
backend/migrations/013-founder-metrics-tracking.js  - Database schema for pilot metrics
backend/middleware/feature-tracking.js             - Feature usage tracking middleware
backend/routes/pilot-metrics.js                    - Comprehensive API endpoints
```

**Frontend Pages Created:**
```
src/pages/FounderCommandCenter.jsx      - Level 1: Hero KPIs + Section Cards
src/pages/founder/AgentAdoption.jsx     - Level 2: Onboarding funnel details
src/pages/founder/ClientQuality.jsx     - Level 2: Data completeness metrics
src/pages/founder/ValueDelivery.jsx     - Level 2: Risk alerts, retention, revenue
src/pages/founder/SystemHealth.jsx      - Level 2: API, SMS, Email, DB status
src/pages/founder/index.js              - Export file for all founder pages
```

**Files Modified:**
```
src/api.js              - Added 15+ pilot metrics API functions
src/App.jsx             - Added routes for /founder/* pages
src/components/Sidebar.jsx - Added Command Center link (admin/FMO/agency only)
src/i18n.js             - Added commandCenter translations (EN/ES)
backend/index.js        - Mounted pilot-metrics routes and feature tracking middleware
```

**Dashboard Features:**
- **Level 1 (Command Center)**: Hero KPIs, clickable section cards for adoption/quality/value/health
- **Level 2 (Detail Pages)**:
  - Agent Adoption: Full onboarding funnel (Signup → SMS → Email → Calendar → Import → PDF Parser → Blue Button)
  - Client Quality: Profile completeness by field and by agent
  - Value Delivery: Risk alerts, interventions, saved vs churned clients, revenue impact
  - System Health: Real-time API/SMS/Email/Database status with error logs

**API Endpoints Created:**
```
GET  /pilot-metrics/overview              - Hero KPIs
GET  /pilot-metrics/adoption              - Agent funnel data
GET  /pilot-metrics/adoption/:milestone   - Milestone detail (who completed/not)
GET  /pilot-metrics/client-quality        - Data quality metrics
GET  /pilot-metrics/client-quality/:field - Field-specific detail
GET  /pilot-metrics/client-quality/by-agent - Quality by agent
GET  /pilot-metrics/value                 - Value delivery metrics
GET  /pilot-metrics/value/risk-alerts     - Risk alert details
GET  /pilot-metrics/value/saved           - Saved clients list
GET  /pilot-metrics/system-health         - System health status
GET  /pilot-metrics/system-health/errors  - Error log
GET  /pilot-metrics/feature-usage         - Module usage stats
GET  /pilot-metrics/trends                - Daily snapshots
POST /pilot-metrics/generate-snapshot     - Create daily snapshot
POST /pilot-metrics/mark-saved/:clientId  - Mark client as saved
POST /pilot-metrics/mark-churned/:clientId - Mark client as churned
```

#### Security Middleware (Previously Completed):
- CSRF protection, httpOnly cookies, session limits
- Session tracking/revocation
- New endpoints: /auth/logout, /auth/sessions, /auth/revoke-all-sessions
- Migration: 012-sessions-table.js

### Current Security Status: ~95% HIPAA Ready (Code-wise)

### Current Branch: `rescue-2025-09-03`

---

## Manual Steps Required (User Must Complete):

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Run Database Migrations
```bash
# Create sessions table (if not already done)
node backend/migrations/012-sessions-table.js

# Create founder metrics tracking tables
node backend/migrations/013-founder-metrics-tracking.js
```

### Step 3: Test the Backend
```bash
cd backend
npm run dev
```
Server should start on http://localhost:8080

### Step 4: Test the Frontend
```bash
npm start
```
- Navigate to `/founder` to see the Command Center (requires admin/FMO/agency role)
- Click on any section card to drill down to Level 2 pages

### Step 5: Rotate ALL Credentials (If Not Already Done)

| Service | Where to Rotate |
|---------|----------------|
| Database password | Your database provider |
| JWT_SECRET | Generate new: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| Twilio | twilio.com → Console → API Keys |
| SendGrid | sendgrid.com → Settings → API Keys |
| Google OAuth | console.cloud.google.com → Credentials |
| Microsoft OAuth | portal.azure.com → App registrations |
| BlueButton | sandbox.bluebutton.cms.gov → My Apps |
| OpenAI | platform.openai.com → API Keys |

---

## What's Available Now:

### Founder Command Center Features:
1. **Hero KPIs**: Total Agents, Total Clients, At-Risk Clients, Clients Saved, Revenue Saved
2. **Agent Adoption Funnel**: Track every step from signup to Blue Button connection
3. **Client Data Quality**: Profile completeness by field, by agent, with drill-down
4. **Value Delivery**: Risk alerts generated, acted on, clients saved vs churned
5. **System Health**: Real-time status of API, SMS, Email, Database

### Navigation:
- Admin/FMO/Agency users see "Command Center" link in sidebar (Rocket icon)
- Routes: `/founder`, `/founder/adoption`, `/founder/client-quality`, `/founder/value`, `/founder/system-health`

---

**What do you want to work on next?** (Examples: test the dashboard, add more metrics, work on HIPAA compliance, deploy to production, etc.)
