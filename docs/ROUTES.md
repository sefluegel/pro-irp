# ROUTES — Pro IRP (Day 0)

## Public
- `/` (HomeSimple)
- `/agents` (marketing)
- `/agencies` (marketing)
- `/fmo` (marketing)
- `/policies` (privacy/terms)
- `/login` (redirect to Hosted UI or local login page)
- `/forgot` (reset start)

## Authenticated (requires token)
- `/dashboard`
- `/clients`
- `/clients/new`
- `/clients/:id`
- `/tasks`
- `/calendar`
- `/automations`
- `/oep` (OEP/AEP Hub)
- `/aep-wizard`
- `/settings`

## Role‑gated
- **Agency Manager/Admin:** team views (Tasks Team tab), Agency Dashboard, Workboard, Campaigns, Templates (Agency)
- **FMO Manager/Admin:** FMO Dashboard, Template governance (master), Organization management (create/disable agencies), roll‑ups

## Redirects / 404
- Unknown paths → `/dashboard` (if auth) or `/` (if public)
- Forbidden roles → friendly 403 page with back link
