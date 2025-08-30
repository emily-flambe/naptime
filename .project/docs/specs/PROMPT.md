# Implementation Prompt for Emily Nap App

## Context
You are implementing "Does Emily Need a Nap?" - a web app that uses Oura Ring sleep data to determine if Emily needs a nap based on:
1. Less than 6 hours sleep last night AND
2. Current time is 2-5 PM Mountain Time

## Current Status
- Project uses FastAPI/React starter template on Google Cloud Run
- Oura OAuth credentials are configured in `.env.example`
- Specification has been split into focused documents in `.project/docs/specs/`
- Ready to begin TDD implementation

## Your Task
**Start with simple Oura API testing scripts in `.temp/` directory, then implement the full Node.js backend using test-driven development.**

## Key Requirements
1. **Use TDD approach** - write tests first, then implement
2. **Start simple** - create test scripts in `.temp/` to verify Oura API works
3. **Follow existing patterns** - leverage current project structure where possible
4. **Node.js backend** - replace FastAPI with Express.js
5. **OAuth authentication** - implement Oura OAuth 2.0 flow
6. **Mountain Time logic** - proper timezone handling for nap timing

## Reference Documents
- `TODO.md` - Complete implementation checklist
- `.project/docs/specs/overview.md` - Project overview and architecture
- `.project/docs/specs/api-integration.md` - Oura API details and OAuth setup
- `.project/docs/specs/implementation-structure.md` - Code structure and core logic
- `.project/docs/specs/initial-spec.md` - Original complete specification

## Environment Variables Available
```bash
OURA_CLIENT_ID=secret        # OAuth client ID
OURA_CLIENT_SECRET=secret    # OAuth client secret
```

## First Steps
1. Create `.temp/test-oura-api.js` to test basic API calls
2. Set up Jest testing framework
3. Write tests for core nap logic
4. Implement Oura service with TDD
5. Build OAuth authentication flow

## Success Criteria
- Oura API integration working
- Nap logic correctly implemented with Mountain Time
- OAuth authentication flow functional
- Frontend displays nap status dynamically
- Deployable to existing Cloud Run setup

Use the existing project's Makefile commands, Cloud Run deployment pipeline, and follow the established code quality standards.