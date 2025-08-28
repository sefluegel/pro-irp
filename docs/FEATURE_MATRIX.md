# FEATURE_MATRIX — Pro IRP (Day 0)

This document lists **what must be visible/possible** for every page and component. It is scope-frozen.

## Pages

### Dashboard (pages/Dashboard.jsx)
- **Route:** `/dashboard` (auth required)
- **Purpose:** Home base showing today’s priorities and status at a glance
- **Visible sections:**
  - **MetricCards:** totals (My open tasks, Due today, At‑risk clients, Upcoming appts, Messages awaiting reply)
  - **ClientRiskChart:** risk distribution (buckets, tooltip counts)
  - **RiskList:** top N at‑risk clients (name, risk, last contact, quick actions)
  - **RetentionCharts:** retention/outreach trend (time range toggle: 7/30/90 days)
  - **Upcoming Appointments** mini list (next 7 days)
  - **Recent Replies** mini thread (last N inbound msgs)
- **Actions:**
  - Quick actions per client row: Send Email, Send SMS, Create Task, Open Profile
  - Time‑range switcher updates charts/metrics
  - “View all” links to Tasks/Clients/Calendar/OutreachLog
- **States:** loading skeletons, empty, error toast, permission‑based card hiding
- **Role visibility:** Agent (own book); Agency (Team vs My toggle); FMO (per‑agency roll‑up card → FMO Dashboard)

### Clients (pages/Clients.jsx)
- **Route:** `/clients` (auth)
- **Purpose:** Search, filter, and act on clients
- **Columns:** name, phone, email, city/state, tags, last contact, risk
- **Top controls:** unified search (name/phone/email), Clear, Filter button (opens panel), Sort dropdown, CSV export
- **Filters (panel):** tags, risk min/max, last contact range, plan type (if present), owner (manager only) with Apply/Reset
- **Sort options:** name, risk, last contact
- **Pagination:** page size selector, next/prev, page X of Y, total count label
- **Row actions:** open profile; quick email/text; quick task; reassign (manager)
- **Bulk actions:** multi‑select + Assign / Create Tasks / Send Email/SMS
- **States:** loading, empty (no clients), zero‑results (after filters), error
- **Role visibility:** Agent (own clients); Agency Manager/Admin (all clients in agency); FMO (via dashboard drill‑down)

### New Client (pages/NewClient.jsx) + ClientForm (components/ClientForm.jsx)
- **Route:** `/clients/new` (auth)
- **Fields:** first/last, DOB, phone(s), email(s), address, city/state/zip, tags, initial note, preferred contact
- **Actions:** Save (toast + redirect to profile), Cancel (back to list), set owning agent (manager only)
- **Validation:** required markers, field errors, duplicate detection (email/phone) warning
- **States:** draft warning on navigate away, loading, error

### Client Profile (pages/ClientProfile.jsx)
- **Route:** `/clients/:id` (auth)
- **Header:** name, tags, risk chip, quick actions (Call/Email/Text/Schedule/Task)
- **Tabs:**
  - **Profile:** demographics, tags, last contact summary
  - **Contacts:** phones/emails/addresses with preferred/consent flags
  - **Notes:** list (author/time), add/edit/delete, pin note
  - **ActivityFeed:** history (messages/tasks/files/risk/events)
- **Right rail (if present):** next appointment, last message snippet
- **Actions:** edit fields, add note, send message, create task, schedule
- **States:** loading per tab, empty states, permission errors

### Tasks (pages/Tasks.jsx) + TaskList
- **Route:** `/tasks` (auth)
- **Tabs:** My Tasks, Team (manager), Completed
- **Task card fields:** title, status, due, priority, assignee (manager), client link
- **Actions:** create task, edit, complete, bulk complete, reassign (manager), change due/priority
- **Filters:** due (today/overdue/next 7), status, priority, assignee (manager)
- **States:** loading, empty, error

### Calendar (pages/Calendar.jsx) + ClientScheduleModal.jsx
- **Route:** `/calendar` (auth)
- **Views:** upcoming list (week), per‑event actions: edit/cancel
- **From Client:** open ClientScheduleModal (date/time/notes)
- **Surfacing:** next appointments snippet on Dashboard + Client right rail
- **States:** loading, empty, error

### Messages — Email (Day 13)
- **Where:** Client profile quick actions + modal; history on client
- **Template chooser:** list templates, preview with sample data
- **Send:** subject/body placeholders; track statuses (queued/sent/delivered/bounced/failed)
- **Suppression:** prevent send to suppressed addresses; show reason
- **Feed/Log:** each send recorded with provider ref

### Messages — SMS (Day 14) + MessageThread.jsx
- **Thread view:** merges inbound/outbound; shows STOP/START markers
- **Send:** respects quiet hours, rate limits, consent
- **Inbound:** mapped to client; appears in thread and feed
- **Error copy:** clear reason when blocked

