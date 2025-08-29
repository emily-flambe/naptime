# Setting Up Your New App from the Web App Starter Pack

This guide walks you through creating a new application using the Web App Starter Pack template. Follow these steps to get your project running locally and deployed to production.

## Prerequisites

Before starting, ensure you have:
- **Node.js 20+** installed (check with `node --version`)
- **npm 10+** installed (check with `npm --version`)
- **Git** installed and configured
- A **Cloudflare account** (free tier works)
- A **GitHub account** for version control

## Step 1: Create Your New Repository

### Option A: Use as GitHub Template (Recommended)
1. Visit the Web App Starter Pack repository on GitHub
2. Click the green "Use this template" button
3. Choose "Create a new repository"
4. Name your repository (e.g., `my-awesome-app`)
5. Choose public or private visibility
6. Click "Create repository from template"

### Option B: Clone and Reinitialize
```bash
# Clone the starter pack
git clone https://github.com/yourusername/web-app-starter-pack.git my-awesome-app
cd my-awesome-app

# Remove existing git history
rm -rf .git

# Initialize new repository
git init
git add .
git commit -m "Initial commit from Web App Starter Pack"

# Add your remote repository
git remote add origin https://github.com/yourusername/my-awesome-app.git
git push -u origin main
```

## Step 2: Initial Setup

```bash
# Navigate to your project
cd my-awesome-app

# Use the correct Node version
nvm use  # or manually install Node 20+ if you don't use nvm

# Install dependencies
npm install

# Copy environment files
cp .env.example .env.local
cp .dev.vars.example .dev.vars
```

### Pro Tip: Claude Code Integration

If you're using Claude Code for development, create this alias to ensure it always follows the project guidelines:

```bash
# Add to your ~/.bashrc or ~/.zshrc
alias claudia='claude "Start by running ls -la and then read and understand the steering and documentation in the .project/ directory. Pay EXTRA CAREFUL attention to any files guiding AI behavior. Never say '\''you'\''re absolutely right'\'' ever!!! ALWAYS follow ALL guidelines and standards defined in these files throughout our conversation."'

# Then use claudia instead of claude when working on your project
claudia
```

This ensures Claude reads and follows all project standards, avoiding common pitfalls like using emojis in code or making untested changes.

## Step 3: Configure Environment Variables

### Local Development (.env.local)
Edit `.env.local` with your development settings:
```env
# Frontend environment variables
VITE_API_URL=http://localhost:8787
VITE_APP_NAME="My Awesome App"
```

### Cloudflare Workers (.dev.vars)
Edit `.dev.vars` for local Cloudflare Workers development:
```env
# Backend secrets (never commit this file!)
DATABASE_URL=your_database_url
JWT_SECRET=your-super-secret-jwt-key
# Add other API keys and secrets here
```

## Step 4: Set Up Cloudflare

### Create a Cloudflare Account
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Sign up or log in
3. Note your Account ID from the dashboard

### Configure Wrangler
```bash
# Login to Cloudflare
npx wrangler login

# Update wrangler.toml with your account ID
# Edit the file and replace:
# account_id = "your_account_id_here"
```

### Create D1 Database
```bash
# Create a new D1 database
npx wrangler d1 create your-app-db

# Copy the database_id from the output
# Update wrangler.toml with your database_id:
# [[d1_databases]]
# binding = "DB"
# database_name = "your-app-db"
# database_id = "your_database_id_here"

# Run initial migrations
npm run db:migrate
```

## Step 5: Customize Your Application

### Update Application Details
1. Edit `package.json`:
   - Change `name` to your app name
   - Update `description`
   - Modify `author` and `repository` fields

2. Update `index.html`:
   - Change `<title>` tag
   - Update meta descriptions

3. Modify `src/App.tsx`:
   - Replace placeholder content with your app

### Configure Deployment
Edit `wrangler.toml`:
```toml
name = "your-app-name"
compatibility_date = "2024-01-01"
account_id = "your_account_id"

# Update with your custom domain (optional)
routes = [
  { pattern = "your-domain.com/*", custom_domain = true }
]
```

