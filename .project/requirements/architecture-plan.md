# Architecture Planning Document

## System Architecture Overview

### Design Philosophy

**Cloud-Native First**: Built specifically for Google Cloud Run, leveraging serverless container deployment for automatic scaling and cost efficiency.

**Full-Stack Simplicity**: Single repository with FastAPI backend and React frontend, deployed as a unified container for operational simplicity.

**Production-Ready**: Includes CI/CD, health checks, environment management, and deployment automation from day one.

## Layered Architecture

### 1. Presentation Layer (Frontend)
```
┌─────────────────────────────────────┐
│         React 18 + TypeScript       │
├─────────────────────────────────────┤
│  Components                         │
│  ├── App.tsx (Main Component)       │
│  ├── API Integration                │
│  └── Error Handling                 │
├─────────────────────────────────────┤
│  Build System (Vite)                │
│  ├── Hot Module Replacement         │
│  ├── TypeScript Compilation         │
│  └── Production Optimization        │
├─────────────────────────────────────┤
│  Static Assets                      │
│  └── Served by FastAPI in prod      │
└─────────────────────────────────────┘
```

### 2. API Layer (Backend)
```
┌─────────────────────────────────────┐
│      FastAPI Application            │
├─────────────────────────────────────┤
│  API Endpoints                      │
│  ├── /api/health (Health Check)     │
│  ├── /api/hello (Demo Endpoint)     │
│  └── Future endpoints...            │
├─────────────────────────────────────┤
│  Middleware                         │
│  ├── CORS Configuration             │
│  ├── Error Handling                 │
│  └── Request Logging                │
├─────────────────────────────────────┤
│  Static File Serving                │
│  └── Catch-all for React SPA        │
└─────────────────────────────────────┘
```

### 3. Container Layer
```
┌─────────────────────────────────────┐
│      Docker Container               │
├─────────────────────────────────────┤
│  Multi-Stage Build                  │
│  ├── Stage 1: Frontend Build        │
│  │   └── Node.js + npm              │
│  ├── Stage 2: Runtime               │
│  │   └── Python + FastAPI           │
│  └── Platform: linux/amd64          │
├─────────────────────────────────────┤
│  Configuration                      │
│  ├── PORT: 8080 (Cloud Run)         │
│  ├── Environment Variables          │
│  └── Start Script (uvicorn)         │
└─────────────────────────────────────┘
```

### 4. Infrastructure Layer (Google Cloud)
```
┌─────────────────────────────────────┐
│      Google Cloud Platform          │
├─────────────────────────────────────┤
│  Cloud Run                          │
│  ├── Serverless Containers          │
│  ├── Auto-scaling (0 to N)          │
│  ├── HTTPS Load Balancing           │
│  └── Regional Deployment            │
├─────────────────────────────────────┤
│  Artifact Registry                  │
│  ├── Docker Image Storage           │
│  ├── Vulnerability Scanning         │
│  └── Version Management             │
├─────────────────────────────────────┤
│  Cloud Logging & Monitoring         │
│  └── Automatic Log Collection       │
└─────────────────────────────────────┘
```

## Deployment Architecture

### CI/CD Pipeline
```
┌─────────────────────────────────────┐
│       GitHub Repository             │
├─────────────────────────────────────┤
│  GitHub Actions Workflows           │
│  ├── PR Validation                  │
│  │   ├── Linting                    │
│  │   ├── Type Checking              │
│  │   └── Tests                      │
│  ├── Main Branch Deployment         │
│  │   ├── Build Docker Image         │
│  │   ├── Push to Artifact Registry  │
│  │   └── Deploy to Cloud Run        │
│  └── PR Preview Environments        │
└─────────────────────────────────────┘
```

### Environment Management
```
┌─────────────────────────────────────┐
│     Configuration Management        │
├─────────────────────────────────────┤
│  Local Development                  │
│  ├── .env file                      │
│  ├── make init (interactive)        │
│  └── Docker Compose (optional)      │
├─────────────────────────────────────┤
│  CI/CD                              │
│  ├── GitHub Secrets                 │
│  └── Service Account Keys           │
├─────────────────────────────────────┤
│  Production                         │
│  └── Cloud Run Environment Vars     │
└─────────────────────────────────────┘
```

