# GitHub Configuration & CI/CD

## Overview

This repository uses GitHub Actions for continuous integration and deployment to Google Cloud Run.

## Workflows

### PR Validation & Preview (`workflows/deploy-pr.yml`)

**Triggers:** Pull requests to `main` (opened, synchronized, reopened)

**Purpose:** Validate changes and deploy preview environments

**Jobs:**
1. **Test**: Run linting, type checking, and tests
2. **Build**: Validate Docker build
3. **Deploy Preview**: Create `hello-world-pr-{number}` preview environment
4. **Smoke Test**: Validate preview deployment

### Production Deployment (`workflows/deploy-main.yml`)

**Triggers:** Push to `main` branch

**Purpose:** Deploy to production and cleanup merged PR previews

**Jobs:**
1. **Test**: Run linting, type checking, and tests
2. **Deploy**: Deploy to production `hello-world-app` service
3. **Smoke Test**: Validate production deployment
4. **Cleanup Preview**: Remove merged PR preview environments

## Required GitHub Secrets

To enable the CI/CD pipeline, add these secrets to your repository:

### 1. `GCP_PROJECT_ID`
Your Google Cloud Project ID (e.g., `hello-world-app-470503`)

### 2. `GCP_SA_KEY`
JSON key for a Google Cloud service account with these permissions:
- `roles/run.admin` - Deploy and manage Cloud Run services
- `roles/artifactregistry.writer` - Push Docker images
- `roles/iam.serviceAccountUser` - Act as the service account

## Setup Instructions

### Step 1: Create Service Account

```bash
# Set your project ID
export PROJECT_ID="your-project-id"

# Create the service account
gcloud iam service-accounts create github-actions \
  --description="GitHub Actions CI/CD" \
  --display-name="GitHub Actions" \
  --project=$PROJECT_ID

# Set the service account email
export SA_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# Create and download the key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=${SA_EMAIL} \
  --project=$PROJECT_ID
```

### Step 2: Add Secrets to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add both secrets:

**GCP_PROJECT_ID:**
- Name: `GCP_PROJECT_ID`
- Value: Your project ID

**GCP_SA_KEY:**
- Name: `GCP_SA_KEY`
- Value: Contents of `github-actions-key.json`

```bash
# Copy the entire JSON content
cat github-actions-key.json
```

### Step 3: Clean Up

**Important**: Delete the local key file after adding to GitHub:
```bash
rm github-actions-key.json
```

### Step 4: Enable Required APIs

```bash
gcloud services enable cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com
```

## How It Works

### Pull Requests
1. Open/update PR → `deploy-pr.yml` runs
2. Tests and validation pass
3. Preview deployed to `hello-world-pr-{NUMBER}`
4. Bot comments on PR with preview URL

### Production (Main Branch)
1. Merge PR or push to main → `deploy-main.yml` runs
2. Tests and validation pass
3. Deploy to production `hello-world-app` service
4. Cleanup merged PR preview environment
5. Cleanup orphaned previews older than 7 days

## Deployment URLs

- **Production**: Stable URL at `hello-world-app-xxxxx-uc.a.run.app`
- **PR Previews**: Temporary URLs at `hello-world-pr-{NUMBER}-xxxxx-uc.a.run.app`

## Cost Management

### GitHub Actions
- **Public repos**: Free unlimited minutes
- **Private repos**: 2,000 free minutes/month

### Google Cloud Run
- **Free tier**: 2 million requests/month
- **Preview limits**: Max 2 instances per PR
- **Auto-cleanup**: Previews deleted after merge

## Monitoring & Debugging

### View Status
- **GitHub**: Actions tab in repository
- **Cloud Run**: [Console](https://console.cloud.google.com/run)
- **Logs**: `gcloud logging read "resource.type=cloud_run_revision"`

### Common Issues

1. **Permission Denied**
   - Verify service account has all required roles
   - Check project ID matches

2. **Invalid Key**
   - Ensure entire JSON was copied including brackets
   - Check for extra whitespace

3. **APIs Not Enabled**
   - Run the enable command in Step 4
   - Wait a few minutes for propagation

### Verify Permissions
```bash
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --format="table(bindings.role)" \
  --filter="bindings.members:${SA_EMAIL}"
```

## Rollback Procedure

If deployment fails:

```bash
# List revisions
gcloud run revisions list --service=hello-world-app --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic hello-world-app \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region=us-central1
```

## Security Best Practices

- **Never commit service account keys** to the repository
- **Rotate keys regularly** (every 90 days)
- **Use Workload Identity Federation** for production (more secure)
- **Limit permissions** to minimum required
- **Monitor usage** through Cloud Audit Logs
- **Separate projects** for staging/production

## Advanced: Workload Identity Federation

For enhanced security, use Workload Identity Federation instead of keys:

```bash
# Enable required APIs
gcloud services enable iamcredentials.googleapis.com

# Create Workload Identity Pool
gcloud iam workload-identity-pools create "github-pool" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Create OIDC Provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository"

# Grant permissions to repository
export REPO="your-username/web-app-starter-pack-gcp"
gcloud iam service-accounts add-iam-policy-binding ${SA_EMAIL} \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/${REPO}" \
  --role="roles/iam.workloadIdentityUser"
```

Then update the workflow to use `google-github-actions/auth@v2` with `workload_identity_provider` instead of `credentials_json`.