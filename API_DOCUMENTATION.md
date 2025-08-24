# Easbase Backend-in-a-Box API Documentation

## Overview

Easbase provides a complete backend infrastructure with authentication, team management, billing, email/SMS services, file storage, and secure database access. All endpoints require authentication unless specified otherwise.

## Base URL

```
Production: https://api.easbase.com
Development: http://localhost:3000/api
```

## Authentication

Include your API key in the Authorization header:

```
Authorization: Bearer YOUR_API_KEY
```

Or use session-based authentication after signing in.

---

## Authentication Endpoints

### Sign Up
`POST /api/auth/signup`

Create a new account with complete backend initialization.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "fullName": "John Doe",
  "companyName": "Acme Inc",
  "plan": "starter" // starter, professional, business
}
```

**Response:**
```json
{
  "user": { "id": "...", "email": "..." },
  "session": { "access_token": "...", "refresh_token": "..." },
  "profile": { "id": "...", "subscription_plan": "starter" },
  "message": "Account created successfully! Check your email to verify your account."
}
```

### Sign In
`POST /api/auth/signin`

Sign in with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "user": { "id": "...", "email": "..." },
  "session": { "access_token": "...", "refresh_token": "..." },
  "profile": { "id": "...", "subscription_plan": "starter" }
}
```

### Magic Link
`POST /api/auth/magic-link`

Send a passwordless sign-in link.

**Request Body:**
```json
{
  "email": "user@example.com",
  "redirectTo": "https://app.example.com/dashboard"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Magic link sent! Check your email to sign in."
}
```

---

## Team Management

### List Organizations
`GET /api/teams`

Get all organizations the user belongs to.

**Response:**
```json
{
  "organizations": [
    {
      "id": "...",
      "name": "Acme Inc",
      "slug": "acme-inc",
      "owner_id": "...",
      "organization_members": [
        {
          "user_id": "...",
          "role": "owner",
          "joined_at": "2024-01-01T00:00:00Z"
        }
      ]
    }
  ]
}
```

### Create Organization
`POST /api/teams`

Create a new organization.

**Request Body:**
```json
{
  "name": "New Organization",
  "slug": "new-org" // optional, auto-generated if not provided
}
```

**Response:**
```json
{
  "organization": {
    "id": "...",
    "name": "New Organization",
    "slug": "new-org",
    "owner_id": "..."
  },
  "message": "Organization created successfully"
}
```

### Invite Members
`POST /api/teams/invite`

Invite members to an organization.

**Request Body:**
```json
{
  "organizationId": "org_123",
  "emails": ["member1@example.com", "member2@example.com"],
  "role": "member" // member or admin
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invitations sent to 2 email(s)",
  "invited": ["member1@example.com", "member2@example.com"]
}
```

### Accept Invitation
`GET /api/teams/invite?token=INVITATION_TOKEN`

Accept an organization invitation.

**Response:**
```json
{
  "success": true,
  "message": "You've joined Acme Inc as a member",
  "organization": { "name": "Acme Inc", "slug": "acme-inc" }
}
```

### List Members
`GET /api/teams/members?organizationId=org_123`

Get all members of an organization.

**Response:**
```json
{
  "members": [
    {
      "user_id": "...",
      "role": "owner",
      "joined_at": "2024-01-01T00:00:00Z",
      "user_profiles": {
        "email": "owner@example.com",
        "full_name": "John Doe",
        "avatar_url": "..."
      }
    }
  ],
  "currentUserRole": "owner"
}
```

### Update Member Role
`PATCH /api/teams/members`

Update a member's role in the organization.

**Request Body:**
```json
{
  "organizationId": "org_123",
  "memberId": "user_456",
  "role": "admin" // admin or member
}
```

### Remove Member
`DELETE /api/teams/members?organizationId=org_123&memberId=user_456`

Remove a member from the organization.

---

## Billing

### Create Checkout Session
`POST /api/billing/create-checkout`

Create a Stripe checkout session for subscription.

**Request Body:**
```json
{
  "planKey": "professional",
  "billingPeriod": "monthly" // monthly or annual
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/pay/cs_..."
}
```

### Get Billing Portal
`POST /api/billing/portal`

Get a Stripe billing portal URL to manage subscription.

**Response:**
```json
{
  "url": "https://billing.stripe.com/p/session/..."
}
```

### Get Usage Statistics
`GET /api/billing/usage?period=month`

Get usage statistics for the current billing period.

**Query Parameters:**
- `period`: day, week, or month (default: month)

**Response:**
```json
{
  "period": "month",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z",
  "metrics": {
    "mau": {
      "used": 150,
      "limit": 2500,
      "percentage": 6
    },
    "emails": {
      "used": 500,
      "limit": 10000,
      "percentage": 5
    },
    "sms": {
      "used": 50,
      "limit": 1000,
      "percentage": 5
    },
    "storage": {
      "used": 2.5,
      "limit": 10,
      "percentage": 25,
      "unit": "GB"
    },
    "bandwidth": {
      "used": 15,
      "limit": 100,
      "percentage": 15,
      "unit": "GB"
    },
    "projects": {
      "used": 2,
      "limit": 3,
      "percentage": 66.67
    }
  },
  "alerts": []
}
```

### Track Usage
`POST /api/billing/usage`

Track a usage event for billing.

**Request Body:**
```json
{
  "metric": "email_sent",
  "quantity": 1,
  "metadata": { "campaign": "welcome" }
}
```

---

## Email Services

### Send Email
`POST /api/emails/send`

Send transactional emails.

**Request Body:**
```json
{
  "to": "recipient@example.com", // or array of emails
  "subject": "Welcome to Easbase",
  "html": "<h1>Welcome!</h1><p>Thanks for signing up.</p>",
  "text": "Welcome! Thanks for signing up.", // optional
  "template": "welcome", // optional, use predefined template
  "data": { "name": "John" } // template variables
}
```

