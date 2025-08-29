# Google Cloud Run Starter Pack

FastAPI backend + React frontend deployed to Google Cloud Run.

## Prerequisites

- Google Cloud account with billing enabled
- gcloud CLI installed
- Docker installed  
- Node.js 20+ and Python 3.11+

## Setup

### 1. Google Cloud Project

```bash
# Create project (or use existing)
gcloud projects create YOUR_PROJECT_ID --set-as-default

# Enable required APIs
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

# Create Artifact Registry repository
gcloud artifacts repositories create cloud-run-apps \
    --repository-format=docker \
    --location=us-central1
```

### 2. GitHub Actions (CI/CD)

Create service account:
```bash
export PROJECT_ID=YOUR_PROJECT_ID
export SA_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

# Create service account
gcloud iam service-accounts create github-actions --display-name="GitHub Actions"

# Grant permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/artifactregistry.writer"

# Create key
gcloud iam service-accounts keys create key.json --iam-account=${SA_EMAIL}
```

Add GitHub secrets:
1. Go to Settings → Secrets → Actions
2. Add `GCP_PROJECT_ID`: Your project ID
3. Add `GCP_SA_KEY`: Contents of `key.json`
4. Delete `key.json` locally

### 3. Local Environment

```bash
# Configure environment
make init  # Creates .env file

# Edit .env
GCP_PROJECT_ID=YOUR_PROJECT_ID
GCP_REGION=us-central1
SERVICE_NAME=hello-world-app
```

## Development

```bash
# Install dependencies
make install

# Run locally
make dev-backend   # FastAPI on :8000
make dev-frontend  # React on :5173

# Test with Docker
make test-local    # Runs on :8080
```

## Deployment

```bash
# Deploy to Cloud Run
make deploy        # Full build and deploy
make quick-deploy  # Deploy from source (fastest)

# View deployment
make logs          # View logs
make status        # Check status
make url           # Get service URL
```

## Make Commands

| Command | Description |
|---------|-------------|
| `make init` | Interactive .env setup |
| `make install` | Install dependencies |
| `make dev-backend` | Run backend locally |
| `make dev-frontend` | Run frontend locally |
| `make test-local` | Test with Docker |
| `make build` | Build Docker image |
| `make deploy` | Deploy to Cloud Run |
| `make quick-deploy` | Deploy from source |
| `make logs` | View service logs |
| `make status` | Check service status |
| `make url` | Get service URL |
| `make clean` | Clean build artifacts |

## Project Structure

```
backend/     # FastAPI (Python)
frontend/    # React (TypeScript + Vite)
Dockerfile   # Multi-stage build
Makefile     # Automation commands
.github/     # CI/CD workflows
```

## API Endpoints

- `/api/health` - Health check
- `/api/hello` - Hello endpoint
- `/*` - React app (production)