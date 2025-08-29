# Architecture Diagrams

Visual representations of the Web App Starter Pack architecture using Mermaid diagrams.

## System Overview

```mermaid
graph TB
    subgraph "Client Browser"
        React[React App<br/>TypeScript + Vite]
    end
    
    subgraph "Google Cloud Platform"
        subgraph "Cloud Run"
            Container[FastAPI Container<br/>Python 3.11]
            Static[Static Files<br/>React Build]
        end
        Registry[(Artifact Registry<br/>Docker Images)]
        Logging[Cloud Logging<br/>& Monitoring]
    end
    
    subgraph "Development Environment"
        Dev1[Vite Dev Server<br/>:5173]
        Dev2[Uvicorn Server<br/>:8000]
        Docker[Docker<br/>Local Container]
    end
    
    React -->|HTTPS/REST| Container
    Container --> Static
    Container --> Registry
    Container --> Logging
    
    Dev1 -.->|Development| React
    Dev2 -.->|Development| Container
    Docker -.->|Test Build| Container
```

## Request Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser as Browser
    participant CloudRun as Cloud Run LB
    participant Container as FastAPI Container
    participant Static as Static Files
    
    User->>Browser: Navigate to app
    Browser->>CloudRun: HTTPS Request
    CloudRun->>Container: Route Request
    
    alt API Request (/api/*)
        Container->>Container: Process API Request
        Container-->>CloudRun: JSON Response
    else Static Request
        Container->>Static: Serve React App
        Static-->>CloudRun: HTML/JS/CSS
    end
    
    CloudRun-->>Browser: Response
    Browser-->>User: Render UI
```

## Deployment Pipeline

```mermaid
graph LR
    subgraph "Development"
        Code[Source Code]
        Git[Git Push]
    end
    
    subgraph "GitHub Actions"
        Build[Docker Build<br/>Multi-stage]
        Test[Run Tests<br/>Lint & Type Check]
        Push[Push to Registry]
    end
    
    subgraph "Google Cloud"
        Registry[Artifact Registry<br/>Container Images]
        Deploy[Cloud Run Deploy]
        Service[Cloud Run Service<br/>Auto-scaling]
    end
    
    Code --> Git
    Git -->|main branch| Build
    Git -->|PR| Test
    Build --> Test
    Test --> Push
    Push --> Registry
    Registry --> Deploy
    Deploy --> Service
```

## Container Architecture

```mermaid
graph TB
    subgraph "Multi-Stage Docker Build"
        subgraph "Stage 1: Frontend Build"
            Node[Node 20-slim]
            NPM[npm install]
            ViteBuild[Vite Build]
            Dist[dist/ folder]
        end
        
        subgraph "Stage 2: Runtime"
            Python[Python 3.11-slim]
            Pip[pip install]
            FastAPI[FastAPI App]
            StaticFiles[Static Files<br/>from Stage 1]
            Uvicorn[Uvicorn Server]
        end
    end
    
    Node --> NPM
    NPM --> ViteBuild
    ViteBuild --> Dist
    Dist --> StaticFiles
    Python --> Pip
    Pip --> FastAPI
    FastAPI --> StaticFiles
    FastAPI --> Uvicorn
```

## CI/CD Workflow

```mermaid
graph TB
    subgraph "GitHub Repository"
        PR[Pull Request]
        Main[Main Branch]
    end
    
    subgraph "GitHub Actions Jobs"
        BuildJob[Build Docker Image]
        DeployJob[Deploy to Cloud Run]
        TestJob[Tests & Validation]
        SmokeTest[Smoke Test]
        Cleanup[Cleanup PR Preview]
    end
    
    subgraph "Deployment Targets"
        Preview[PR Preview<br/>hello-world-pr-N]
        Production[Production<br/>hello-world-app]
    end
    
    PR --> BuildJob
    PR --> TestJob
    PR --> DeployJob
    DeployJob -->|PR| Preview
    
    Main --> BuildJob
    Main --> TestJob
    Main --> DeployJob
    DeployJob -->|Main| Production
    
    DeployJob --> SmokeTest
    PR -->|closed| Cleanup
    Cleanup --> Preview
```

## Environment Configuration

```mermaid
graph LR
    subgraph "Local Development"
        ENV[.env file]
        MakeInit[make init<br/>Interactive Setup]
    end
    
    subgraph "CI/CD Pipeline"
        Secrets[GitHub Secrets]
        ServiceAccount[GCP Service Account]
    end
    
    subgraph "Production"
        CloudRunEnv[Cloud Run<br/>Environment Variables]
        Runtime[Runtime Configuration]
    end
    
    MakeInit --> ENV
    ENV -->|Development| Runtime
    Secrets --> ServiceAccount
    ServiceAccount -->|Deploy| CloudRunEnv
    CloudRunEnv --> Runtime
```

## API Architecture

```mermaid
graph TB
    subgraph "FastAPI Application"
        Main[main.py]
        
        subgraph "Middleware"
            CORS[CORS Middleware]
            ErrorHandler[Error Handling]
        end
        
        subgraph "API Routes"
            Health[/api/health]
            Hello[/api/hello]
            Future[Future Endpoints...]
        end
        
        subgraph "Static Serving"
            CatchAll[/* Catch-all Route]
            ReactApp[React SPA]
        end
    end
    
    Main --> CORS
    Main --> ErrorHandler
    Main --> Health
    Main --> Hello
    Main --> Future
    Main --> CatchAll
    CatchAll --> ReactApp
```

## Scaling Architecture

```mermaid
graph TB
    subgraph "Cloud Run Auto-scaling"
        LB[Load Balancer]
        
        subgraph "Container Instances"
            I1[Instance 1<br/>512Mi RAM]
            I2[Instance 2<br/>512Mi RAM]
            IN[Instance N<br/>512Mi RAM]
        end
        
        Metrics[Scaling Metrics<br/>CPU, Concurrency]
    end
    
    LB -->|Route| I1
    LB -->|Route| I2
    LB -->|Route| IN
    
    Metrics -->|Scale Up| IN
    Metrics -->|Scale Down| I1
    
    style I2 stroke-dasharray: 5 5
    style IN stroke-dasharray: 5 5
```

## Development Workflow

```mermaid
graph LR
    subgraph "Frontend Development"
        Edit1[Edit React Code]
        HMR[Vite HMR<br/>Hot Reload]
        Browser1[Browser<br/>:5173]
    end
    
    subgraph "Backend Development"
        Edit2[Edit Python Code]
        Reload[Uvicorn<br/>Auto-reload]
        API[API<br/>:8000]
    end
    
    subgraph "Integration Testing"
        Docker[Docker Build]
        Local[Local Container<br/>:8080]
    end
    
    Edit1 --> HMR
    HMR --> Browser1
    
    Edit2 --> Reload
    Reload --> API
    
    Browser1 -->|Proxy| API
    
    Edit1 --> Docker
    Edit2 --> Docker
    Docker --> Local
```

## Security Layers

```mermaid
graph TB
    subgraph "Security Architecture"
        subgraph "Network Layer"
            HTTPS[HTTPS Only]
            CloudArmor[Cloud Armor<br/>DDoS Protection]
        end
        
        subgraph "Application Layer"
            CORSConfig[CORS Configuration]
            InputVal[Input Validation]
            Headers[Security Headers]
        end
        
        subgraph "Container Layer"
            MinimalImage[Minimal Base Image]
            NonRoot[Non-root User]
            ReadOnly[Read-only Filesystem]
        end
        
        subgraph "Cloud Layer"
            IAM[IAM Roles]
            ServiceAcct[Service Accounts]
            Secrets[Secret Manager]
        end
    end
    
    HTTPS --> CloudArmor
    CloudArmor --> CORSConfig
    CORSConfig --> InputVal
    InputVal --> Headers
    Headers --> MinimalImage
    MinimalImage --> NonRoot
    NonRoot --> ReadOnly
    ReadOnly --> IAM
    IAM --> ServiceAcct
    ServiceAcct --> Secrets
```

These diagrams provide a comprehensive visual overview of the Google Cloud Run architecture, showing the complete system from development through deployment and production operation.