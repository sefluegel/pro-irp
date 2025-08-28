# DATA_PLAN — Pro IRP (Day 0)

> Endpoint names describe **what** data is needed (not the implementation).

## Auth & meta
- `GET /health` — API health
- `GET /version` — app version + build
- `GET /auth/me` — current user + memberships/roles + tenant scope

## Tenants & users
- `GET /tenants` — list (for managers)
- `POST /tenants` — create agency (FMO)
- `PATCH /tenants/:id` — update branding/settings
- `GET /users` — list users in scope (manager)
- `POST /invites` — invite user (manager)
- `PATCH /memberships/:id` — change role/activate/deactivate

## Clients
- `GET /clients` — list (search/filter/sort/paginate)
- `POST /clients` — create
- `GET /clients/:id` — detail
- `PATCH /clients/:id` — update
- `DELETE /clients/:id` — soft delete
- `GET /clients/:id/feed` — activity

## Notes
- `POST /clients/:id/notes` — add
- `PATCH /notes/:id` — edit
- `DELETE /notes/:id` — delete

## Tasks
- `GET /tasks` — list (filters: status, due, assignee)
- `POST /tasks` — create
- `PATCH /tasks/:id` — update/complete/reassign

## Messages (Email)
- `GET /templates?channel=email` — list email templates
- `POST /messages/email/send` — send email
- `POST /webhooks/email` — provider events (bounces/complaints/delivered)
- `GET /clients/:id/messages?channel=email` — history

## Messages (SMS)
- `POST /messages/sms/send` — send SMS
- `POST /webhooks/sms` — inbound + delivery status
- `GET /clients/:id/messages?channel=sms` — thread

## Calendar
- `GET /events` — upcoming
- `POST /events` — create
- `PATCH /events/:id` — update
- `DELETE /events/:id` — cancel

## Files
- `POST /files/sign` — get signed URL for upload/download
- `GET /clients/:id/files` — list

## Risk & dashboards
- `GET /dash/metrics` — counts for MetricCards
- `GET /dash/risk-distribution` — data for ClientRiskChart
- `GET /dash/retention-trend` — data for RetentionCharts
- `GET /clients/at-risk` — data for RiskList

## OEP/AEP Hub
- `GET /hub/overview` — summary cards (time‑range)
- `GET /hub/at-risk` — table data (filters)
- Bulk actions:
  - `POST /hub/bulk/message`
  - `POST /hub/bulk/task`
  - `POST /hub/bulk/assign`

## AEP Wizard & Campaigns (incl. Countdown)
- `POST /wizard/draft` — create or save step
- `GET /wizard/draft` — load
- `DELETE /wizard/draft` — cancel
- `POST /wizard/preview-schedule` — schedule preview including **Countdown List** breakdown (daily/weekly targets & milestone dates)
- `GET /seasons/current` — current season (AEP/OEP) window and **days remaining**
- `POST /campaigns` — create from wizard
- `GET /campaigns/:id/metrics` — sent/delivered/replies
- `GET /campaigns/:id/countdown` — countdown summary (remaining days, targets, milestones)
- `POST /campaigns/:id/approve` — approve
- `POST /campaigns/:id/pause` — pause/resume

## Automations & worker
- `GET /rules` — list
- `PATCH /rules/:id` — edit/toggle
- `POST /rules/:id/test` — simulate
- `GET /worker/stats` — processed/failed counts

## Agency & FMO dashboards
- `GET /agency/metrics` — per‑agent tiles
- `GET /agency/drilldown` — filtered lists
- `GET /fmo/metrics` — per‑agency tiles and trends

## Templates (governance)
- `GET /templates` — list (owner, status, channel)
- `POST /templates` — create master/child
- `PATCH /templates/:id` — edit/publish/unpublish
- `POST /templates/:id/clone` — child from master

## Audit
- `GET /audit` — filter by time/actor/verb/entity

## Settings & quotas
- `GET /settings` — tenant + user
- `PATCH /settings` — tenant
- `PATCH /me` — user profile
- `GET /usage` — usage counters

## Reports & exports
- `GET /export/*.csv` — CSV endpoints per feature (hub, dashboards, lists)
