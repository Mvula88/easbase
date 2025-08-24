# Backend-in-a-Box Database Migration Guide

## Overview
This guide explains how to migrate your Easbase platform from the old AI schema generation system to the new Backend-in-a-Box platform.

## Migration Strategy

### Tables to Keep
The following tables are essential for Backend-in-a-Box:
- `organizations` - Multi-tenant organization management
- `projects` - Project management
- `deployments` - Deployment tracking
- Any custom tables you've created for your specific use case

### Tables to Remove (Old AI Schema Generation)
These tables are no longer needed and can be safely removed:
- `schema_generations` - AI schema generation history
- `cache` - Old caching system
- `schema_versions` - Schema versioning
- `auth_templates` - Old auth template system
- `health_check` - Old health check system

### New Tables Required for Backend-in-a-Box
The platform requires these new tables:
- `user_profiles` - Enhanced user profiles with subscription and usage tracking
- `organization_members` - Team member management
- `organization_invitations` - Team invitations
- `email_logs` - Email tracking
- `sms_logs` - SMS tracking
- `otp_verifications` - OTP/2FA support
- `storage_logs` - File storage tracking
- `usage_logs` - Usage metrics
- `auth_configurations` - Auth settings per organization
- `api_keys` - API key management
- `activity_logs` - Activity tracking
- `storage_access_logs` - Storage access tracking

## Migration Steps

### Step 1: Backup Your Database
Before running any migration, backup your existing database:
```sql
-- In Supabase Dashboard, use the backup feature
-- Or export your data manually
```

### Step 2: Run the Migration
Use the provided migration file `018_backend_box_complete.sql` which:
1. Safely handles existing tables
2. Creates all new required tables
3. Sets up proper RLS policies
4. Configures triggers and functions

### Step 3: Verify Migration
After running the migration, verify all tables are created:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected tables:
- activity_logs
- api_keys
- auth_configurations
- deployments
- email_logs
- organization_invitations
- organization_members
- organizations
- otp_verifications
- projects
- sms_logs
- storage_access_logs
- storage_logs
- usage_logs
- user_profiles

### Step 4: Clean Up Old Tables (Optional)
After verifying the migration, you can remove old tables:
```sql
-- Run 012_cleanup_old_tables_optional.sql
-- This will remove all old AI schema generation tables
```

### Step 5: Update Environment Variables
Ensure your `.env` file has all required variables:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Stripe (for billing)
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key

# Email (optional)
RESEND_API_KEY=your_resend_key

# SMS (optional)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

## Troubleshooting

### Issue: "column user_id does not exist"
The old profiles table structure is incompatible. The migration handles this by:
1. Renaming old profiles to profiles_backup_old
2. Creating new user_profiles with correct structure
3. Migrating existing user data

### Issue: RLS Policy Conflicts
If you get policy name conflicts, the migration automatically:
1. Drops existing policies with same names
2. Creates new policies with correct permissions

### Issue: Foreign Key Constraints
The migration ensures proper order:
1. Creates referenced tables first
2. Then creates dependent tables
3. Finally adds constraints

## Post-Migration Checklist

- [ ] All Backend-in-a-Box tables created
- [ ] RLS policies enabled and configured
- [ ] Triggers for updated_at timestamps working
- [ ] User profiles migrated from old profiles table
- [ ] API endpoints updated to use new table names
- [ ] Environment variables configured
- [ ] Stripe webhook endpoint configured
- [ ] Email/SMS providers configured (if using)

## Support

If you encounter issues:
1. Check the Supabase logs for detailed error messages
2. Verify foreign key relationships with auth.users
3. Ensure all required extensions are enabled (uuid-ossp, pgcrypto)
4. Review the migration SQL for any customizations needed

## Next Steps

After successful migration:
1. Test user authentication and profile creation
2. Test organization creation and team invitations
3. Configure Stripe products and pricing
4. Set up email/SMS providers if needed
5. Deploy to production