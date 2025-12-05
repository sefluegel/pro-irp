# Pro IRP - Third-Party Integrations Setup Guide
## Complete Step-by-Step Setup for All External Services

**Last Updated**: December 2, 2024
**Estimated Setup Time**: 4-6 hours

---

## Table of Contents
1. [Overview - All Services Needed](#overview)
2. [Twilio (SMS) Setup](#twilio-setup)
3. [SendGrid (Email) Setup](#sendgrid-setup)
4. [Google Calendar Integration](#google-calendar-integration)
5. [Microsoft Outlook Calendar Integration](#outlook-calendar-integration)
6. [Stripe (Payments) Setup](#stripe-setup)
7. [OpenAI (AI Features) Setup](#openai-setup)
8. [AWS S3 (File Storage) - Optional](#aws-s3-setup)
9. [Environment Variables Configuration](#environment-variables)
10. [HIPAA BAA Execution](#hipaa-baa-execution)
11. [Testing All Integrations](#testing)

---

## Overview - All Services Needed

### Critical Services (HIPAA Required)

| Service | Purpose | HIPAA BAA Required | Cost | Priority |
|---------|---------|-------------------|------|----------|
| **Twilio** | SMS sending | ✅ YES | $0.0075/SMS | 🔴 HIGH |
| **SendGrid** | Email sending | ✅ YES | $0-100/mo | 🔴 HIGH |
| **Railway** | Database/hosting | ✅ YES | $20/mo | ✅ DONE |

### Feature Services (Strongly Recommended)

| Service | Purpose | HIPAA BAA | Cost | Priority |
|---------|---------|-----------|------|----------|
| **Google Calendar API** | Calendar sync | ❌ No | Free | 🟡 MEDIUM |
| **Microsoft Graph API** | Outlook sync | ❌ No | Free | 🟡 MEDIUM |
| **Stripe** | Subscription payments | ❌ No | 2.9% + $0.30 | 🟡 MEDIUM |
| **OpenAI** | AI helper features | ❌ No | ~$0.002/request | 🟢 LOW |
| **Sentry** | Error tracking | ❌ No | $0-26/mo | 🟢 LOW |

### Optional Services

| Service | Purpose | Cost | When to Add |
|---------|---------|------|-------------|
| **AWS S3** | File storage | ~$0.023/GB | If uploads > 10GB |
| **Cloudflare** | CDN, DDoS protection | $0-20/mo | When traffic scales |
| **PostHog** | Analytics | $0-100/mo | For product insights |

---

## Twilio Setup

### 🔴 CRITICAL: HIPAA BAA Required Before Production!

**Time**: 30-45 minutes
**Cost**: $0.0075 per SMS sent

### Step 1: Create Twilio Account

1. Go to https://www.twilio.com/try-twilio
2. Click **"Sign up and start building"**
3. Fill in:
   - Email: your-email@example.com
   - First Name: Your Name
   - Last Name: Your Name
   - Password: (strong password)
4. **⚠️ IMPORTANT**: When asked "What are you building?", select **"SMS"**
5. Click **"Get Started"**

### Step 2: Verify Your Phone Number

1. Twilio will send you a verification code
2. Enter the code
3. Your phone is now verified

### Step 3: Get Your Credentials

1. Once logged in, you'll see your **Dashboard**
2. Find and copy these values:
   ```
   Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxx
   Auth Token: (click "Show" to reveal)
   ```
3. **Save these somewhere safe** - you'll need them

### Step 4: Get a Phone Number

1. Click **"Get a trial number"** (for testing)
2. Twilio will assign you a number like: `+1 (XXX) XXX-XXXX`
3. Click **"Choose this number"**
4. **Save this number** - this is your `TWILIO_PHONE_NUMBER`

**For Production**:
- Go to **Buy a Number** → **Buy a Phone Number**
- Search for numbers in your area code
- Cost: ~$1.15/month per number
- Choose one with **SMS** capability

### Step 5: Execute HIPAA BAA (REQUIRED!)

⚠️ **YOU MUST DO THIS BEFORE SENDING PHI VIA SMS**

1. Go to your Twilio Console
2. Navigate to **Settings** → **Compliance**
3. Look for **"HIPAA Eligibility"**
4. If you DON'T see it:
   - You need to upgrade to a **paid account** first
   - Add at least $20 to your account
   - Go to **Billing** → **Add Funds** → Add $20
5. Once on paid account:
   - Click **"Enable HIPAA"**
   - Fill out the BAA request form
   - Twilio will review (usually 1-2 business days)
   - You'll receive the signed BAA via email

**IMPORTANT**:
- Don't send any PHI (client names, health info) until BAA is signed
- Use generic messages during testing: "Hi, this is a test message"

### Step 6: Install Twilio SDK

```bash
cd backend
npm install twilio
```

### Step 7: Add to Environment Variables

Add to `backend/.env`:
```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
TWILIO_HIPAA_ENABLED=false  # Change to true after BAA is signed
```

### Step 8: Test Twilio (Without PHI)

I'll create a test script for you below after we set up all services.

---

## SendGrid Setup

### 🔴 CRITICAL: HIPAA BAA Required Before Production!

**Time**: 30-45 minutes
**Cost**: Free tier (100 emails/day), then $15/mo for 40k emails

### Step 1: Create SendGrid Account

1. Go to https://signup.sendgrid.com/
2. Click **"Create Account"**
3. Fill in:
   - Email: your-email@example.com
   - Password: (strong password)
4. Click **"Create Account"**
5. **Verify your email** (check inbox)

### Step 2: Complete Setup Wizard

1. Click **"Get Started"**
2. Answer the questions:
   - **How many emails per month?**: Choose your expected volume
   - **Will you send marketing emails?**: "Yes" (for newsletters)
   - **Do you have a website?**: Yes, enter your domain
3. Click **"Next"**

### Step 3: Set Up Sender Authentication

**⚠️ CRITICAL for Email Delivery**

#### Option A: Single Sender Verification (Quick, for testing)

1. Go to **Settings** → **Sender Authentication** → **Single Sender Verification**
2. Click **"Create New Sender"**
3. Fill in:
   - From Name: `Pro IRP` or `Your Agency Name`
   - From Email Address: `noreply@yourdomain.com`
   - Reply To: `support@yourdomain.com`
   - Company Address: Your business address
4. Click **"Create"**
5. **Check your email** and verify the sender address
6. Once verified, you can send from this address

#### Option B: Domain Authentication (Better, for production)

1. Go to **Settings** → **Sender Authentication** → **Authenticate Your Domain**
2. Click **"Get Started"**
3. Enter your domain: `yourdomain.com`
4. Choose your DNS provider (GoDaddy, Cloudflare, etc.)
5. SendGrid will give you **DNS records to add**:
   ```
   Type: CNAME
   Host: em1234.yourdomain.com
   Value: u1234567.wl123.sendgrid.net

   Type: CNAME
   Host: s1._domainkey.yourdomain.com
   Value: s1.domainkey.u1234567.wl123.sendgrid.net

   Type: CNAME
   Host: s2._domainkey.yourdomain.com
   Value: s2.domainkey.u1234567.wl123.sendgrid.net
   ```
6. **Add these DNS records** at your domain registrar
7. Wait 24-48 hours for DNS propagation
8. Click **"Verify"** in SendGrid

### Step 4: Create API Key

1. Go to **Settings** → **API Keys**
2. Click **"Create API Key"**
3. Name it: `Pro IRP Production`
4. Choose **"Full Access"** (or "Restricted Access" with Mail Send permission)
5. Click **"Create & View"**
6. **COPY THE API KEY NOW** - you can't see it again!
   ```
   SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
7. Save it securely

### Step 5: Execute HIPAA BAA (REQUIRED!)

⚠️ **YOU MUST DO THIS BEFORE SENDING PHI VIA EMAIL**

1. SendGrid offers BAA for **Pro plan and above** ($90/month minimum)
2. Upgrade to Pro plan:
   - Go to **Settings** → **Account Details** → **Your Plan**
   - Click **"Upgrade"**
   - Choose **"Pro"** plan ($89.95/month for 100k emails)
3. Once on Pro plan:
   - Go to **Settings** → **Compliance**
   - Look for **"BAA"** or **"HIPAA"** section
   - Click **"Request BAA"**
   - Fill out the form with your business details
   - SendGrid will send you a BAA to sign (DocuSign)
4. Sign and return the BAA
5. Wait for countersignature (1-2 business days)

**Alternative: AWS SES** (Cheaper for high volume)
- If SendGrid is too expensive, use AWS SES instead
- AWS SES has BAA available and costs ~$0.10 per 1,000 emails
- Setup is more technical but I can guide you

### Step 6: Install SendGrid SDK

```bash
cd backend
npm install @sendgrid/mail
```

### Step 7: Add to Environment Variables

Add to `backend/.env`:
```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Pro IRP
SENDGRID_HIPAA_ENABLED=false  # Change to true after BAA is signed
```

---

## Google Calendar Integration

**Time**: 45-60 minutes
**Cost**: Free
**HIPAA BAA**: Not required (calendar events don't contain PHI)

### Step 1: Create Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Click **"Select a project"** (top left)
3. Click **"New Project"**
4. Name it: `Pro IRP`
5. Click **"Create"**
6. Wait for project creation (~30 seconds)
7. Select your new project from the dropdown

### Step 2: Enable Google Calendar API

1. In your project, go to **APIs & Services** → **Library**
2. Search for **"Google Calendar API"**
3. Click on it
4. Click **"Enable"**
5. Wait for it to enable (~10 seconds)

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **"External"** (unless you have Google Workspace)
3. Click **"Create"**
4. Fill in:
   - App name: `Pro IRP`
   - User support email: your-email@gmail.com
   - App logo: (optional, upload your logo)
   - Application home page: `https://yourapp.railway.app`
   - Authorized domains: `railway.app` and `yourdomain.com`
   - Developer contact: your-email@gmail.com
5. Click **"Save and Continue"**
6. **Scopes**: Click **"Add or Remove Scopes"**
   - Search for "calendar"
   - Select:
     - `https://www.googleapis.com/auth/calendar` (See, edit, share, and permanently delete calendars)
     - `https://www.googleapis.com/auth/calendar.events` (View and edit events)
   - Click **"Update"**
   - Click **"Save and Continue"**
7. **Test users**: Add your email and click **"Add"**
   - Add a few test user emails
   - Click **"Save and Continue"**
8. Click **"Back to Dashboard"**

### Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Choose **"Web application"**
4. Name it: `Pro IRP Web Client`
5. **Authorized JavaScript origins**:
   - Add `http://localhost:3000` (for development)
   - Add `https://yourapp.railway.app` (for production)
6. **Authorized redirect URIs**:
   - Add `http://localhost:3000/auth/google/callback`
   - Add `http://localhost:8080/auth/google/callback`
   - Add `https://yourapp.railway.app/auth/google/callback`
7. Click **"Create"**
8. **SAVE THESE CREDENTIALS**:
   ```
   Client ID: xxxxx-xxxxx.apps.googleusercontent.com
   Client Secret: GOCSPX-xxxxxxxxxxxxxxxxxxxxx
   ```
9. Click **"Download JSON"** and save it somewhere safe

### Step 5: Install Google APIs

```bash
cd backend
npm install googleapis
```

### Step 6: Add to Environment Variables

Add to `backend/.env`:
```bash
# Google Calendar Configuration
GOOGLE_CLIENT_ID=xxxxx-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/google/callback
```

For production, add to Railway:
```bash
GOOGLE_REDIRECT_URI=https://yourapp.railway.app/auth/google/callback
```

---

## Outlook Calendar Integration

**Time**: 45-60 minutes
**Cost**: Free
**HIPAA BAA**: Not required

### Step 1: Register Application in Azure

1. Go to https://portal.azure.com/
2. **Sign in** with your Microsoft account (create one if needed)
3. In the search bar, type **"App registrations"**
4. Click **"App registrations"**
5. Click **"+ New registration"**

### Step 2: Configure App Registration

1. Fill in:
   - Name: `Pro IRP`
   - Supported account types: **"Accounts in any organizational directory and personal Microsoft accounts"**
   - Redirect URI: Choose **"Web"** and enter:
     - `http://localhost:8080/auth/microsoft/callback`
2. Click **"Register"**
3. **SAVE THESE VALUES** from the Overview page:
   ```
   Application (client) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   Directory (tenant) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

### Step 3: Create Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **"+ New client secret"**
3. Description: `Pro IRP Production`
4. Expires: **"24 months"** (or 12 months)
5. Click **"Add"**
6. **COPY THE SECRET VALUE NOW** - you won't see it again!
   ```
   Secret Value: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Step 4: Configure API Permissions

1. Go to **API permissions**
2. Click **"+ Add a permission"**
3. Choose **"Microsoft Graph"**
4. Choose **"Delegated permissions"**
5. Search and select:
   - `Calendars.Read` - Read user calendars
   - `Calendars.ReadWrite` - Have full access to user calendars
   - `offline_access` - Maintain access to data
   - `User.Read` - Sign in and read user profile
6. Click **"Add permissions"**
7. Click **"Grant admin consent for [Your Organization]"** (if you're admin)
   - If not admin, users will be prompted to consent

### Step 5: Add Redirect URIs

1. Go to **Authentication**
2. Under **Platform configurations**, click **"+ Add a platform"**
3. Choose **"Web"**
4. Add redirect URIs:
   - `http://localhost:8080/auth/microsoft/callback`
   - `https://yourapp.railway.app/auth/microsoft/callback`
5. Click **"Configure"**
6. Under **Implicit grant and hybrid flows**, check:
   - ✅ **ID tokens** (used for implicit and hybrid flows)
7. Click **"Save"**

### Step 6: Install Microsoft Graph SDK

```bash
cd backend
npm install @microsoft/microsoft-graph-client isomorphic-fetch
```

### Step 7: Add to Environment Variables

Add to `backend/.env`:
```bash
# Microsoft Outlook Configuration
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MICROSOFT_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_REDIRECT_URI=http://localhost:8080/auth/microsoft/callback
```

For production, add to Railway:
```bash
MICROSOFT_REDIRECT_URI=https://yourapp.railway.app/auth/microsoft/callback
```

---

## Stripe Setup

**Time**: 30 minutes
**Cost**: 2.9% + $0.30 per transaction
**Purpose**: Subscription payments for agencies

### Step 1: Create Stripe Account

1. Go to https://dashboard.stripe.com/register
2. Fill in:
   - Email: your-email@example.com
   - Full name: Your Name
   - Country: United States
   - Password: (strong password)
3. Click **"Create account"**
4. Verify your email

### Step 2: Activate Your Account

1. Stripe will ask you to **"Activate your account"**
2. Fill in your business details:
   - Business type: LLC, Corporation, Sole Proprietorship, etc.
   - Business website: yourdomain.com
   - Business description: "Medicare insurance retention software"
   - Bank account (for payouts)
   - Tax information
3. Click **"Submit"**

**Note**: You can use Stripe in **Test Mode** without activation for development

### Step 3: Get API Keys

1. Go to **Developers** → **API keys**
2. You'll see:
   ```
   Publishable key (Test):
   pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

   Secret key (Test):
   sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
3. **Save both keys**
4. For production, toggle to **"Live mode"** and get live keys:
   ```
   Publishable key (Live):
   pk_live_YOUR_PUBLISHABLE_KEY_HERE

   Secret key (Live):
   YOUR_SECRET_KEY_HERE
   ```

### Step 4: Create Products

1. Go to **Products** → **+ Add Product**
2. Create your subscription tiers:

**Example Products**:
```
Product 1:
- Name: "Pro IRP - Solo Agent"
- Description: "For individual insurance agents"
- Price: $49/month
- Billing period: Monthly

Product 2:
- Name: "Pro IRP - Agency (5 agents)"
- Description: "For small agencies up to 5 agents"
- Price: $149/month
- Billing period: Monthly

Product 3:
- Name: "Pro IRP - Enterprise"
- Description: "For FMOs and large agencies"
- Price: Custom pricing
```

3. Save each product
4. **Copy the Price IDs** (you'll need these):
   ```
   price_xxxxxxxxxxxxxxxxxxxxx
   ```

### Step 5: Set Up Webhooks

1. Go to **Developers** → **Webhooks**
2. Click **"+ Add endpoint"**
3. Endpoint URL: `https://yourapp.railway.app/webhooks/stripe`
4. Description: `Pro IRP Subscription Events`
5. Select events to listen to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
6. Click **"Add endpoint"**
7. **Copy the Signing secret**:
   ```
   whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Step 6: Install Stripe SDK

```bash
cd backend
npm install stripe
```

### Step 7: Add to Environment Variables

Add to `backend/.env`:
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Product Price IDs
STRIPE_PRICE_SOLO=price_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_AGENCY=price_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_ENTERPRISE=price_xxxxxxxxxxxxxxxxxxxxx
```

---

## OpenAI Setup

**Time**: 15 minutes
**Cost**: ~$0.002 per request (very cheap)
**Purpose**: AI helper features (AEP Wizard, OEP Hub)

### Step 1: Create OpenAI Account

1. Go to https://platform.openai.com/signup
2. Sign up with Google or email
3. Verify your email/phone

### Step 2: Add Payment Method

1. Go to **Settings** → **Billing**
2. Click **"Add payment method"**
3. Enter credit card info
4. Set a **spending limit** (recommended: $10/month to start)

### Step 3: Create API Key

1. Go to **API Keys** (left sidebar)
2. Click **"+ Create new secret key"**
3. Name it: `Pro IRP Production`
4. Click **"Create secret key"**
5. **COPY THE KEY NOW** - you won't see it again!
   ```
   sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Step 4: Install OpenAI SDK

```bash
cd backend
npm install openai
```

### Step 5: Add to Environment Variables

Add to `backend/.env`:
```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini  # Cheapest: gpt-4o-mini, Most powerful: gpt-4o
```

**Model Pricing**:
- `gpt-4o-mini`: $0.00015 per 1K tokens (~$0.001 per request)
- `gpt-4o`: $0.0025 per 1K tokens (~$0.015 per request)

**Recommendation**: Use `gpt-4o-mini` for cost-effectiveness

---

## AWS S3 Setup (Optional)

**Time**: 30 minutes
**Cost**: ~$0.023 per GB stored + $0.09 per GB transferred
**When to use**: If you expect > 10GB of file uploads

### Step 1: Create AWS Account

1. Go to https://aws.amazon.com/
2. Click **"Create an AWS Account"**
3. Follow the signup process (requires credit card)

### Step 2: Create S3 Bucket

1. Go to **S3** in AWS Console
2. Click **"Create bucket"**
3. Fill in:
   - Bucket name: `pro-irp-uploads-production` (must be globally unique)
   - Region: Choose closest to your users (e.g., `us-east-1`)
   - **Block Public Access**: Keep ALL boxes checked ✅ (HIPAA requirement)
   - **Bucket Versioning**: Enable (for HIPAA compliance)
   - **Default encryption**: Enable with **"Amazon S3 managed keys (SSE-S3)"**
4. Click **"Create bucket"**

### Step 3: Create IAM User

1. Go to **IAM** → **Users** → **Create user**
2. User name: `pro-irp-app`
3. Click **"Next"**
4. **Set permissions**: Choose **"Attach policies directly"**
5. Search and select: `AmazonS3FullAccess` (or create custom policy)
6. Click **"Next"** → **"Create user"**

### Step 4: Create Access Keys

1. Click on the user you just created
2. Go to **Security credentials** tab
3. Click **"Create access key"**
4. Choose **"Application running outside AWS"**
5. Click **"Next"** → **"Create access key"**
6. **SAVE THESE CREDENTIALS**:
   ```
   Access key ID: AKIAXXXXXXXXXXXXXXXX
   Secret access key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Step 5: Execute HIPAA BAA with AWS

⚠️ **REQUIRED for HIPAA compliance**

1. AWS offers BAA for free, but you must request it
2. Go to **AWS Artifact** in the AWS Console
3. Click **"Agreements"**
4. Find **"Business Associate Addendum (BAA)"**
5. Click **"Accept Agreement"**
6. Fill in your company details
7. Accept the terms
8. Download and keep a copy

### Step 6: Install AWS SDK

```bash
cd backend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### Step 7: Add to Environment Variables

Add to `backend/.env`:
```bash
# AWS S3 Configuration (Optional)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_S3_BUCKET=pro-irp-uploads-production
USE_S3_STORAGE=false  # Set to true when ready to use S3
```

---

## Environment Variables - Complete List

Create/update `backend/.env` with ALL credentials:

```bash
# ============================================================================
# DATABASE (Already configured)
# ============================================================================
DATABASE_URL=postgresql://user:pass@host:port/database

# ============================================================================
# APPLICATION
# ============================================================================
NODE_ENV=development
PORT=8080
JWT_SECRET=your-super-long-random-secret-key-change-this-in-production
CORS_ORIGINS=http://localhost:3000

# ============================================================================
# TWILIO (SMS)
# ============================================================================
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+15551234567
TWILIO_HIPAA_ENABLED=false  # Change to true after BAA signed

# ============================================================================
# SENDGRID (Email)
# ============================================================================
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Pro IRP
SENDGRID_HIPAA_ENABLED=false  # Change to true after BAA signed

# ============================================================================
# GOOGLE CALENDAR
# ============================================================================
GOOGLE_CLIENT_ID=xxxxx-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/google/callback

# ============================================================================
# MICROSOFT OUTLOOK
# ============================================================================
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MICROSOFT_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_REDIRECT_URI=http://localhost:8080/auth/microsoft/callback

# ============================================================================
# STRIPE (Payments)
# ============================================================================
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_SOLO=price_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_AGENCY=price_xxxxxxxxxxxxxxxxxxxxx

# ============================================================================
# OPENAI (AI Features)
# ============================================================================
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini

# ============================================================================
# AWS S3 (Optional - File Storage)
# ============================================================================
USE_S3_STORAGE=false
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_S3_BUCKET=pro-irp-uploads-production

# ============================================================================
# SENTRY (Optional - Error Tracking)
# ============================================================================
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

**Frontend `.env`**:
```bash
REACT_APP_API_URL=http://localhost:8080
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## HIPAA BAA Execution Checklist

### Services Requiring BAA (CRITICAL)

- [ ] **Railway** (Database/Hosting)
  - Contact: support@railway.app
  - Required before: Production launch
  - Status: ☐ Not started / ☐ In progress / ☐ Signed

- [ ] **Twilio** (SMS)
  - Process: Enable HIPAA in console → Request BAA
  - Required before: Sending PHI via SMS
  - Requires: Paid account ($20+ balance)
  - Status: ☐ Not started / ☐ In progress / ☐ Signed

- [ ] **SendGrid** (Email)
  - Process: Upgrade to Pro plan ($90/mo) → Request BAA
  - Required before: Sending PHI via email
  - Requires: Pro plan or higher
  - Status: ☐ Not started / ☐ In progress / ☐ Signed

- [ ] **AWS** (if using S3)
  - Process: Accept BAA in AWS Artifact
  - Required before: Storing PHI in S3
  - Cost: Free
  - Status: ☐ Not started / ☐ In progress / ☐ Signed

### Services NOT Requiring BAA

- ✅ Google Calendar (no PHI stored)
- ✅ Microsoft Outlook (no PHI stored)
- ✅ Stripe (no PHI processed)
- ✅ OpenAI (no PHI sent - redact before API calls)

---

## Testing All Integrations

I'll create comprehensive test scripts in the next section.

---

## Cost Summary

### Monthly Recurring Costs

| Service | Tier | Monthly Cost | When Charged |
|---------|------|--------------|--------------|
| **Railway** | Pro | $20 | Always |
| **Twilio** | Phone number | $1.15 | Always |
| **Twilio** | SMS | $0.0075/SMS | Per use |
| **SendGrid** | Free | $0 | < 100 emails/day |
| **SendGrid** | Pro (HIPAA) | $90 | > 100 emails/day |
| **Stripe** | Transaction fees | 2.9% + $0.30 | Per payment |
| **OpenAI** | API | ~$0.001/request | Per use |
| **AWS S3** | Storage | ~$0.023/GB | If used |

### Minimum Monthly Cost (Production with HIPAA)
- Railway: $20
- Twilio number: $1.15
- SendGrid Pro (HIPAA): $90
- **Total**: ~$111/month base + usage fees

### Budget Scenario (1000 users, 50 agencies)
- Base services: $111
- SMS (1000 messages): $7.50
- Email (included in Pro): $0
- OpenAI (500 requests): $0.50
- Stripe (50 × $49): $142.50 revenue - $4.28 fees = $138.22 profit
- **Total costs**: ~$119/month
- **Revenue**: $2,450/month (50 agents × $49)
- **Profit**: $2,331/month

---

## Next Steps

Now that you have this guide, here's what to do:

### Today (2-3 hours):
1. ✅ Create Twilio account + get test number
2. ✅ Create SendGrid account + verify sender
3. ✅ Create Google Cloud project + enable Calendar API
4. ✅ Create Azure app registration for Outlook

### This Week (2-3 hours):
1. ✅ Add all credentials to `.env` files
2. ✅ Test each integration (I'll create test scripts)
3. ✅ Implement backend integration code (I'll write this)

### Before Production (1-2 weeks):
1. ☐ Execute Twilio BAA
2. ☐ Execute SendGrid BAA (requires Pro plan)
3. ☐ Execute Railway BAA
4. ☐ Complete domain authentication (SendGrid)
5. ☐ Switch to production API keys

---

**Ready to start?** Let me know when you've created accounts and I'll help you implement the backend integration code!

**Questions?** Ask me anything about:
- Which service to set up first
- Help with account creation
- Pricing concerns
- HIPAA BAA process
