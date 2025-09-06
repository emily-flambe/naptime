# CI/CD Documentation

## Overview

This repository uses GitHub Actions for continuous integration, security scanning, and deployment to Google Cloud Run.

## Workflows

### 1. Production Deployment (`deploy-main.yml`)
**Triggers:** Push to `main` branch (when changes to source files)  
**Purpose:** Deploy to production and cleanup old preview environments  
**Jobs:**
- Test: Run linting, type checking, and tests
- Deploy: Deploy to production `oura-naptime-app` service
- Smoke Test: Validate production deployment
- Cleanup: Remove merged PR preview environments and orphaned previews

### 2. PR Validation & Preview (`deploy-pr.yml`)
**Triggers:** Pull requests to `main` (opened, synchronize, reopened, closed)  
**Purpose:** Validate changes and deploy preview environments  
**Jobs:**
- Test: Run linting, type checking, and tests  
- Build: Validate Docker build (on non-closed PRs)
- Deploy Preview: Create preview environment (on non-closed PRs)
- Cleanup: Remove preview environment (on PR close)
- CI Status Check: Aggregate all job statuses

### 3. Emoji Linter (`emoji-lint.yml`)
**Triggers:** Pull requests to `main`  
**Purpose:** Enforce no-emoji policy in codebase  
**Configuration:** Uses `.emoji-linter.config.json` to ignore dependencies and specific file types

### 4. TruffleHog Secret Scan (`trufflehog.yml`)
**Triggers:** 
- Push to `main` branch
- Pull requests to `main`  
**Purpose:** Scan for leaked secrets and credentials  
**Configuration:** Uses `.trufflehog-ignore` for false positive exclusions

## Workflow Trigger Summary

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| deploy-main.yml | push to main | Production deployment |
| deploy-pr.yml | pull_request to main | Preview deployments |
| emoji-lint.yml | pull_request to main | Emoji detection |
| trufflehog.yml | push to main + pull_request to main | Secret scanning |

## Required GitHub Secrets

### Google Cloud Platform Secrets
- `GCP_PROJECT_ID`: Your Google Cloud Project ID
- `GCP_SA_KEY`: Service account JSON key with permissions:
  - `roles/run.admin` - Deploy and manage Cloud Run services
  - `roles/artifactregistry.writer` - Push Docker images
  - `roles/iam.serviceAccountUser` - Act as the service account
- `GCP_SERVICE_NAME`: Cloud Run service name (default: `oura-naptime-app`)

### Application Secrets
- `OURA_API_TOKEN`: Oura Ring API personal access token

## Deployment URLs

- **Production**: `https://oura-naptime-app-[hash]-uc.a.run.app`
- **PR Previews**: `https://oura-naptime-app-pr-[number]-[hash]-uc.a.run.app`

## Preview Environment Management

### Automatic Cleanup
- Preview environments are automatically deleted when PRs are closed
- Orphaned previews (from deleted branches) are cleaned up daily
- Previews older than 7 days are automatically removed

### Manual Cleanup
```bash
# List all preview services
gcloud run services list --region=us-central1 | grep "oura-naptime-app-pr-"

# Delete a specific preview
gcloud run services delete oura-naptime-app-pr-123 --region=us-central1 --quiet
```

## Security Features

### Secret Scanning
- TruffleHog runs on every PR and main push
- Scans for API keys, tokens, passwords, and credentials
- Configured via `.trufflehog-ignore` for false positives

### Emoji Prevention
- Enforces no-emoji policy across codebase
- Runs on every PR
- Configured via `.emoji-linter.config.json`

### Pre-commit Hooks
Local secret scanning via git hooks:
```bash
make setup-secrets-scanning
```

## Debugging CI/CD Issues

### Common Issues

1. **Deployment Version Conflicts**
   - Occurs when PR is closed and reopened
   - Solution: Create a new PR branch

2. **Permission Denied**
   - Verify service account has all required roles
   - Check project ID matches in secrets

3. **Build Failures**
   - Check Docker build logs
   - Verify all environment variables are set
   - Ensure package.json and package-lock.json are in sync

### View Logs
```bash
# Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# Specific service logs
gcloud logging read "resource.labels.service_name=oura-naptime-app" --limit 50
```

### Monitoring
- **GitHub Actions**: Check Actions tab in repository
- **Cloud Run Console**: https://console.cloud.google.com/run
- **Cloud Build History**: https://console.cloud.google.com/cloud-build/builds

## Local Testing

### Run CI Checks Locally
```bash
# Linting
npm run lint

# Type checking (if TypeScript is configured)
npm run type-check

# Tests
npm test

# Secret scanning
make scan-secrets
```

### Test Docker Build
```bash
# Build locally
docker build -t naptime-local .

# Run locally
docker run -p 8080:8080 \
  -e OURA_API_TOKEN=$OURA_API_TOKEN \
  naptime-local
```

## Best Practices

1. **Always run tests locally** before pushing
2. **Never commit secrets** - use environment variables
3. **Keep PRs focused** - one feature/fix per PR
4. **Write descriptive PR titles** - they appear in deployment logs
5. **Clean up old previews** - they consume resources
6. **Monitor costs** - preview environments incur charges

## Cost Management

### GitHub Actions
- Public repository: Free unlimited minutes
- Private repository: 2,000 free minutes/month included

### Google Cloud Run
- Free tier: 2 million requests/month
- CPU: First 180,000 vCPU-seconds free
- Memory: First 360,000 GiB-seconds free
- Preview environments count against these limits

### Cost Optimization
- Preview environments limited to 2 instances max
- Automatic cleanup reduces idle costs
- Production scales to zero when not in use