# Pro IRP - Production Deployment Checklist

## Pre-Deployment Requirements

### 1. Database Setup ✅
- [ ] Run migration `001_initial_schema.sql` on Railway PostgreSQL
- [ ] Run migration `002-auth-upgrade-fixed.sql` (UUID version)
- [ ] Run migration `003-hipaa-compliance.sql`
- [ ] Verify all tables created successfully
- [ ] Run `node backend/setup-admin.js your-email@example.com` to create admin user

### 2. Environment Variables ⚠️
#### Backend (.env)
```bash
# Required
DATABASE_URL=postgresql://user:pass@host:port/database
JWT_SECRET=<64+ character random string>

# Security
NODE_ENV=production
PORT=8080

# CORS (comma-separated)
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Optional
APP_VERSION=1.0.0
COMMIT_SHA=<git-commit-sha>
BUILD_TIME=<iso-timestamp>
```

#### Frontend (.env)
```bash
REACT_APP_API_URL=https://api.your-domain.com
```

### 3. SSL/TLS Certificate 🔴 CRITICAL
- [ ] Obtain SSL certificate for production domain
- [ ] Configure Railway to use HTTPS
- [ ] Test HTTPS connection
- [ ] Force HTTPS redirect (already configured)
- [ ] Verify HSTS header

### 4. Business Associate Agreements (BAAs) 🔴 CRITICAL
- [ ] Execute BAA with Railway (database hosting)
- [ ] Execute BAA with email provider (SendGrid/AWS SES)
- [ ] Execute BAA with SMS provider (Twilio) - if used
- [ ] Execute BAA with error tracking (Sentry) - if used
- [ ] Document all BAAs

### 5. Backup Configuration 🔴 CRITICAL
- [ ] Enable Railway automatic daily backups
- [ ] Set backup retention to 7+ years (audit logs)
- [ ] Test backup restoration procedure
- [ ] Document backup/restore process
- [ ] Schedule regular backup tests (monthly)

### 6. Security Hardening ✅
- [x] Rate limiting enabled
- [x] Security headers (Helmet)
- [x] Audit logging enabled
- [x] Session management
- [x] Input validation
- [ ] **TODO**: Implement encryption at rest
- [ ] **TODO**: Implement file encryption
- [ ] **TODO**: Implement MFA (recommended)

### 7. Monitoring & Logging
- [ ] Set up error tracking (Sentry already in package.json)
- [ ] Configure log aggregation
- [ ] Set up uptime monitoring
- [ ] Configure alerting for:
  - Failed login attempts (5+ in 15 min)
  - Breach incidents
  - Database connection errors
  - High error rates

### 8. HIPAA Compliance 🔴 CRITICAL
- [ ] Review HIPAA-COMPLIANCE.md document
- [ ] Complete security risk assessment
- [ ] Create incident response plan
- [ ] Develop HIPAA training program
- [ ] Create Notice of Privacy Practices
- [ ] Document all policies and procedures
- [ ] Assign Security Officer
- [ ] Assign Privacy Officer

### 9. Testing
- [ ] Test all authentication flows (signup, login, password reset)
- [ ] Test role-based access control (admin, agency, agent)
- [ ] Test client CRUD operations
- [ ] Test file uploads and downloads
- [ ] Test communications logging
- [ ] Test audit logging
- [ ] Test session timeout
- [ ] Test rate limiting
- [ ] Run security scan (OWASP ZAP or similar)
- [ ] Load testing (if expecting high traffic)

### 10. Documentation
- [x] HIPAA Compliance Documentation
- [x] Setup Guide (SETUP-GUIDE.md)
- [ ] API Documentation
- [ ] User Manual
- [ ] Admin Guide
- [ ] Incident Response Plan
- [ ] Disaster Recovery Plan

## Deployment Steps

### Step 1: Deploy Backend to Railway

```bash
# 1. Connect to Railway
railway login

# 2. Link to project
railway link

# 3. Deploy backend
cd backend
railway up

# 4. Verify deployment
railway logs

# 5. Set environment variables in Railway dashboard
# DATABASE_URL (auto-set by Railway)
# JWT_SECRET
# CORS_ORIGINS
# NODE_ENV=production
```

