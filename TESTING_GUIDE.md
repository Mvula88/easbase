# Easbase Testing & Validation Guide

## 🚀 Quick Start Testing

### 1. Start Development Server
```bash
cd apps/web && npm run dev
```
Server will run on http://localhost:3000 (or 3001 if 3000 is busy)

### 2. Run Quick Health Check
```bash
curl http://localhost:3000/api/health
```

### 3. Run Test Suite
```bash
node test-runner.js
```

## ✅ Complete Testing Checklist

### Core Functionality Tests

#### ✓ Build & Compilation
- [ ] `cd packages/core && npm run build` - Core package builds
- [ ] `cd packages/sdk && npm run build` - SDK builds
- [ ] `cd apps/web && npm run build` - Web app builds

#### ✓ API Endpoints (Manual Testing)
1. **Health Check**
   ```bash
   curl http://localhost:3000/api/health
   ```
   Expected: JSON with service status

2. **Schema Generation** (requires API key)
   ```bash
   curl -X POST http://localhost:3000/api/generate \
     -H "Content-Type: application/json" \
     -H "x-api-key: your-key" \
     -d '{"prompt": "E-commerce platform"}'
   ```

3. **Cache Status**
   ```bash
   curl http://localhost:3000/api/cache/status \
     -H "x-api-key: your-key"
   ```

4. **Webhook Management**
   ```bash
   curl http://localhost:3000/api/webhooks \
     -H "x-api-key: your-key"
   ```

### UI Component Tests (Manual)

#### Homepage (`/`)
- [ ] Logo and navigation visible
- [ ] "Start Building Free" button works
- [ ] "View Pricing" button navigates to `/pricing`
- [ ] Features section displays correctly
- [ ] Stats section shows numbers
- [ ] Footer links work

#### Authentication Pages
- [ ] `/auth/login` - Form displays and validates
- [ ] `/auth/signup` - Registration form works
- [ ] `/auth/forgot-password` - Password reset form

#### Dashboard (`/dashboard`)
- [ ] Requires authentication
- [ ] Schema generator form works
- [ ] Project list displays
- [ ] Usage stats show

#### Admin Testing Dashboard (`/admin/testing`)
- [ ] Health status displays
- [ ] Test runner buttons work
- [ ] Performance metrics show

### Database & Environment Tests

#### Prerequisites
1. **Environment Variables** (.env.local)
   - [ ] `NEXT_PUBLIC_SUPABASE_URL` set
   - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
   - [ ] `SUPABASE_SERVICE_ROLE_KEY` set
   - [ ] `ANTHROPIC_API_KEY` set
   - [ ] `OPENAI_API_KEY` set (optional)
   - [ ] `STRIPE_SECRET_KEY` set

2. **Database Setup**
   - [ ] Supabase project created
   - [ ] Migrations applied
   - [ ] pgvector extension enabled

### Automated Test Commands

```bash
# Build everything
npm run build

# Linting
npm run lint

# Type checking
npm run typecheck

# Unit tests (when configured)
npm run test:unit

# E2E tests (requires Playwright)
npm run test:e2e

# Full validation
npm run validate
```

## 🔍 Debugging Common Issues

### Issue: Health check shows "unhealthy"
**Solution**: Check environment variables in `.env.local`

### Issue: "Port 3000 is in use"
**Solution**: Server will automatically use port 3001

### Issue: Database connection fails
**Solution**: 
1. Verify Supabase credentials
2. Check if Supabase project is active
3. Ensure migrations are applied

### Issue: API returns 401 Unauthorized
**Solution**: Create API key in dashboard or use test key

### Issue: Builds fail with TypeScript errors
**Solution**: Run `npm run typecheck` to identify issues

## 📊 Performance Benchmarks

### Target Metrics
- Homepage load: < 2 seconds
- API response: < 500ms
- Schema generation: < 5 seconds
- Cache hit rate: > 80%
- Error rate: < 1%

## 🛠️ Development Tools

### Browser Testing
1. Open Chrome DevTools
2. Check Console for errors
3. Network tab for API calls
4. Performance tab for metrics

### API Testing Tools
- Postman
- Insomnia
- Thunder Client (VS Code)
- curl commands

### Database Inspection
1. Supabase Dashboard
2. Table Editor
3. SQL Editor
4. Logs

## 📝 Test Coverage Goals

- Unit Tests: 80% coverage
- E2E Tests: Critical user paths
- API Tests: All endpoints
- Component Tests: Interactive elements

## 🚨 Production Readiness Checklist

Before deploying to production:

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Rate limiting configured
- [ ] Error tracking setup (Sentry)
- [ ] SSL certificates valid
- [ ] Backup strategy in place
- [ ] Monitoring dashboard accessible

## 📞 Support

If tests are failing:
1. Check this guide first
2. Review error messages
3. Check environment setup
4. Consult documentation

Remember: Some tests may fail due to missing database configuration, which is expected in development environments without full Supabase setup.