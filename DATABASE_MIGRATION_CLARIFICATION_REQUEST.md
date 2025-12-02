# 📋 Database Migration Clarification Request

**Date:** December 2, 2025  
**Purpose:** Clarify existing database migration scripts and identify what needs to be updated for Enterprise removal

---

## 🎯 Context

We are removing the Enterprise tier from the platform, leaving only **Free** and **Pro** tiers. The mobile team has already implemented tier restructuring, and there may be existing SQL migration scripts that need to be reviewed and updated.

---

## ✅ Existing SQL Scripts Found

### Tier Restructure Scripts:
1. **`database/tier_restructure_schema.sql`** - Main tier restructuring schema
2. **`database/update_upload_limits_tier_restructure.sql`** - Upload limits update
3. **`database/update_storage_limits_tier_restructure.sql`** - Storage limits update
4. **`database/restore_tracks_on_upgrade.sql`** - Track restoration on upgrade

### Other Related Scripts:
- `database/subscription_schema.sql` - Base subscription schema
- `database/fix_upload_limits_tier_corrections.sql` - Upload limits corrections
- `database/tier_based_tipping_enhancements.sql` - Tipping system with tiers
- `database/complete_tipping_fix.sql` - Tipping fixes
- `database/persistent_user_memory_schema.sql` - User memory with tier references

---

## ❓ Questions for Mobile Team / Database Team

### 1. **Migration Script Status**
- [ ] Have the tier restructuring SQL scripts already been run in production?
- [ ] Which scripts have been executed?
- [ ] Are there any scripts that were created but NOT yet executed?
- [ ] What is the current state of the `user_subscriptions` table in production?

### 2. **Enterprise Tier References**
- [ ] Are there any existing users with `tier = 'enterprise'` in production?
- [ ] If yes, what should be done with them? (Downgrade to Pro? Keep as Pro?)
- [ ] Have any Enterprise-specific features been implemented in the database that need to be removed?

### 3. **CHECK Constraints**
The following files still contain `CHECK (tier IN ('free', 'pro', 'enterprise'))` constraints:

**Files that need updating:**
- `database/tier_restructure_schema.sql` (lines 50, 120, 121)
- `database/restore_tracks_on_upgrade.sql` (lines 15, 32, 46)
- `database/subscription_schema.sql` (line 8)
- `database/persistent_user_memory_schema.sql` (line 37)
- `database/complete_tipping_fix.sql` (lines 12, 86)
- `database/tier_based_tipping_enhancements.sql` (lines 13, 120)
- `database/fix_tipping_system.sql` (line 12)
- `database/setup_bank_accounts.sql` (line 68)
- `database/upload_validation_schema.sql` (lines 12, 26, 48)

**Questions:**
- [ ] Should we create a new migration script to update these constraints?
- [ ] Or should we update the existing scripts and re-run them?
- [ ] Are there any other tables/columns with Enterprise references we should know about?

### 4. **Database Functions**
Several database functions reference Enterprise tier:

**Functions to review:**
- `check_upload_limit()` - Does it handle Enterprise?
- `check_search_limit()` - Does it handle Enterprise?
- `check_message_limit()` - Does it handle Enterprise?
- `restore_tracks_on_upgrade()` - Currently checks for 'pro' or 'enterprise'
- Any other tier-based functions?

**Questions:**
- [ ] Do these functions need to be updated to remove Enterprise logic?
- [ ] Are there any functions that should be removed entirely?

### 5. **Data Migration**
- [ ] If there are existing Enterprise users, what migration path should we take?
- [ ] Should we create a script to:
  - Update all `tier = 'enterprise'` to `tier = 'pro'`?
  - Update any Enterprise-specific data?
  - Archive or remove Enterprise-specific records?

### 6. **RLS Policies**
- [ ] Are there any Row-Level Security (RLS) policies that reference Enterprise tier?
- [ ] Do these need to be updated?

### 7. **Triggers**
- [ ] Are there any database triggers that check for Enterprise tier?
- [ ] Do these need to be updated or removed?

---

## 📝 Current Codebase Status

### ✅ Already Updated (Code):
- Stripe configuration (removed Enterprise)
- API endpoints (removed Enterprise validation)
- Pricing page (removed Enterprise tier)
- Frontend components (in progress)

### ⏳ Still Needs Database Updates:
- CHECK constraints (remove 'enterprise' from all)
- Database functions (remove Enterprise logic)
- Triggers (update Enterprise checks)
- RLS policies (if any reference Enterprise)

---

## 🔍 What We Need

### Immediate:
1. **Confirmation** of which SQL scripts have been run
2. **List** of any existing Enterprise users in production
3. **Decision** on migration path for Enterprise users

### Next Steps:
1. **Create migration script** to:
   - Update all CHECK constraints to remove 'enterprise'
   - Update database functions to remove Enterprise logic
   - Migrate any existing Enterprise users to Pro (if applicable)
   - Update triggers and RLS policies

2. **Test migration** in staging environment

3. **Deploy migration** to production

---

## 📊 Files to Review

Please review these files and let us know:
- Which have been executed
- Which need to be updated
- Which can be ignored

### Primary Files:
```
database/tier_restructure_schema.sql
database/update_upload_limits_tier_restructure.sql
database/update_storage_limits_tier_restructure.sql
database/restore_tracks_on_upgrade.sql
database/subscription_schema.sql
```

### Secondary Files (may need updates):
```
database/persistent_user_memory_schema.sql
database/complete_tipping_fix.sql
database/tier_based_tipping_enhancements.sql
database/fix_tipping_system.sql
database/setup_bank_accounts.sql
database/upload_validation_schema.sql
```

---

## 🎯 Expected Outcome

After clarification, we will:
1. Create a comprehensive migration script to remove Enterprise from all database constraints
2. Update all database functions to remove Enterprise logic
3. Provide a safe migration path for any existing Enterprise users
4. Test and deploy the migration

---

## 📞 Contact

Please provide:
- Status of existing SQL scripts
- Current production database state
- Any Enterprise users that exist
- Preferred migration approach

**Thank you for your help!** 🙏