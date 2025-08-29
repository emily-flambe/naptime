# Deployment Strategy

## Overview

This project deploys to Google Cloud Run using containerized FastAPI backend with React frontend served as static files.

## Deployment Methods

### 1. Quick Deploy (Recommended)
```bash
make quick-deploy
```
Deploys directly from source using Cloud Build. This is the fastest method.

### 2. Standard Deploy
```bash
make deploy
```
Builds Docker image locally, pushes to Artifact Registry, then deploys to Cloud Run.

### 3. GitHub Actions (Automated)
- **Pull Requests**: Automatically deploys preview environments
- **Main Branch**: Automatically deploys to production
- **PR Close**: Automatically cleans up preview environments

## Google Cloud Setup

### Prerequisites
1. Google Cloud Project with billing enabled
2. gcloud CLI installed and authenticated
3. Required APIs enabled:
   - Cloud Run API
   - Artifact Registry API
   - Cloud Build API (for quick deploy)

### Initial Setup
```bash
# Set up environment
make init

# Configure gcloud
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### Create Artifact Registry Repository
```bash
gcloud artifacts repositories create cloud-run-apps \
    --repository-format=docker \
    --location=us-central1 \
    --description="Docker repository for Cloud Run apps"
```

## CI/CD Pipeline

### GitHub Actions Workflow

The `.github/workflows/ci-cd.yml` file handles:

1. **Build**: Validates Docker build
2. **Deploy**: Pushes to Artifact Registry and deploys to Cloud Run
3. **Test**: Runs linting, type checking, and tests
4. **Smoke Test**: Validates deployment health

### Required GitHub Secrets
```
GCP_PROJECT_ID     # Your Google Cloud project ID
GCP_SA_KEY         # Service account JSON key
```

### Setting Up Service Account
```bash
# Create service account
gcloud iam service-accounts create github-actions \
    --display-name="GitHub Actions"

# Grant necessary permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"

# Create and download key
gcloud iam service-accounts keys create key.json \
    --iam-account=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com

# Add to GitHub secrets as GCP_SA_KEY
```

## Environment Configuration

### Production Environment Variables
Set in Cloud Run service:
```bash
gcloud run services update hello-world-app \
    --set-env-vars="NODE_ENV=production" \
    --region=us-central1
```

### Preview Environments
Automatically created for pull requests:
- Service name: `hello-world-pr-{PR_NUMBER}`
- Auto-cleanup on PR close
- Limited resources (max 2 instances)

## Deployment Commands

### Makefile Commands
```bash
make deploy        # Full deployment process
make quick-deploy  # Fast deployment from source
make build        # Build Docker image only
make push         # Push image to registry
make logs         # View Cloud Run logs
make status       # Check service status
make url          # Get service URL
```

### Manual Deployment
```bash
# Build image
docker build --platform linux/amd64 -t gcr.io/PROJECT_ID/hello-world-app .

# Push to registry
docker push gcr.io/PROJECT_ID/hello-world-app

# Deploy to Cloud Run
gcloud run deploy hello-world-app \
    --image gcr.io/PROJECT_ID/hello-world-app \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated
```

## Monitoring

### View Logs
```bash
make logs
# or
gcloud run services logs read hello-world-app --region=us-central1
```

### Check Status
```bash
make status
# or
gcloud run services describe hello-world-app --region=us-central1
```

### Get URL
```bash
make url
# Service will be available at: https://hello-world-app-xxxxx-uc.a.run.app
```

## Rollback Strategy

### Quick Rollback
```bash
# List revisions
gcloud run revisions list --service=hello-world-app --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic hello-world-app \
    --to-revisions=PREVIOUS_REVISION=100 \
    --region=us-central1
```

## Cost Optimization

Cloud Run charges only for:
- Request processing time (rounded up to nearest 100ms)
- Memory and CPU allocated during request processing
- Minimum instances (if configured)

**Tips:**
- Scale to zero when not in use (default)
- Use appropriate memory limits (512Mi is usually sufficient)
- Configure max instances to prevent runaway costs

## Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Use service accounts** - Don't use personal credentials for CI/CD
3. **Enable authentication** - For non-public services, remove `--allow-unauthenticated`
4. **Regular updates** - Keep dependencies and base images updated
5. **Scan images** - Artifact Registry automatically scans for vulnerabilities

This deployment strategy provides a simple, scalable, and cost-effective way to deploy web applications to Google Cloud Run.