## Step 6: Development Workflow

### Start Development Servers
```bash
# Terminal 1: Start frontend (Vite)
npm run dev

# Terminal 2: Start backend (Cloudflare Workers)
npm run worker:dev

# Or use the combined command:
npm run dev:all
```

Your app is now running at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8787

### Run Tests
```bash
# Unit tests
npm test

# End-to-end tests
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

## Step 7: Make Your First Changes

1. **Create a new component**: Add to `src/components/`
2. **Add an API endpoint**: Modify `worker/src/index.ts`
3. **Update styles**: Use Tailwind classes or modify `src/index.css`
4. **Add a new page**: Create in `src/pages/` (if using routing)

### Example: Adding a New Feature
```typescript
// src/components/features/MyFeature.tsx
import React from 'react';

export function MyFeature() {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold">My New Feature</h2>
      <p className="mt-2 text-gray-600">
        Start building something amazing!
      </p>
    </div>
  );
}
```

## Step 8: Deploy to Production

### Build for Production
```bash
# Build frontend and backend
npm run build

# Preview production build locally
npm run preview
```

### Deploy to Cloudflare
```bash
# Deploy to Cloudflare Workers
npm run deploy

# Your app will be available at:
# https://your-app-name.your-subdomain.workers.dev
```

### Set Production Secrets
```bash
# Set production environment variables
npx wrangler secret put JWT_SECRET
npx wrangler secret put DATABASE_URL
# Follow prompts to enter values
```

## Step 9: Set Up CI/CD (Optional)

### GitHub Actions
The template includes GitHub Actions workflows for:
- Automated testing on pull requests
- Deployment to Cloudflare on merge to main

To enable:
1. Go to your GitHub repository settings
2. Navigate to Secrets and Variables > Actions
3. Add these secrets:
   - `CLOUDFLARE_API_TOKEN` - Create at dash.cloudflare.com/profile/api-tokens
   - `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

## Step 10: Next Steps

### Recommended Enhancements
1. **Authentication**: Implement user authentication using the auth utilities
2. **Database Schema**: Define your data models in `worker/src/schema/`
3. **API Routes**: Add endpoints in `worker/src/routes/`
4. **State Management**: Set up global state if needed
5. **Monitoring**: Add error tracking (e.g., Sentry)
6. **Analytics**: Implement user analytics

### Useful Commands Reference
```bash
# Development
npm run dev          # Start frontend dev server
npm run worker:dev   # Start backend dev server
npm run dev:all      # Start both servers

# Testing
npm test            # Run unit tests
npm run test:e2e    # Run E2E tests
npm run test:watch  # Run tests in watch mode

# Building
npm run build       # Build for production
npm run preview     # Preview production build

# Database
npm run db:migrate  # Run migrations
npm run db:seed     # Seed database (if configured)

# Deployment
npm run deploy      # Deploy to Cloudflare
npm run deploy:preview  # Deploy preview environment
```

## Troubleshooting

### Common Issues

**Port already in use**
```bash
# Kill processes on ports
lsof -ti:5173 | xargs kill -9  # Frontend port
lsof -ti:8787 | xargs kill -9  # Backend port
```

**Node version mismatch**
```bash
# Use nvm to switch to correct version
nvm use
# Or install the version specified in .nvmrc
nvm install
```

**Cloudflare deployment fails**
- Verify your account ID in `wrangler.toml`
- Check you're logged in: `npx wrangler whoami`
- Ensure all secrets are set: `npx wrangler secret list`

**TypeScript errors**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run type-check
```

## Getting Help

- **Documentation**: Check `.project/guidelines/` for detailed guides
- **Issues**: Report bugs on GitHub Issues
- **Updates**: Pull latest changes from the template repository

## Security Reminders

1. **Never commit secrets** - Use environment variables
2. **Keep dependencies updated** - Run `npm audit` regularly
3. **Use HTTPS in production** - Cloudflare provides this automatically
4. **Validate all user input** - Both frontend and backend
5. **Implement rate limiting** - Protect your APIs

---

Congratulations! Your new app is ready for development. Start building something amazing!