### Step 2: Run Database Migrations

```bash
# Option 1: Using Railway CLI
railway connect postgres

# Then paste contents of each migration file:
# 1. backend/migrations/001_initial_schema.sql
# 2. backend/migrations/002-auth-upgrade-fixed.sql
# 3. backend/migrations/003-hipaa-compliance.sql

# Option 2: Using Railway Dashboard
# Go to PostgreSQL service → Data → Query
# Paste and run each migration
```

### Step 3: Create Admin User

```bash
# SSH into Railway backend service
railway run node setup-admin.js your-email@example.com
```

### Step 4: Deploy Frontend

```bash
# 1. Build frontend
cd ../  # back to root
npm run build

# 2. Deploy to hosting (Vercel, Netlify, or Railway)
# Vercel example:
vercel --prod

# Set environment variable:
# REACT_APP_API_URL=https://your-backend-url.railway.app
```

### Step 5: Verify Deployment

```bash
# Test API health
curl https://your-backend-url.railway.app/health

# Test HTTPS redirect
curl -I http://your-backend-url.railway.app
# Should return 301 redirect to HTTPS

# Test security headers
curl -I https://your-backend-url.railway.app
# Should include: Strict-Transport-Security, X-Frame-Options, etc.

# Test rate limiting
for i in {1..10}; do curl https://your-backend-url.railway.app/health; done
# Should start returning 429 after hitting limit

# Test authentication
curl -X POST https://your-backend-url.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'
```

## Post-Deployment

### Immediate (Day 1)
- [ ] Monitor error logs for first 24 hours
- [ ] Test all critical user flows
- [ ] Verify backup ran successfully
- [ ] Check audit logs are being created
- [ ] Test password reset flow

### Within 7 Days
- [ ] Complete security risk assessment
- [ ] Train all staff on HIPAA compliance
- [ ] Document all procedures
- [ ] Test incident response plan

### Within 30 Days
- [ ] Conduct penetration test
- [ ] Review all audit logs
- [ ] Verify all BAAs executed
- [ ] Complete privacy policy documentation

### Ongoing
- [ ] Daily: Review audit logs for suspicious activity
- [ ] Weekly: Review failed login attempts
- [ ] Monthly: Backup restoration test
- [ ] Quarterly: Security policy review
- [ ] Annually: HIPAA training refresh, full security audit

## Rollback Plan

If deployment fails:

```bash
# 1. Revert to previous Railway deployment
railway rollback

# 2. Check database state
railway connect postgres
# Verify migrations didn't corrupt data

# 3. If database needs rollback:
# Restore from backup (test this before going live!)

# 4. Notify users of downtime
# Use status page or email

# 5. Investigate issue
# Check Railway logs
# Check database connection
# Check environment variables
```

## Emergency Contacts

- **Railway Support**: support@railway.app
- **Security Officer**: [TO BE ASSIGNED]
- **Privacy Officer**: [TO BE ASSIGNED]
- **On-Call Developer**: [TO BE ASSIGNED]
- **HHS Breach Notification**: 1-866-627-7748

## Critical Metrics to Monitor

1. **Uptime**: Target 99.9% (43.2 min/month downtime)
2. **Response Time**: Target <500ms for API calls
3. **Error Rate**: Target <0.1%
4. **Failed Login Rate**: Alert if >5% of attempts fail
5. **Database Connection Pool**: Alert if >80% utilized
6. **Disk Space**: Alert if >80% full
7. **Backup Success Rate**: Must be 100%

## Success Criteria

✅ Deployment is successful when:
- [ ] All routes return 200/expected status codes
- [ ] HTTPS is enforced
- [ ] Security headers are present
- [ ] Rate limiting is working
- [ ] Audit logging is working
- [ ] Database backups are running
- [ ] All BAAs are executed
- [ ] HIPAA training is completed
- [ ] No security vulnerabilities found
- [ ] Load testing passes
- [ ] 24 hours of stable operation

---

**Last Updated**: 2024-12-02
**Version**: 1.0
**Owner**: [TO BE ASSIGNED]