**Available Templates:**
- `welcome` - Welcome email for new users
- `magic-link` - Passwordless sign-in link
- `team-invitation` - Team invitation email
- `password-reset` - Password reset link

**Response:**
```json
{
  "success": true,
  "message": "Email sent to 1 recipient(s)"
}
```

---

## SMS & OTP Services

### Send SMS
`POST /api/sms/send`

Send SMS messages via Twilio.

**Request Body:**
```json
{
  "to": "+1234567890",
  "body": "Your verification code is 123456",
  "type": "sms" // sms or otp
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "SM...",
  "message": "SMS sent successfully"
}
```

### Send OTP
`POST /api/otp/send`

Generate and send OTP code.

**Request Body:**
```json
{
  "phone": "+1234567890", // or email
  "channel": "sms" // sms, email, or whatsapp
}
```

**Response:**
```json
{
  "success": true,
  "id": "otp_123",
  "expiresAt": "2024-01-01T00:10:00Z",
  "message": "OTP sent via sms"
}
```

### Verify OTP
`POST /api/otp/verify`

Verify an OTP code.

**Request Body:**
```json
{
  "phone": "+1234567890", // or email
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "message": "Code verified successfully"
}
```

---

## File Storage

### Upload File
`POST /api/storage/upload`

Upload a file to storage.

**Form Data:**
- `file`: File to upload (required)
- `bucket`: Storage bucket name (default: "uploads")
- `path`: Custom file path (optional)
- `public`: "true" or "false" (default: false)

**Response:**
```json
{
  "success": true,
  "key": "user_123/1234567890.jpg",
  "url": "https://storage.easbase.com/...",
  "bucket": "uploads",
  "size": 102400,
  "type": "image/jpeg"
}
```

### Get Upload URL
`GET /api/storage/upload?bucket=uploads&maxSize=52428800`

Get a presigned URL for direct uploads.

**Query Parameters:**
- `bucket`: Storage bucket name
- `maxSize`: Maximum file size in bytes
- `types`: Comma-separated allowed MIME types

**Response:**
```json
{
  "url": "https://storage.easbase.com/upload/...",
  "path": "user_123/temp/uuid",
  "token": "...",
  "bucket": "uploads",
  "maxSize": 52428800,
  "allowedTypes": ["image/jpeg", "image/png"],
  "expiresAt": "2024-01-01T01:00:00Z"
}
```

### Get File/List Files
`GET /api/storage/{bucket}/{path}`

Get a signed URL for a file or list files in a path.

**Response (single file):**
```json
{
  "url": "https://storage.easbase.com/signed/...",
  "expiresAt": "2024-01-01T01:00:00Z"
}
```

**Response (list files):**
```json
{
  "files": [
    {
      "name": "file.jpg",
      "id": "...",
      "size": 102400,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Delete File
`DELETE /api/storage/{bucket}/{path}`

Delete a file from storage.

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

## SDK Usage

### Installation

```bash
npm install @easbase/sdk
```

### Quick Start

```javascript
import { Easbase } from '@easbase/sdk';

// Initialize client
const easbase = new Easbase('your-api-key');

// Authentication
const user = await easbase.auth.signUp({
  email: 'user@example.com',
  password: 'secure_password',
  metadata: { name: 'John Doe' }
});

// Teams
const org = await easbase.teams.createOrganization({
  name: 'My Company',
  slug: 'my-company'
});

await easbase.teams.inviteMembers({
  orgId: org.id,
  emails: ['member@example.com'],
  role: 'member'
});

// Billing
const checkoutUrl = await easbase.billing.createCheckout({
  priceId: 'price_123',
  successUrl: 'https://app.com/success',
  cancelUrl: 'https://app.com/cancel'
});

// Email
await easbase.email.send({
  to: 'user@example.com',
  template: 'welcome',
  data: { name: 'John' }
});

// Storage
const { url } = await easbase.storage.upload({
  bucket: 'avatars',
  file: fileObject,
  public: true
});

// Database
const users = await easbase.database.read('users', {
  filter: { active: true }
});
```

---

## CLI Tool

### Installation

```bash
npx create-easbase-app my-app
```

### Interactive Setup

The CLI will guide you through:
1. Project configuration
2. Service selection (auth, teams, billing, etc.)
3. Database schema setup
4. Environment configuration
5. Automatic deployment

### Commands

```bash
# Initialize new project
easbase init

# Deploy to production
easbase deploy

# Check service status
easbase status

# View usage statistics
easbase usage

# Open billing portal
easbase billing
```

---

## Rate Limits

| Plan | Requests/min | Requests/day |
|------|--------------|--------------|
| Starter | 100 | 10,000 |
| Professional | 500 | 50,000 |
| Business | 2,000 | 200,000 |
| Enterprise | Unlimited | Unlimited |

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Webhooks

Configure webhooks to receive real-time events:

### Events
- `user.created` - New user signup
- `user.updated` - Profile updated
- `subscription.created` - New subscription
- `subscription.updated` - Plan change
- `subscription.canceled` - Cancellation
- `payment.succeeded` - Successful payment
- `payment.failed` - Failed payment
- `team.member.added` - Member joined
- `team.member.removed` - Member left

### Webhook Security

Verify webhook signatures:

```javascript
const signature = request.headers['x-easbase-signature'];
const isValid = Easbase.verifyWebhookSignature(
  request.body,
  signature,
  webhookSecret
);
```

---

## Support

- Documentation: https://docs.easbase.com
- API Status: https://status.easbase.com
- Email: support@easbase.com
- Discord: https://discord.gg/easbase