## Data Flow

### Request Flow
```
User Request
    ↓
Cloud Run Load Balancer
    ↓
Container Instance
    ↓
Uvicorn ASGI Server
    ↓
FastAPI Application
    ↓
Route Handler
    ├── API Route → JSON Response
    └── Catch-all → React SPA
```

### Development Flow
```
Code Changes
    ↓
Git Commit
    ↓
Push to Branch
    ↓
GitHub Actions
    ├── PR: Tests Only
    └── Main: Test + Deploy
         ↓
    Docker Build
         ↓
    Artifact Registry
         ↓
    Cloud Run Deploy
```

## Directory Structure
```
web-app-starter-pack-gcp/
├── .github/
│   └── workflows/         # CI/CD pipelines
├── backend/
│   ├── main.py           # FastAPI application
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── src/              # React source code
│   ├── package.json      # Node dependencies
│   └── vite.config.ts    # Build configuration
├── .env.example          # Environment template
├── Dockerfile            # Container definition
├── Makefile             # Automation commands
└── README.md            # Documentation
```

## Security Architecture

### Authentication & Authorization
```
Current: Public access (no auth)
Future: Can integrate with:
- Firebase Authentication
- Google Cloud Identity Platform
- Auth0
- Custom JWT implementation
```

### Security Layers
1. **Network**: HTTPS by default on Cloud Run
2. **Application**: CORS configuration, input validation
3. **Container**: Minimal base images, non-root user
4. **CI/CD**: Secret management via GitHub Secrets
5. **Cloud**: IAM roles, service accounts

## Scalability Considerations

### Horizontal Scaling
- **Cloud Run**: Automatic scaling from 0 to N instances
- **Stateless Design**: No server-side session storage
- **Database Ready**: Can add Cloud SQL or Firestore

### Performance Optimization
- **Frontend**: Vite bundling, code splitting ready
- **Backend**: FastAPI async endpoints
- **Container**: Multi-stage builds, layer caching
- **CDN Ready**: Static assets can be served via CDN

## Future Extension Points

### Database Integration
```python
# Easy to add database support
from sqlalchemy import create_engine
from databases import Database

# Cloud SQL, AlloyDB, or any SQL database
DATABASE_URL = os.getenv("DATABASE_URL")
database = Database(DATABASE_URL)
```

### Authentication
```python
# Add authentication middleware
from fastapi.security import OAuth2PasswordBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
```

### API Expansion
```python
# Add new routers for features
from fastapi import APIRouter
users_router = APIRouter(prefix="/api/users")
app.include_router(users_router)
```

### Frontend Features
```typescript
// Add routing
import { BrowserRouter } from 'react-router-dom'

// Add state management
import { QueryClient } from '@tanstack/react-query'

// Add UI library
import { ChakraProvider } from '@chakra-ui/react'
```

## Technology Decisions

### Why FastAPI?
- High performance with Python
- Automatic API documentation
- Type hints and validation
- Async support
- Easy to learn and use

### Why React + Vite?
- Modern development experience
- Fast refresh in development
- Optimized production builds
- TypeScript support
- Large ecosystem

### Why Google Cloud Run?
- Serverless simplicity
- Automatic scaling
- Pay-per-use pricing
- Container flexibility
- Google Cloud integration

### Why Docker?
- Consistent environments
- Platform portability
- Multi-stage optimization
- Industry standard

## Monitoring & Observability

### Current Implementation
- Cloud Logging (automatic)
- Health check endpoint
- Deployment status in GitHub

### Future Enhancements
- Cloud Monitoring dashboards
- Custom metrics
- Error tracking (Sentry)
- Performance monitoring
- Uptime monitoring

This architecture provides a solid foundation for building production applications while maintaining simplicity and room for growth.