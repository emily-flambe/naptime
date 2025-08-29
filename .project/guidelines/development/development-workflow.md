# Development Workflow

## Local Development Setup

### Quick Start

```bash
# Clone the repository
git clone <your-repo-url>
cd web-app-starter-pack-gcp

# Set up environment
make init  # Interactive setup for .env file

# Install dependencies
make install

# Start development servers (in separate terminals)
make dev-backend   # Terminal 1: FastAPI on port 8000
make dev-frontend  # Terminal 2: Vite on port 5173

# Or test with Docker locally
make test-local    # Builds and runs container on port 8080
```

### Environment Variables

```bash
# .env file (created by make init)
GCP_PROJECT_ID=your-project-id
GCP_REGION=us-central1
SERVICE_NAME=hello-world-app
```

## Development Commands

### Frontend Development
```bash
cd frontend
npm run dev         # Start Vite dev server on port 5173
npm run build       # Build for production
npm run lint        # Run ESLint
npm run type-check  # Check TypeScript types
npm test           # Run tests (placeholder for now)
```

### Backend Development
```bash
cd backend
uvicorn main:app --reload --port 8000  # Start with hot reload
```

### Docker Testing
```bash
make build         # Build Docker image
make test-local    # Run container locally on port 8080
```

## Git Workflow

### Branch Strategy
```
main (production)
├── feat/new-feature
├── fix/bug-fix
└── chore/update-deps
```

### Commit Convention
```bash
# Format: type: description
git commit -m "feat: add user authentication"
git commit -m "fix: resolve API timeout issue"
git commit -m "docs: update README"
git commit -m "chore: update dependencies"
```

## Deployment

### Deploy to Production
```bash
# Ensure your .env is configured
make deploy  # Builds and deploys to Google Cloud Run
```

### Quick Deploy (Fastest)
```bash
make quick-deploy  # Deploy directly from source
```

### View Logs
```bash
make logs  # View Cloud Run logs
```

## Quality Checks

### Before Committing
```bash
# Frontend checks
cd frontend
npm run lint        # Must pass
npm run type-check  # Must pass

# Backend checks
cd backend
# Add Python linting when configured

# Full project check
make lint  # Runs all linters
```

## CI/CD Pipeline

The project uses GitHub Actions for automated deployment:

1. **Pull Requests**: Runs tests and deploys preview environment
2. **Main Branch**: Deploys to production Cloud Run service
3. **PR Close**: Cleans up preview environments

## Common Tasks

### Update Dependencies
```bash
# Frontend
cd frontend
npm update

# Backend
cd backend
pip install --upgrade -r requirements.txt
```

### Clean Rebuild
```bash
make clean     # Remove build artifacts
make install   # Reinstall dependencies
```

### Check Deployment Status
```bash
make status    # Show Cloud Run service status
```

## Troubleshooting

### Port Already in Use
```bash
# Find and kill process on port 8000
lsof -i :8000
kill -9 <PID>

# Or use different port
uvicorn main:app --reload --port 8001
```

### Docker Build Issues
```bash
# Clean Docker cache
docker system prune -a
make build
```

### Cloud Run Deployment Failed
```bash
# Check logs
make logs

# Verify credentials
gcloud auth list
gcloud config get-value project
```

This workflow keeps development simple and focused on the actual implementation.