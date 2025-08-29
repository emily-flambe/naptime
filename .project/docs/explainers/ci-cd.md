# CI/CD Pipeline Explained

## Overview

Our CI/CD pipeline is designed to catch issues early and deploy with confidence. It follows a logical progression from quick checks to more expensive operations, ensuring we don't waste time on builds that would fail basic tests.

## Pipeline Flow

The pipeline runs automatically on:
- Every push to the `main` branch
- Every pull request (new or updated)

## Order of Operations

### Step 1: Build
We build the application first. This:
- Bundles all the JavaScript/TypeScript
- Processes CSS with Tailwind
- Optimizes everything for production
- Creates the `dist/` folder with the final app

The build artifacts are saved so later steps can reuse them.

### Step 2: Parallel Validation and Deployment
After the build completes, everything else runs simultaneously:

**Lint & Format Check** - Ensures code follows our style guidelines and formatting rules.

**TypeScript Check** - Verifies all types are correct and the code compiles without errors.

**Unit Tests** - Test individual functions and components in isolation. They run on the source code directly.

**E2E Tests** - Run end-to-end tests using Playwright:
- Start a real browser (Chromium)
- Load the actual app from the build
- Click buttons, fill forms, and verify everything works
- Test the app exactly as a user would experience it

**Deploy** - Deploy the application immediately:
- **Main branch**: Deploys to production at `web-app-starter-pack.workers.dev`
- **Pull requests**: Creates preview deployments at unique URLs like `[version-id]-web-app-starter-pack.workers.dev`

All five jobs run in parallel to maximize speed. The deployment uses the same build artifacts, ensuring consistency.

### Step 3: Final Status Check
After all jobs complete (pass or fail), a final status check runs. This job:
- Checks the result of every previous job
- Fails if ANY job failed
- This is what blocks PR merging - you can't merge if this check fails

This ensures that even though we deploy before tests complete, we can't merge broken code to main.

## Why This Order?

This approach prioritizes speed and developer experience:

1. **Build first**: We build immediately to create artifacts that all subsequent steps need. This eliminates duplicate work.

2. **Maximum parallelization**: ALL validation (linting, type-checking, tests) and deployment run simultaneously. This dramatically reduces total pipeline time.

3. **Immediate preview deployments**: Developers get a preview URL as fast as possible, without waiting for tests. This enables:
   - Quick manual testing
   - Sharing with stakeholders
   - Visual verification
   - Real-world testing

4. **Safety through final check**: The final status check ensures we can't merge broken code, even though we deployed before tests finished. If tests fail, the PR is blocked from merging.

5. **Best of both worlds**: We get the speed of immediate deployment with the safety of comprehensive testing. Preview deployments can be "broken" temporarily, but main branch is always protected.

## Configuration

The pipeline is defined in `.github/workflows/ci-cd.yml`. It uses GitHub Actions and runs on Ubuntu Linux with Node.js 20.19+.

## Local Testing

You can run the same checks locally before pushing:

```bash
# Quick checks
npm run lint
npm run type-check

# Tests
npm run test          # Unit tests
npm run test:e2e      # E2E tests (starts dev server automatically)

# Build
npm run build

# Everything at once
npm run lint && npm run type-check && npm run test && npm run build && npm run test:e2e
```

## Time Expectations

Typical pipeline duration:
- Build: ~20 seconds
- Then in parallel:
  - Lint & TypeScript: ~30 seconds each
  - Unit tests: ~15 seconds
  - E2E tests: ~45 seconds
  - Deploy: ~30 seconds

Total: ~1 minute from push to deployment (build + longest parallel job)

## Key Benefits

1. **Maximum speed**: Everything runs in parallel after build
2. **No duplicate work**: Build once, use artifacts everywhere
3. **Consistent deployments**: What you test is what you deploy
4. **Preview deployments**: Every PR gets its own URL for testing
5. **Confidence**: Multiple layers of testing before production