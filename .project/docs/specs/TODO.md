# Emily Nap App - Implementation TODO

## Phase 1: Initial Setup & Testing (CURRENT)
- [x] Analyze specification document
- [x] Split spec into manageable documents  
- [x] Add temp directory to .gitignore
- [ ] Create TDD test structure in `.temp/`
- [ ] Write simple Oura API test scripts
- [ ] Test OAuth flow with test credentials

## Phase 2: Core Backend Implementation (TDD)
- [ ] Set up Jest testing framework
- [ ] Write tests for Oura service (`src/services/oura.js`)
- [ ] Implement Oura API service (TDD approach)
- [ ] Write tests for nap calculation logic
- [ ] Implement nap status calculation
- [ ] Write tests for authentication routes
- [ ] Implement OAuth authentication flow
- [ ] Write tests for API endpoints
- [ ] Implement `/api/nap-status` endpoint

## Phase 3: Frontend Implementation
- [ ] Create simple HTML/CSS/JS frontend
- [ ] Implement dynamic UI state changes
- [ ] Add responsive design for mobile
- [ ] Test authentication flow end-to-end

## Phase 4: Integration & Deployment
- [ ] Integrate with existing Cloud Run setup
- [ ] Update Dockerfile for Node.js
- [ ] Configure environment variables
- [ ] Test deployment pipeline
- [ ] Set up Oura OAuth application
- [ ] Configure redirect URLs
- [ ] Deploy to production

## Phase 5: Testing & Optimization
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] Caching optimization
- [ ] Security review

## Technical Notes
- Use test-driven development approach
- Leverage existing project structure where possible
- Implement in `.temp/` first for experimentation
- Follow existing code style and patterns
- Use existing Makefile commands for consistency

## Environment Variables Needed
```bash
OURA_CLIENT_ID=secret        # Already added
OURA_CLIENT_SECRET=secret    # Already added
SESSION_SECRET=random-string # Need to add
BASE_URL=https://...         # For OAuth redirects
```

## Key Files to Create
- `src/` - Main application code
- `src/tests/` - Test files
- `.temp/test-oura-api.js` - Quick API testing script
- `.temp/test-oauth.js` - OAuth flow testing
- Updated `package.json` with Node.js dependencies
- Updated `Dockerfile` for Node.js runtime