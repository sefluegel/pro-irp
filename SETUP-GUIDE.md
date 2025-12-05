# Pro IRP - Production Setup Guide

## 🚀 Quick Setup (3 Steps)

### Step 1: Run the Database Migration

Connect to your Railway PostgreSQL database and run the migration:

```bash
# Option A: Using Railway CLI
railway connect postgres

# Then copy/paste the contents of:
# backend/migrations/002-auth-upgrade.sql
```

**Or manually in Railway Dashboard:**
1. Go to Railway → Your PostgreSQL service → Data tab
2. Click "Query"
3. Copy/paste the contents of `backend/migrations/002-auth-upgrade.sql`
4. Run the query

### Step 2: Make Your Account Admin

Run this command from the `backend/` directory:

```bash
cd backend
node setup-admin.js your-email@example.com
```

Replace `your-email@example.com` with the email you signed up with.

This will:
- ✅ Update your account to **admin** role
- ✅ Verify PILOT2025 promo code exists
- ✅ Show setup confirmation

### Step 3: Login Again

1. **Log out** of Pro IRP
2. **Log back in** with your email/password
3. You should now see "Founder Metrics" in the sidebar!

---

## 🎯 New Role Structure

| Role | Description | Can Access |
|------|-------------|------------|
| **Admin** | System administrator (you!) | Everything including founder metrics |
| **FMO** | Field Marketing Organization | Founder metrics, all agencies |
| **Agency** | Insurance agency owner | Founder metrics, their agents only |
| **Agent** | Individual insurance agent | Standard dashboard, their clients only |

---

## 🎟️ Pilot Promo Codes

The migration creates the `PILOT2025` promo code:
- **Valid**: Jan 1 - Mar 31, 2025
- **Max Uses**: 10 agencies
- **Type**: Free trial (100% discount)
- **Required**: Yes, for agency signup during pilot

---

## 📝 How Pilot Agencies Sign Up

### For Pilot Agencies:
1. Go to `/signup`
2. Select **"Agency"**
3. Fill out form:
   - Agency Name
   - Number of Agents (e.g., 5)
   - **Promo Code**: `PILOT2025`
   - Email, Password
4. Click "Create Agency Account"
5. They're in! 🎉

### For Agents (invited by agencies):
Agents cannot directly sign up. Agency owners will invite them via email (coming next!).

---

## 🔄 What's Next

You've completed the role structure! Here's what's left for Jan 1:

- [x] ✅ Role structure (Admin/FMO/Agency/Agent)
- [x] ✅ Promo code system
- [x] ✅ Agency signup with validation
- [ ] ⏳ Agent invitation system (send email invites)
- [ ] ⏳ Email/SMS infrastructure (Twilio/SendGrid)
- [ ] ⏳ Template management
- [ ] ⏳ Automation workflow engine
- [ ] ⏳ AI risk scoring

---

## 🛠️ Database Tables Created

The migration creates:

1. **promo_codes** - Discount codes for signups
2. **subscription_plans** - Pricing tiers (ready for Stripe)
3. **subscriptions** - Track agency subscriptions
4. **agent_invitations** - Email invitation tokens

---

## 📧 Support Emails (Update These!)

The system references these email addresses:
- `support@proirp.com` - For promo code requests
- `partnerships@proirp.com` - For FMO partnerships

Make sure to:
1. Set up these email addresses
2. Or update them in the code to your actual support emails

---

## ⚠️ Important Notes

1. **Your Account is Special**: You're the only admin. Don't delete your account!
2. **Promo Codes Required**: During pilot, agencies MUST use `PILOT2025` to sign up
3. **Payment Coming Later**: Subscription tables are ready but not connected to Stripe yet
4. **Agents Need Invites**: Agents cannot self-signup (prevents unauthorized access)

---

## 🐛 Troubleshooting

### "Access denied - Founder metrics require admin role"
- Make sure you ran `node setup-admin.js your-email@example.com`
- Log out and log back in to get new JWT token with admin role

### "Invalid promo code"
- Check that migration ran successfully
- Verify PILOT2025 exists: `SELECT * FROM promo_codes WHERE code = 'PILOT2025';`

### "Email already registered"
- That email is already in the database
- Use a different email or login with existing account

---

## 📞 Need Help?

If you run into issues:
1. Check the backend console logs
2. Check Railway database logs
3. Verify migration ran successfully

Ready to test! 🚀
