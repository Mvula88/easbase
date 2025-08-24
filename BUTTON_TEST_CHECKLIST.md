# Dashboard Button Testing Checklist

## Server Running
- ✅ Server is running on http://localhost:3003

## Main Dashboard Page (/dashboard)

### Sidebar Navigation Buttons
- [ ] **Overview** - Should navigate to /dashboard
- [ ] **Create Backend** - Should navigate to /dashboard/create-project
- [ ] **My Backends** - Should navigate to /dashboard/projects
- [ ] **API Usage** - Should navigate to /dashboard/api-usage
- [ ] **API Keys** (NEW) - Should navigate to /dashboard/api-keys
- [ ] **Billing** - Should navigate to /dashboard/billing
- [ ] **Settings** - Should navigate to /dashboard/settings
- [ ] **Documentation** - Should navigate to /docs
- [ ] **Sign Out** - Should sign out and redirect to home page

### Header Buttons
- [ ] **Bell Icon** (Notifications) - Currently placeholder
- [ ] **Help Circle Icon** - Currently placeholder

### Main Content Buttons
- [ ] **Create Backend** (Large CTA) - Should navigate to /dashboard/create-project
- [ ] **Upgrade Plan** - Should open upgrade modal or navigate to billing
- [ ] **Manage Billing** - Should navigate to /dashboard/billing
- [ ] **Copy Command** (npx create-easbase-app) - Should copy to clipboard
- [ ] **View All** (Your Backends section) - Should navigate to /dashboard/projects
- [ ] **Manage** (Individual project buttons) - Should navigate to /dashboard/projects/[id]

## API Keys Page (/dashboard/api-keys)
- [ ] **Generate New Key** - Should create a new API key
- [ ] **Generate Your First Key** - Should create first API key
- [ ] **Copy** - Should copy API key to clipboard
- [ ] **Eye Icon** - Should reveal/hide API key
- [ ] **Trash Icon** - Should delete API key

## Settings Page (/dashboard/settings)
- [ ] **Save Changes** - Should save profile updates
- [ ] **Generate New Key** - Should generate API key
- [ ] **Copy** - Should copy API key
- [ ] **Revoke** - Should revoke API key
- [ ] **Change Password** - Should update password
- [ ] **Enable/Disable 2FA** - Should toggle 2FA
- [ ] **Delete Account** - Should show deletion confirmation

## Create Project Page (/dashboard/create-project)
- [ ] **Template Selection** - Should select template
- [ ] **Continue/Next** - Should proceed through wizard steps
- [ ] **Create Backend** - Should create the backend project

## Projects Page (/dashboard/projects)
- [ ] **Create New Backend** - Should navigate to /dashboard/create-project
- [ ] **View Details** - Should navigate to project details
- [ ] **Settings** - Should navigate to project settings
- [ ] **Delete** - Should show deletion confirmation

## Billing Page (/dashboard/billing)
- [ ] **Upgrade Plan** - Should initiate Stripe checkout
- [ ] **Manage Subscription** - Should open Stripe customer portal
- [ ] **Download Invoice** - Should download invoice PDF

## API Usage Page (/dashboard/api-usage)
- [ ] **Export Data** - Should export usage data
- [ ] **View Details** - Should show detailed metrics

## Common Issues to Check:
1. **Sidebar Persistence**: Sidebar should remain visible when navigating between pages
2. **Active State**: Current page should be highlighted in sidebar
3. **Mobile Responsiveness**: Hamburger menu should work on mobile
4. **Loading States**: Buttons should show loading state during async operations
5. **Error Handling**: Proper error messages for failed operations
6. **Auth Protection**: All dashboard pages should redirect to login if not authenticated

## Test Results Summary:
- Total Buttons Tested: 40+
- Working: TBD
- Not Working: TBD
- Needs Implementation: TBD

## Notes:
- Some buttons may be placeholders pending full implementation
- Stripe integration requires valid API keys in .env.local
- Database operations require Supabase connection