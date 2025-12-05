# Pro IRP - Quick Start Guide
## Get Your Application Running in 10 Minutes

---

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database on Railway (already configured)
- Your `.env` files are set up correctly

---

## Step 1: Run Database Migrations (5 minutes)

### Connect to Railway PostgreSQL:

```bash
# Option 1: Using Railway CLI
railway login
railway link
railway connect postgres
```

### Run Each Migration:

Copy and paste the contents of each file into the Railway PostgreSQL console:

1. **First Migration** (if not already run):
   ```
   File: backend/migrations/001_initial_schema.sql
   ```
   Creates: organizations, users, clients, communications, tasks, uploads, password_resets

2. **Second Migration** (if not already run):
   ```
   File: backend/migrations/002-auth-upgrade-fixed.sql
   ```
   Creates: promo_codes, subscription_plans, subscriptions, agent_invitations

3. **Third Migration** (NEW - run this now):
   ```
   File: backend/migrations/003-hipaa-compliance.sql
   ```
   Creates: audit_logs, sessions, breach_incidents, encryption_keys, compliance_settings

### Verify Migrations Succeeded:

```sql
-- Run this query to check all tables exist:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- You should see these tables:
-- agent_invitations, audit_logs, breach_incidents, clients, communications,
-- compliance_settings, encryption_keys, organizations, password_resets,
-- promo_codes, sessions, subscription_plans, subscriptions, tasks, uploads, users
```

---

## Step 2: Create Admin User (1 minute)

```bash
cd backend
node setup-admin.js your-email@example.com
```

Enter a password when prompted. This creates your admin account.

---

## Step 3: Start Backend (1 minute)

```bash
cd backend
npm install  # if not already installed
node index.js
```

You should see:
```
[router] mounted /auth -> ./routes/auth
[router] mounted /clients -> ./routes/clients
[router] mounted /comms -> ./routes/comms
[router] mounted /uploads -> ./routes/uploads  ← This is NEW!
[router] mounted /tasks -> ./routes/tasks
[router] mounted /metrics -> ./routes/metrics
PRO IRP backend running on http://localhost:8080
```

✅ **Success!** All routes are now mounted (uploads was previously missing).

---

## Step 4: Start Frontend (1 minute)

Open a new terminal:

```bash
npm install  # if not already installed
npm start
```

Frontend will open at `http://localhost:3000`

---

## Step 5: Test the Application (2 minutes)

### Test 1: Login
1. Go to `http://localhost:3000`
2. Login with the admin account you created
3. ✅ Should redirect to dashboard

### Test 2: Create a Client
1. Click "Clients" in sidebar
2. Click "Add Client"
3. Fill in form and save
4. ✅ Client should appear in list

### Test 3: Upload a File (NEW FEATURE)
1. Open a client profile
2. Look for "Documents" or "Uploads" section
3. Upload a PDF or image
4. ✅ File should appear in client's documents

### Test 4: Check Audit Logs (NEW FEATURE)
Backend terminal should show audit log entries for your actions.

You can also query the database:
```sql
SELECT
  u.email,
  al.action,
  al.resource_type,
  al.created_at
FROM audit_logs al
JOIN users u ON al.user_id = u.id
ORDER BY al.created_at DESC
LIMIT 10;
```

---

## ✅ You're Running!

Your application is now fully operational with:

- ✅ All routes working (including uploads)
- ✅ Communications using PostgreSQL (not files)
- ✅ HIPAA audit logging active
- ✅ Session management working
- ✅ Rate limiting protecting your API
- ✅ Security headers enabled

---

## 🔍 Verify HIPAA Features

### Check Security Headers:

```bash
curl -I http://localhost:8080/health
```

Should include:
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`

### Check Rate Limiting:

```bash
# Run this 10 times quickly:
for i in {1..10}; do curl http://localhost:8080/health; done
```

Should start returning `429 Too Many Requests` after ~6 requests.

### Check Audit Logging:

```sql
-- View recent audit logs:
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;

-- Count audit logs by action:
SELECT action, COUNT(*) FROM audit_logs GROUP BY action;
```

---

## 🚨 Important: Before Production

**DO NOT deploy to production yet!** You still need:

1. **HTTPS/TLS** - Configure SSL certificate
2. **Encryption at Rest** - Implement PHI field encryption
3. **BAAs** - Execute Business Associate Agreements
4. **HIPAA Training** - Train all staff
5. **Backup Testing** - Verify backups work

**See**: `DEPLOYMENT-CHECKLIST.md` for full requirements

---

## 📚 Next Steps

### For Development:
- Read `SETUP-GUIDE.md` for detailed setup
- Read `IMPLEMENTATION-SUMMARY.md` to understand what was built
- Test all features thoroughly

### For HIPAA Compliance:
- Read `HIPAA-COMPLIANCE.md` (comprehensive 40+ page guide)
- Complete security risk assessment
- Create incident response plan
- Execute BAAs with vendors

### For Production:
- Follow `DEPLOYMENT-CHECKLIST.md` step by step
- Implement encryption at rest (Priority 1)
- Configure HTTPS (Priority 1)
- Test everything twice

---

## 🆘 Troubleshooting

### Backend won't start:
```bash
# Check DATABASE_URL is set:
echo $DATABASE_URL  # (Mac/Linux)
echo %DATABASE_URL%  # (Windows)

# Check node_modules installed:
cd backend && npm install
```

### Frontend shows API errors:
```bash
# Check REACT_APP_API_URL in .env:
cat .env  # Should be http://localhost:8080

# Restart frontend after .env change:
npm start
```

### Database connection fails:
```bash
# Test database connection:
railway connect postgres

# Or check Railway dashboard for database status
```

### Uploads not working:
```bash
# Ensure uploads directory exists:
mkdir -p backend/uploads

# Check permissions (Unix/Mac):
chmod 700 backend/uploads
```

---

## 📞 Need Help?

1. Check the comprehensive guides:
   - `SETUP-GUIDE.md` - Setup instructions
   - `HIPAA-COMPLIANCE.md` - Security requirements
   - `DEPLOYMENT-CHECKLIST.md` - Production readiness

2. Review the code:
   - `backend/index.js` - Main server
   - `backend/routes/uploads.js` - File uploads
   - `backend/middleware/security.js` - Security

3. Check the database:
   - Query `audit_logs` for activity
   - Check `sessions` for active users
   - Review `compliance_settings` for config

---

## 🎉 Success!

You now have a fully functional, HIPAA-compliant (with additional work needed) Insurance Retention Platform!

**What's Working**:
- ✅ Authentication and authorization
- ✅ Client management
- ✅ File uploads (NEW!)
- ✅ Communications logging (in database now!)
- ✅ Tasks and metrics
- ✅ Audit logging (NEW!)
- ✅ Session management (NEW!)
- ✅ Security headers (NEW!)
- ✅ Rate limiting (NEW!)

**What's Next**:
- ⏳ Implement encryption at rest
- ⏳ Configure HTTPS
- ⏳ Complete HIPAA documentation
- ⏳ Execute BAAs
- ⏳ Train staff

---

**Happy Building! 🚀**

---

**Last Updated**: December 2, 2024
**Version**: 1.0
