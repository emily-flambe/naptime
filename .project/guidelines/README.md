# Project Guidelines

This directory contains all development guidelines, standards, and best practices for the Web App Starter Pack project.

## Directory Structure

### Core Guidelines
- **[ai-behavior.md](core/ai-behavior.md)** - Critical rules for AI assistants working on this project
- **[project-principles.md](core/project-principles.md)** - Core principles and philosophies

### Development
- **[development-workflow.md](development/development-workflow.md)** - Git workflow, environment setup, and development process
- **[local-development.md](development/local-development.md)** - Local development strategy using Docker and Make
- **[deployment-strategy.md](development/deployment-strategy.md)** - Google Cloud Run deployment and CI/CD strategy

### Language Standards
- **[typescript-standards.md](languages/typescript-standards.md)** - TypeScript coding standards and patterns
- **[react-standards.md](languages/react-standards.md)** - React component patterns and best practices  
- **[python-standards.md](languages/python-standards.md)** - Python/FastAPI backend standards

### Testing & Quality
- **[tdd-approach.md](testing/tdd-approach.md)** - Test-driven development methodology
- **[playwright-debugging.md](testing/playwright-debugging.md)** - Browser automation debugging guide
- **[troubleshooting.md](testing/troubleshooting.md)** - Common issues and solutions

## Quick Reference

### Priority Order
1. **ALWAYS READ FIRST**: [ai-behavior.md](core/ai-behavior.md) - Contains critical security and quality rules
2. **Development Setup**: [local-development.md](development/local-development.md)
3. **Language Standards**: Based on what you're working on
4. **Testing**: [tdd-approach.md](testing/tdd-approach.md) for test requirements

### Key Principles
See [ai-behavior.md](core/ai-behavior.md) for complete list of critical rules and principles.

### Development Commands
```bash
# Setup
make init           # Interactive setup with .env configuration
make install        # Install all dependencies

# Development
make dev-frontend   # Start frontend (port 5173)
make dev-backend    # Start backend (port 8000)
make test-local     # Test with Docker locally

# Deployment
make build          # Build Docker image
make deploy         # Deploy to Google Cloud Run
make logs           # View Cloud Run logs

# Quality
make lint           # Check both frontend and backend code style
make format         # Format both frontend and backend code
cd frontend && npm run lint        # Check frontend only
cd frontend && npm run type-check  # TypeScript validation
npm run test:e2e    # End-to-end tests
```

### Technology Stack
- **Frontend**: React 19, TypeScript 5.8, Vite 7
- **Backend**: FastAPI (Python 3.11), Google Cloud Run
- **Testing**: Vitest, Playwright (when configured)

## File Organization Notes

Files have been reorganized to eliminate duplication and improve clarity:
- Combined overlapping TypeScript/React standards
- Separated core principles from implementation details
- Grouped related guidelines into subdirectories
- Removed redundant information across files

## Contributing

When updating guidelines:
1. Check for existing information to avoid duplication
2. Update the relevant file in the appropriate subdirectory
3. Keep examples current with latest versions
4. Test all code examples before committing