### Activity Feed (components/ActivityFeed.jsx) + OutreachLog.jsx
- **Scope:** per‑client history of notes, tasks, messages (email/SMS in/out), files, appointments, risk changes
- **Filters:** All / Messages / Tasks / Notes / Files / Risk; date range
- **Actions:** add note inline; open source record; mark task done inline
- **Outreach Log table:** Timestamp, Channel, Direction, Template, Status, Provider Ref, Error; filters Channel/Direction/Status; CSV export

### OEP/AEP Retention Hub (pages/OEPHub.jsx)
- **Route:** `/oep` (auth)
- **Tabs:** Overview, At‑Risk, Outreach Status, Appointments
- **Overview cards:** at‑risk total, messages sent, replies, appts, overdue tasks (time‑range)
- **At‑Risk table:** filters (risk, last outreach, age band, plan type); row actions (send/task/schedule); **bulk actions** for selected
- **Agency roll‑up:** manager can toggle per‑agent breakdown; FMO roll‑up per agency
- **Exports:** CSV per tab
- **Season banner/selector:** shows current season and **days remaining**

### AEP Wizard (pages/AEPWizard.jsx)
- **Route:** `/aep-wizard` (auth)
- **Steps:** Cohort → Preferences → Schedule → Templates → Follow‑ups → Review → Confirm
- **Countdown List (explicit):** visible on **Schedule** and **Review**; shows **days remaining**, **daily/weekly send targets** based on pacing, **milestone dates** (template approval deadline, warm‑up start, last‑send cutoff), and **per‑day task/message counts**; **CSV export** and **printable view**. After Confirm: **Countdown tile** on Dashboard and Hub linking back to the campaign’s countdown.
- **Drafts:** autosave after each step; resume draft; cancel discards
- **Confirm:** creates Campaign with audience, schedule, and jobs; creates audit entry

### Automations (pages/Automations.jsx)
- **Route:** `/automations` (auth)
- **Rules list:** risk thresholds, quiet hours, pacing, consent checks
- **Actions:** toggle on/off, edit thresholds, **test mode** (simulate cohort, report only)
- **History:** change log/audit of rule edits

### Settings (pages/Settings.jsx)
- **Route:** `/settings` (auth)
- **Tenant settings:** logo, colors (theme), business hours, quiet hours, channel toggles, quotas
- **User settings:** name, photo, locale (EN/ES), email/SMS signatures
- **Actions:** save, preview theme, revert

### Policies (pages/Policies.jsx)
- **Route:** `/policies` (public)
- **Content:** Privacy Policy, Terms of Service; version/date stamp
- **Links:** footer + Settings

### Auth pages (Login.jsx, LoginPage.jsx, Signup.jsx, ForgotPassword.jsx)
- **Routes:** `/login`, `/signup`, `/forgot`
- **Flows:** sign in/out (Hosted UI), sign up via invite, password reset (request + confirm)
- **States:** loading, error, account locked/disabled message, success toasts
- **Note:** pick one of Login/LoginPage as primary; other redirects

### Marketing pages (pages/marketing/*.jsx)
- **Routes:** `/` (HomeSimple), `/agents`, `/agencies`, `/fmo`
- **Sections:** hero, features, screenshots carousel, testimonials placeholder, CTA
- **Forms:** contact/interest; delivers to configured inbox
- **SEO:** title/description, OG/Twitter, sitemap, robots

## Components

- **ActivityFeed.jsx:** items (icon, actor, time, snippet), quick filters, open source link, inline add note, mark task done
- **MessageThread.jsx:** chronological bubbles; direction indicators; STOP/START badges; load more
- **ClientRiskChart.jsx:** bucketed histogram/pie; tooltips; time‑range aware
- **RetentionCharts.jsx:** line/area chart for outreach/retention trend; time‑range toggle
- **RiskList.jsx:** top N clients; link to profile; quick actions
- **MetricCards.jsx:** small cards with counts; click‑through to list pages
- **OutreachLog.jsx:** message history table with provider IDs and statuses + filters + CSV export
- **TaskList.jsx:** grouped by status/assignee; inline actions; bulk select
- **ClientScheduleModal.jsx:** date/time picker; notes; save/cancel
- **ActionBar.jsx:** on profile; buttons for call/email/text/schedule/task
- **TakeActionMenu.jsx:** context menu for bulk actions (hub, lists)
- **DashboardHeader.jsx:** title, filters, time range
- **Header/Navbar/Sidebar/Layout/SectionLinks/Logo.jsx:** global layout, brand, navigation; role‑aware visibility; breadcrumbs; footer links
- **AuthContext.jsx:** provides user, role(s), tenant scope for UI gates
- **ProtectedRoute.jsx/PrivateRoute.jsx:** gate routes by auth and role
- **QuickLookup.jsx:** header search for clients (fast find)
- **ClientDetailCard.jsx:** small profile summary card used in lists/sidebars
