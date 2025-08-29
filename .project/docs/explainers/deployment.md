# Simple Deployment Guide

## Overview

This guide outlines a basic deployment strategy using a single Cloudflare Worker with automatic preview environments.

## Environments

**Production**
- **URL**: `web-app-starter-pack.workers.dev` (or custom domain)
- **Worker**: `web-app-starter-pack`
- **Branch**: `main`
- **Deployment**: Automatic on push to `main`

**Preview**
- **URL**: `[version-id]-web-app-starter-pack.[username].workers.dev`
- **Worker**: Same worker, preview versions
- **Branch**: Any feature branch
- **Deployment**: Automatic on PR creation/update

## Development Flow

1. Create feature branch from `main`
2. Push changes → automatic preview URL
3. Test at preview URL
4. Merge PR to `main`
5. Automatic deployment to production

## Configuration

### wrangler.toml
```toml
name = "web-app-starter-pack"
main = "worker/index.ts"
compatibility_date = "2025-08-15"

# Serve the frontend build as static assets
[assets]
directory = "./dist"
not_found_handling = "single-page-application"

# Production bindings
[[d1_databases]]
binding = "DB"
database_name = "web-app-starter-pack-db"
database_id = "your_production_db_id"

# Optional: KV namespace for caching
# [[kv_namespaces]]
# binding = "KV"
# id = "production_kv_id"
```

### GitHub Actions

Our CI/CD pipeline (`.github/workflows/ci-cd.yml`) handles deployment automatically:

1. **Build** - Creates production artifacts
2. **Parallel Execution** - All validation and deployment run simultaneously:
   - Lint & TypeScript checks
   - Unit & E2E tests (Chromium only)
   - Deploy to preview/production
3. **Final Status Check** - Blocks PR merge on any failure

Key deployment logic:
```bash
# Production (main branch)
npx wrangler deploy --minify

# Preview (pull requests)
npx wrangler versions upload
```

## URL Structure

| Environment | URL | Trigger |
|------------|-----|---------|
| Production | `web-app-starter-pack.workers.dev` | Push to `main` |
| Preview | `[version-id]-web-app-starter-pack.[username].workers.dev` | Pull request opened/updated |

## Database Strategy

- **Production**: Uses production D1 database
- **Preview**: Uses the same production D1 database (read/write access)
- **Important**: Must initialize production database before first deployment:
  ```bash
  # Run these once after creating the D1 database
  npx wrangler d1 execute web-app-starter-pack-db --file=./db/schema.sql --remote
  npx wrangler d1 execute web-app-starter-pack-db --file=./db/seed.sql --remote
  ```

## Secrets Management

- Use environment variables for API keys
- Store secrets in GitHub Secrets
- Add both to GitHub Actions secrets and Dependabot secrets if needed

## Quick Start

1. Clone repository
2. Install dependencies: `npm install`
3. Set up Cloudflare account and create Worker
4. Add GitHub secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
5. Push to `main` to deploy to production
6. Create feature branch for preview deployments
