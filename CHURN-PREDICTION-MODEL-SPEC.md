# PRO IRP - Medicare Advantage Churn Prediction Model
## Complete Technical Specification

**Version:** 1.0
**Date:** December 2025
**Status:** Final

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Core Risk Weights](#2-core-risk-weights)
3. [Section 1: Engagement Metrics (40%)](#3-section-1-engagement-metrics-40)
4. [Section 2: Utilization Metrics (22%)](#4-section-2-utilization-metrics-22)
5. [Section 3: Benefit Fit Metrics (18%)](#5-section-3-benefit-fit-metrics-18)
6. [Section 4: Life Events (8%)](#6-section-4-life-events-8)
7. [Section 5: External Risk (12%)](#7-section-5-external-risk-12)
8. [Section 6: Temporal Modifiers & Final Score](#8-section-6-temporal-modifiers--final-score)
9. [Section 7: Continuous Learning](#9-section-7-continuous-learning)
10. [Dashboard & UI](#10-dashboard--ui)
11. [Founder Analytics](#11-founder-analytics)
12. [Data Sources & Integrations](#12-data-sources--integrations)
13. [Implementation Phases](#13-implementation-phases)

---

## 1. Executive Summary

### Purpose
Predict which Medicare Advantage clients are at risk of churning (leaving their plan or agent) and enable proactive intervention to retain them.

### Key Features
- Daily risk scoring for all clients (0-100 scale)
- 7 risk categories from Stable to Severe
- Auto-100 triggers for critical life events
- Agent-driven outcome tracking via call outcome modal
- Continuous learning from actual churn events
- Founder dashboard with analytics and reporting

### Data Sources
- **Blue Button 2.0**: Claims, utilization, Rx, LIS status, addresses
- **CMS APIs**: Plan data, formularies, networks, demographics
- **Agent Input**: Call outcomes, client conversations

---

## 2. Core Risk Weights

| Category | Weight | Max Points |
|----------|--------|------------|
| Engagement | 40% | 100 |
| Utilization | 22% | 100 |
| Benefit Fit | 18% | 100 |
| Life Events | 8% | 100 |
| External Risk | 12% | 100 |
| **Total** | **100%** | |

### Base Score Formula
```
Base Score =
  (Engagement Score × 0.40) +
  (Utilization Score × 0.22) +
  (Benefit Fit Score × 0.18) +
  (Life Events Score × 0.08) +
  (External Risk Score × 0.12)
```

---

## 3. Section 1: Engagement Metrics (40%)

### Contact Type Classification

**Meaningful Contact (100% Credit):**
- Benefits review call
- Problem resolution call
- Life event discussion
- AEP/OEP check-in call
- In-person meeting
- Scheduled Zoom/video

**Light Touch (50% Credit):**
- Quick check-in call (< 5 min)
- Text conversation
- Personalized email

**Automated (20% Credit):**
- Birthday text/email
- Holiday message
- Newsletter
- Reminder text

### Days Since Meaningful Contact

| Days | Points | Risk Level |
|------|--------|------------|
| 0-30 | 0 | Safe |
| 31-60 | 3 | Safe |
| 61-90 | 8 | Watch |
| 91-120 | 18 | Elevated |
| 121-150 | 28 | High |
| 151-180 | 38 | Critical |
| 180+ | 48 | Critical |

### Response Ratios

**Phone Pickup Ratio (Primary):**
| Ratio | Points |
|-------|--------|
| 70-100% | 0 |
| 50-69% | 6 |
| 30-49% | 15 |
| 10-29% | 28 |
| 0-9% | 40 |

**Text Response Ratio (Secondary):**
| Ratio | Points |
|-------|--------|
| 70-100% | 0 |
| 50-69% | 4 |
| 30-49% | 10 |
| 10-29% | 18 |
| 0-9% | 25 |

**Email Open Rate (Tertiary):**
| Rate | Points |
|------|--------|
| 50-100% | 0 |
| 30-49% | 3 |
| 10-29% | 8 |
| 0-9% | 12 |

### New Client First 90 Days

Mandatory checkpoints with points if missed:

| Checkpoint | If Missed |
|------------|-----------|
| Day 7 welcome call | +15 points |
| Day 30 check-in | +12 points |
| Day 60 check-in | +10 points |
| Day 90 review | +15 points |

### First OEP After AEP Enrollment

Suggested outreach cadence (configurable):
- Dec 15-31: Pre-OEP check-in
- Jan 1-15: OEP opens check-in
- Jan 16-31: Mid-OEP confirmation
- Feb: Satisfaction check
- Mar: Final close-the-loop

### Annual Review Tracking
- Flag if > 11 months since last annual review
- Tracked separately from regular contact

---

## 4. Section 2: Utilization Metrics (22%)

### Data Source
Blue Button 2.0 (Required - client OAuth consent)

### Emergency & Inpatient Events

| Event | Points |
|-------|--------|
| ER visit (1st in 12 mo) | 8 |
| ER visit (2nd+ in 12 mo) | 15 |
| Inpatient admission | 18 |
| ICU stay | 22 |
| Surgery (planned) | 10 |
| Surgery (emergency) | 20 |
| Skilled nursing stay | 15 |

### Pharmacy & Rx Issues

| Event | Points |
|-------|--------|
| Rx not covered (1st) | 12 |
| Rx not covered (2nd+) | 20 |
| Primary maintenance drug not covered | 30 |
| Rx tier increase | 10 |
| Rx cost spike > $50/mo | 15 |
| Rx cost spike > $100/mo | 25 |
| Prior auth required (new) | 8 |
| Prior auth denied | 18 |
| Step therapy required | 10 |
| Quantity limit hit | 8 |
| Adherence drop (MPR < 80%) | 12 |

### Prior Authorization & Denials

| Event | Points |
|-------|--------|
| PA request (1st in 90 days) | 5 |
| PA request (2nd+ in 90 days) | 10 |
| PA denied (any) | 18 |
| PA denied (2+ in 12 mo) | 30 |
| Claim denied | 15 |
| Appeal filed | 12 |
| Appeal denied | 25 |

### Cost Exposure

| Event | Points |
|-------|--------|
| OOP spend > 25% of MOOP | 8 |
| OOP spend > 50% of MOOP | 18 |
| OOP spend > 75% of MOOP | 28 |
| Hit MOOP | 35 |
| Single service > $500 OOP | 15 |
| Single service > $1,000 OOP | 25 |

### Recency Modifiers

| Event Timing | Modifier |
|--------------|----------|
| Last 30 days | 1.5x |
| 31-60 days | 1.25x |
| 61-90 days | 1.0x |
| 90+ days | 0.5x |

### Agent Follow-Up Credit

| Response | Modifier |
|----------|----------|
| Called within 7 days | -50% points |
| Called within 14 days | -30% points |
| Called within 30 days | -15% points |
| Never followed up | Full points |
| Client mentioned, agent resolved | -60% points |

### Real-Time Alerts

| Event | Alert |
|-------|-------|
| ER visit detected | "Call within 48 hours" |
| Rx denial detected | "Call within 24 hours" |
| PA denied | "Call within 48 hours" |
| High OOP event | "Check in this week" |

### No Utilization Data Available
- Fall back to Engagement score only
- Flag client as "Limited Data"
- Quarterly meaningful contact is baseline

---

## 5. Section 3: Benefit Fit Metrics (18%)

### Drug Coverage Issues

| Issue | Points |
|-------|--------|
| 1 drug not on formulary | 12 |
| 2+ drugs not on formulary | 25 |
| Primary maintenance drug not covered | 30 |
| Brand required, generic only covered | 15 |
| Drug on Tier 4/5 (specialty) | 10 |
| Drug requires prior auth | 8 |
| Drug has quantity limits | 6 |
| Drug has step therapy | 10 |

### ANOC Formulary Changes (Applied Oct 1)

| Change | Points |
|--------|--------|
| Client drug removed from formulary | 35 |
| Client drug tier increase | 20 |
| New PA requirement | 15 |
| New step therapy | 18 |
| New quantity limit | 10 |

### Provider Network Issues

| Issue | Points |
|-------|--------|
| PCP in network | 0 |
| PCP leaving network (ANOC) | 35 |
| PCP out of network (using anyway) | 25 |
| 1 key specialist out of network | 15 |
| 2+ specialists out of network | 28 |
| Oncologist out of network | 35 |
| Cardiologist out of network | 30 |

### Plan Comparison (AEP Only - September)

| Comparison | Points |
|------------|--------|
| Premium 20%+ higher than alternatives | 15 |
| Drug cost 20%+ higher than alternatives | 18 |
| Star rating 0.5+ lower than competitors | 10 |
| Star rating 1.0+ lower than competitors | 20 |
| Better network match elsewhere | 15 |

### ANOC Auto-Scan (Oct 1)

System automatically:
1. Scans client drug list against new formulary
2. Checks provider network changes
3. Compares to new plan options
4. Flags clients with negative changes

### Client Tenure Loyalty Factor

Applied to FINAL score (reduces risk for loyal clients):

| Years with Agent | Multiplier |
|------------------|------------|
| 0-1 years | 1.0x |
| 1-2 years | 0.9x |
| 2-3 years | 0.85x |
| 3-5 years | 0.8x |
| 5-7 years | 0.7x |
| 7+ years | 0.6x |

---

## 6. Section 4: Life Events (8%)

### Auto-Critical Events (Immediate 100 Risk Score)

These bypass normal scoring:

| Event | Detection |
|-------|-----------|
| LIS/Extra Help status change (gained OR lost) | Blue Button |
| Medicaid status change (gained OR lost) | Blue Button |
| Moved out of service area | Blue Button |
| Plan terminated by CMS | CMS API |
| ESRD diagnosis | Blue Button |
| Nursing home admission | Blue Button |
| Involuntary disenrollment | CMS/Agent |

### SEP-Triggering Events (Minimum 80 Risk Score)

| Event | Score | SEP Window |
|-------|-------|------------|
| Address change (new county) | 80 | 63 days |
| Lost employer coverage | 85 | 63 days |
| Plan leaving service area | 90 | CMS-notified |
| Gained SNP-qualifying condition | 80 | Ongoing |
| Released from incarceration | 80 | 63 days |

### SEP Status Flag

When SEP detected:
- Client flagged as "SEP Active"
- Countdown timer displayed
- Priority queue for outreach
- Auto-workflow triggered

### Detection Methods

| Source | Events Detected |
|--------|-----------------|
| Blue Button 2.0 | LIS status, Medicaid status, diagnoses, address from claims |
| Agent entry | Family changes, financial, client conversations |
| CMS notices | Plan terminations, SEPs |

### Agent Follow-Up Credit

| Response | Modifier |
|----------|----------|
| Within response window | -60% points |
| Within 2x window | -30% points |
| Late | -10% points |
| Never addressed | Full points |

---

## 7. Section 5: External Risk (12%)

### Data Sources (All API/Auto-Pull)
- CMS Plan Finder API
- CMS Landscape Files
- Census ACS API

**No manual data entry required.**

### Market Competition

| Factor | Points | Source |
|--------|--------|--------|
| 7-10 plans in county | 12 | CMS API |
| 11+ plans in county | 20 | CMS API |
| 1-2 new plans entered | 8 | CMS Landscape |
| 3+ new plans entered | 15 | CMS Landscape |
| $0 premium plan available | 15 | CMS API |
| 4.5+ star competitor in county | 12 | CMS API |

### Premium Vulnerability

| Client Premium | Points |
|----------------|--------|
| $0/mo | 0 |
| $1-29/mo | 5 |
| $30-59/mo | 12 |
| $60-99/mo | 20 |
| $100+/mo | 28 |

### Demographic Factors

| Factor | Points | Source |
|--------|--------|--------|
| High senior % ZIP (25%+) | 10 | Census API |
| Low income ZIP | 12 | Census API |

### Baseline Solicitation Assumption
- All clients: +10 points
- Assumes all Medicare clients receive daily calls/mailers

### Auto-100 Trigger
- Client's carrier exiting county

### Rescan Frequency
- Every client rescanned nightly
- New score assigned daily
- Score history tracked for trend analysis

### ZIP Risk Pre-Calculation
- System auto-runs in September each year
- Calculates ZIP-level risk scores
- Applied to all clients automatically

---

## 8. Section 6: Temporal Modifiers & Final Score

### Temporal Additions (Points Added)

| Period | Dates | Points |
|--------|-------|--------|
| Pre-AEP | Oct 1-14 | +5 |
| AEP | Oct 15 - Dec 7 | +8 |
| Post-AEP | Dec 8-31 | +4 |
| OEP | Jan 1 - Mar 31 | +7 |
| Lock-in | Apr 1 - Sept 30 | +0 |

### New Client Additions

| Months Since Effective | Points |
|------------------------|--------|
| 0-3 months | +10 |
| 4-6 months | +6 |
| 7-12 months | +3 |
| 12+ months | +0 |

### First OEP After AEP Enrollment

| Post-Enrollment Contact | Points |
|------------------------|--------|
| No contact since enrollment | +18 |
| Had 30-day check-in only | +12 |
| Had 30 + 60 day check-ins | +5 |
| Had 30 + 60 + 90 day check-ins | +0 |

### Final Score Calculation

```
Step 1: Calculate Base Score (weighted categories)

Step 2: Check for Auto-100 Triggers
  - If ANY trigger present → Final Score = 100, skip other steps

Step 3: Add Temporal Points (based on current date)

Step 4: Add New Client Points OR apply Tenure Modifier
  - If client < 12 months: add New Client points
  - If client ≥ 12 months: apply Tenure Multiplier

Step 5: Add First OEP Points (if applicable)

Step 6: Cap at 100
  Final Score = MIN(Adjusted Score, 100)
```

### Risk Categories

| Score | Category | Color | Badge | Action |
|-------|----------|-------|-------|--------|
| 0-19 | Stable | Dark Green | Loyal | Quarterly touch |
| 20-34 | Low | Light Green | Good | Monitor |
| 35-49 | Medium | Yellow | Watch | Outreach within 14 days |
| 50-64 | Elevated | Orange | Attention | Outreach within 7 days |
| 65-79 | High | Light Red | Priority | Outreach within 48 hours |
| 80-89 | Critical | Red | Urgent | Same-day outreach |
| 90-100 | Severe | Dark Red | Emergency | Call immediately |

### Score Velocity Tracking

| 7-Day Trend | Indicator | Meaning |
|-------------|-----------|---------|
| Dropped 10+ points | ↓ Improving | Engagement working |
| Stable (±5 points) | → Stable | Monitor |
| Rose 10+ points | ↑ Rising | Something changed |
| Rose 20+ points | ⚠ Spiking | Investigate urgently |

### Score History Storage

| Timeframe | Storage |
|-----------|---------|
| 7 days | Daily scores (velocity) |
| 90 days | Daily scores (trend charts) |
| 1 year | Visible in full year chart |
| Forever | Monthly snapshots + churn events |

---

## 9. Section 7: Continuous Learning

### Call Outcome Modal

Pops up after every call with these options:

**RETAINED:**
- Staying with current plan - No changes
- Staying with current plan - Had questions answered
- Staying with current plan - Scheduled annual review
- Switching plans - Same carrier (still AOR)
- Switching plans - Different carrier (still AOR)

**AT RISK:**
- Undecided - Needs follow-up
- Considering other options - Scheduled review
- Unhappy with plan - Working on solution
- Unhappy with agent/service - Potential loss

**LOST:**
- Switched to another agent - Same carrier
- Switched to another agent - Different carrier
- Going direct through carrier
- Left Medicare Advantage (Original Medicare/Medigap)
- Moved out of service area
- Deceased

**NO CONTACT:**
- No answer - Left voicemail
- No answer - No voicemail left
- Wrong number / Disconnected
- Callback requested - Scheduled for [Date]

### If LOST - Capture Reason

- Cost / Premium too high
- Drug not covered / Too expensive
- Doctor not in network
- Better benefits elsewhere
- Poor service / Unhappy with plan
- Family/friend recommended someone else
- Competitor marketing / Got a better offer
- Life change (moved, Medicaid, etc.)
- Didn't need agent help
- Unknown / Wouldn't say

### Score Adjustments from Outcomes

**Retained:**
| Outcome | Adjustment |
|---------|------------|
| Staying - No changes | -15 points |
| Staying - Questions answered | -12 points |
| Staying - Scheduled review | -18 points |
| Switching plans - Same carrier | -10 points |
| Switching plans - Different carrier | -8 points |

**At Risk:**
| Outcome | Adjustment |
|---------|------------|
| Undecided | +5 points |
| Considering options | +10 points |
| Unhappy with plan | +8 points |
| Unhappy with agent | +15 points |

**No Contact:**
| Outcome | Adjustment |
|---------|------------|
| No answer - Left VM | +2 points |
| No answer - No VM | +3 points |
| Wrong number | +10 points + Data flag |
| Callback scheduled | No change |

**Lost:**
- Mark client as Churned
- Remove from active scoring
- Log for model learning

### Blue Button Verification

When Blue Button shows plan change and agent didn't log:

```
"Blue Button indicates [Client] may have a new plan.
Previous: [Old Plan]
Current: [New Plan]
Are you still the agent of record?"
```

### Model Performance Metrics (Monthly)

| Metric | Target |
|--------|--------|
| Precision | >60% |
| Recall | >80% |
| False Positive Rate | <30% |
| False Negative Rate | <15% |
| Lead Time | >45 days avg |

### Learning Adjustments

**Quarterly:** Analyze patterns, recommend weight adjustments
**Annually (January):** Full recalibration post-AEP
**Minimum:** 25 churns before recommendations
**Approval:** Admin approval required for changes

---

## 10. Dashboard & UI

### Alerts

**Immediate (Push + Dashboard):**
| Trigger | Alert Type |
|---------|------------|
| Score 90+ | EMERGENCY |
| Score 80-89 | URGENT |
| Auto-100 trigger | EMERGENCY |
| Score spike 25+ | WARNING |

**Daily (Email + Dashboard):**
- Morning briefing with overnight changes
- New Critical/Severe clients
- Category movements
- Biggest score changes

### Morning Briefing

Shows on login:
- Client count by category
- Immediate attention list (Critical/Severe)
- Biggest movers (up and down)
- "Start Priority Calls" button

### Priority Client List

- Sorted by score (highest first)
- Columns: Score, Trend, Name, Top Risk Factor, Last Contact
- Click row → Full client profile
- Filter by category

### Priority Call Queue

- "Start Priority Calls" opens queue
- Shows full client profile while on call
- Call outcome modal on completion
- Auto-returns to queue after save
- Next client loads automatically

### Client Profile Risk Section

- Risk score with breakdown by category
- Full year score history chart
- Top risk drivers with explanations
- Recommended actions (auto-generated)
- Quick action buttons: Call, Text, Schedule Review, Add Note

---

## 11. Founder Analytics

### Overview Panel
- Model status and last scan time
- Total clients monitored
- Risk distribution chart

### Model Accuracy Panel
- Precision, Recall, Lead Time metrics
- Prediction accuracy by category
- Calibration verification

### Churn Analysis Panel
- Total churned vs retained
- Churn by reason (pie chart)
- Churn by timing (AEP/OEP/SEP)
- Churn by tenure (Year 1/2/3+)

### Intervention Effectiveness Panel
- Retention rate by intervention type
- Comparison vs no intervention
- Best practices identification

### Risk Factor Analysis Panel
- Top factors in churned clients
- Correlation strength
- Actionable insights

### Agent Performance Panel
- Clients per agent
- High risk % per agent
- Retention rate per agent
- Average risk score per agent

### Report Generation

**Report Types:**
- Executive Summary (1 page)
- Full Churn Analysis
- Model Performance Report
- Intervention Effectiveness Report
- Agent Performance Comparison
- Risk Factor Analysis
- Custom Report

**Time Periods:**
- Last 30/90 days
- Last 6/12 months
- Year to Date
- Last AEP / Last OEP
- Custom range

**Formats:**
- PDF
- Excel
- CSV (data only)

**Options:**
- Charts & Visualizations
- Insights & Recommendations
- Client-level detail (appendix)

---

## 12. Data Sources & Integrations

### Required Integrations

| Integration | Purpose | Access |
|-------------|---------|--------|
| Blue Button 2.0 | Claims, Rx, utilization, LIS, addresses | CMS API (client OAuth) |
| CMS Plan Finder API | Plan data, premiums, stars | Public API |
| CMS Formulary Files | Drug coverage data | Annual download |
| CMS Network Files | Provider networks | Annual download |
| CMS Landscape Files | Plan availability by county | Annual download |
| Census ACS API | Demographics by ZIP | Public API |

### Data Refresh Schedule

| Data | Frequency |
|------|-----------|
| Blue Button | Daily (if new data available) |
| Risk scores | Nightly batch |
| CMS plan data | Annual (September) |
| ZIP demographics | Annual |
| Plan comparison | Annual (September) |

### No Manual Upload Required

All data pulled automatically via APIs.

---

## 13. Implementation Phases

### Phase 1: Core Scoring Engine
- Database schema for scores
- Engagement scoring (agent contact data)
- Daily batch scoring job
- Basic dashboard with risk list

### Phase 2: Blue Button Integration
- OAuth flow for client consent
- Claims/utilization scoring
- Rx coverage scoring
- Real-time alerts

### Phase 3: CMS Data Integration
- Plan comparison engine
- Formulary matching
- Network verification
- ANOC auto-scan

### Phase 4: Learning & Analytics
- Call outcome modal
- Churn logging
- Model performance metrics
- Founder analytics dashboard

### Phase 5: Automation
- Auto-workflows based on score changes
- Auto text/email for category changes
- Auto task creation with due dates
- Priority call queue

---

## Appendix A: All Auto-100 Triggers

| Trigger | Source |
|---------|--------|
| LIS status change | Blue Button |
| Medicaid status change | Blue Button |
| Moved out of service area | Blue Button |
| Plan terminated by CMS | CMS API |
| ESRD diagnosis | Blue Button |
| Nursing home admission | Blue Button |
| Involuntary disenrollment | CMS/Agent |
| Carrier exiting county | CMS API |
| PCP leaving network (confirmed) | CMS Network |
| Primary maintenance drug removed from formulary | CMS Formulary |

---

## Appendix B: Sample Score Calculation

**Client Profile:**
- With agent 6 months (new client)
- Enrolled last AEP (Nov 15)
- Current date: Feb 10 (OEP)
- Had 30-day check-in, missed 60-day
- Last meaningful contact: 45 days ago
- Phone pickup: 67%
- 1 drug not covered
- Pays $45/mo premium
- 11 plans in county

**Category Scores:**
- Engagement: 35 (days since contact + missed checkpoints)
- Utilization: 20 (normal, no major events)
- Benefit Fit: 40 (Rx issue + premium vulnerability)
- Life Events: 0 (none)
- External Risk: 45 (high competition ZIP)

**Base Score:**
```
(35 × 0.40) + (20 × 0.22) + (40 × 0.18) + (0 × 0.08) + (45 × 0.12)
= 14 + 4.4 + 7.2 + 0 + 5.4
= 31
```

**Add Temporal (OEP):** 31 + 7 = 38

**Add New Client (month 6):** 38 + 6 = 44

**Add First OEP (30-day only):** 44 + 12 = 56

**Final Score: 56 (Elevated)**

This client needs outreach within 7 days.

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2025 | Initial specification |

---

*End of Specification*
