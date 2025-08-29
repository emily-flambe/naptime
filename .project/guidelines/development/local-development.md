# Local Development Strategy

## Overview

Simple local development setup for the Google Cloud Run starter pack with FastAPI backend and React frontend.

## Quick Start

```bash
# Set up environment
make init        # Interactive .env setup

# Install dependencies
make install     # Installs both frontend and backend deps

# Start development
make dev-backend   # Terminal 1: FastAPI on :8000
make dev-frontend  # Terminal 2: Vite on :5173
```

## Development Setup

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker (for local container testing)
- Make

### Environment Configuration

Create `.env` file (done by `make init`):
```bash
GCP_PROJECT_ID=your-project-id
GCP_REGION=us-central1
SERVICE_NAME=hello-world-app
```

### Frontend Development

```bash
cd frontend
npm install         # Install dependencies
npm run dev         # Start Vite dev server on :5173
npm run build       # Build for production
npm run lint        # Check code style
npm run type-check  # Validate TypeScript
```

**Features:**
- Hot Module Replacement (HMR)
- TypeScript support
- Vite's fast bundling
- API proxy to backend (configured in vite.config.ts)

### Backend Development

```bash
cd backend
pip install -r requirements.txt  # Install dependencies
uvicorn main:app --reload        # Start with hot reload on :8000
```

**Features:**
- Auto-reload on file changes
- FastAPI automatic API documentation at `/docs`
- CORS configured for local development

## Testing with Docker

```bash
# Build and run locally
make test-local

# Access at http://localhost:8080
```

This builds the same container that deploys to Cloud Run, ensuring consistency.

## Development Commands

### Make Commands
```bash
make help          # Show all available commands
make install       # Install all dependencies
make dev-frontend  # Start frontend dev server
make dev-backend   # Start backend dev server
make test-local    # Test with Docker locally
make lint          # Run linters
make format        # Format code
make clean         # Clean build artifacts
```

### Direct Commands
```bash
# Frontend
cd frontend && npm run dev
cd frontend && npm run lint
cd frontend && npm run type-check

# Backend
cd backend && uvicorn main:app --reload --port 8000

# Docker
docker build -t test-app .
docker run -p 8080:8080 test-app
```

## API Development

The backend serves two purposes:
1. API endpoints under `/api/*`
2. Static file serving for the React app in production

**Current endpoints:**
- `/api/health` - Health check
- `/api/hello` - Demo endpoint

## Common Issues

### Port Already in Use
```bash
# Kill process on port 8000
lsof -i :8000
kill -9 <PID>

# Or use different port
uvicorn main:app --reload --port 8001
```

### Frontend Can't Connect to Backend
Check that:
1. Backend is running on port 8000
2. CORS is configured in `backend/main.py`
3. Vite proxy is set in `frontend/vite.config.ts`

### Docker Build Fails
```bash
# Clean Docker cache
docker system prune -a

# Rebuild
make build
```

## Best Practices

1. **Always test with Docker before deploying** - Use `make test-local`
2. **Run linters before committing** - Use `make lint`
3. **Keep dependencies updated** - Regular `npm update` and `pip install --upgrade`
4. **Use the Makefile** - Consistent commands across the team

This approach keeps local development simple, fast, and consistent with production.