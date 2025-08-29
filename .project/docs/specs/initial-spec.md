# **"Does Emily Need a Nap?" Technical Specification**
## Complete Implementation Guide for Oura + Google Cloud Run

---

## **Table of Contents**
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Oura API Integration](#oura-api-integration)
4. [Authentication & Setup](#authentication--setup)
5. [Implementation](#implementation)
6. [UI/UX Design](#uiux-design)
7. [Deployment](#deployment)
8. [Security Considerations](#security-considerations)
9. [Future Enhancements](#future-enhancements)

---

## **Project Overview**

### **Purpose**
A minimalist web application that determines if Emily needs a nap based on:
- Previous night's sleep data from Oura Ring
- Current time of day (Mountain Time)

### **Nap Logic**
Emily needs a nap if:
1. She got less than 6 hours of sleep last night AND
2. Current time is between 2:00 PM and 5:00 PM Mountain Time

### **Tech Stack**
- **Frontend**: Static HTML/CSS/JavaScript
- **Backend**: Node.js/Express on Cloud Run
- **Data Source**: Oura API v2
- **Deployment**: Google Cloud Run
- **Authentication**: OAuth 2.0 with Oura
- **Secrets Management**: Google Secret Manager
- **Database** (optional): Firestore for token storage

---

## **Architecture**

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────┐
│                 │       │                  │       │             │
│  Browser/User   │──────▶│  Cloud Run       │──────▶│  Oura API   │
│                 │       │  Container       │       │             │
└─────────────────┘       └──────────────────┘       └─────────────┘
                                 │
                                 ▼
                          ┌──────────────────┐
                          │                  │
                          │  Firestore/      │
                          │  Memory Cache    │
                          │                  │
                          └──────────────────┘
```

---

## **Oura API Integration**

### **API Endpoints Used**

**Daily Sleep Data:**
```
GET https://api.ouraring.com/v2/usercollection/daily_sleep
```

### **Authentication Methods**

**Option 1: Personal Access Token (Simpler, Deprecated late 2025)**
```bash
# Generate from Oura Cloud Portal
https://cloud.ouraring.com/personal-access-tokens
```

**Option 2: OAuth 2.0 (Recommended)**
```javascript
// OAuth endpoints
const OURA_AUTH_URL = 'https://cloud.ouraring.com/oauth/authorize';
const OURA_TOKEN_URL = 'https://api.ouraring.com/oauth/token';
```

### **Response Data Structure**
```json
{
  "data": [
    {
      "id": "uuid",
      "day": "2024-01-15",
      "score": 85,
      "timestamp": "2024-01-15T00:00:00+00:00",
      "contributors": {
        "deep_sleep": 95,
        "efficiency": 90,
        "latency": 88,
        "rem_sleep": 70,
        "restfulness": 54,
        "timing": 94,
        "total_sleep": 88
      },
      "total_sleep_duration": 27900  // seconds (7.75 hours)
    }
  ],
  "next_token": null
}
```

---

## **Authentication & Setup**

### **Step 1: Create Oura OAuth Application**

1. Go to https://cloud.ouraring.com/oauth/applications
2. Click "New Application"
3. Fill in:
   - **Application Name**: "Does Emily Need a Nap"
   - **Redirect URI**: `https://emily-nap-[HASH]-uc.a.run.app/callback` (update after deployment)
   - **Scopes**: `daily_sleep`
4. Save Client ID and Client Secret

### **Step 2: Set Up Google Cloud Project**

```bash
# Install gcloud CLI if not already installed
# https://cloud.google.com/sdk/docs/install

# Initialize gcloud and create new project
gcloud init
gcloud projects create emily-nap-app --name="Emily Nap App"
gcloud config set project emily-nap-app

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable firestore.googleapis.com

# Set default region
gcloud config set run/region us-central1
```

### **Step 3: Set Up Secret Manager**

```bash
# Store Oura OAuth credentials
echo -n "your-client-id" | gcloud secrets create oura-client-id --data-file=-
echo -n "your-client-secret" | gcloud secrets create oura-client-secret --data-file=-

# Grant Cloud Run access to secrets
gcloud projects add-iam-policy-binding emily-nap-app \
  --member=serviceAccount:$(gcloud projects describe emily-nap-app --format="value(projectNumber)")-compute@developer.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

---

## **Implementation**

### **Project Structure**
```
emily-nap-app/
├── package.json
├── package-lock.json
├── Dockerfile
├── .dockerignore
├── .gcloudignore
├── src/
│   ├── index.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── api.js
│   ├── services/
│   │   ├── oura.js
│   │   └── cache.js
│   └── public/
│       └── index.html
└── README.md
```

### **package.json**
```json
{
  "name": "emily-nap-app",
  "version": "1.0.0",
  "description": "Does Emily Need a Nap?",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "deploy": "gcloud run deploy emily-nap-app --source ."
  },
  "dependencies": {
    "express": "^4.18.2",
    "express-session": "^1.17.3",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1",
    "@google-cloud/secret-manager": "^5.0.1",
    "@google-cloud/firestore": "^7.1.0",
    "node-cache": "^5.1.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### **Dockerfile**
```dockerfile
FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "src/index.js"]
```

### **.dockerignore**
```
node_modules
npm-debug.log
.env
.env.local
.git
.gitignore
README.md
.gcloudignore
*.md
```

### **src/index.js**
```javascript
const express = require('express');
const session = require('express-session');
const path = require('path');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// Import routes
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Secret Manager
const secretManager = new SecretManagerServiceClient();

// Load secrets
async function loadSecrets() {
  if (process.env.NODE_ENV === 'development') {
    // Use local .env file for development
    require('dotenv').config();
    return {
      clientId: process.env.OURA_CLIENT_ID,
      clientSecret: process.env.OURA_CLIENT_SECRET,
      sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-in-production'
    };
  }

  // Load from Secret Manager in production
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;

  const [clientId] = await secretManager.accessSecretVersion({
    name: `projects/${projectId}/secrets/oura-client-id/versions/latest`
  });

  const [clientSecret] = await secretManager.accessSecretVersion({
    name: `projects/${projectId}/secrets/oura-client-secret/versions/latest`
  });

  return {
    clientId: clientId.payload.data.toString(),
    clientSecret: clientSecret.payload.data.toString(),
    sessionSecret: process.env.SESSION_SECRET || 'change-this-in-production'
  };
}

// Initialize app
async function initializeApp() {
  const secrets = await loadSecrets();

  // Session configuration
  app.use(session({
    secret: secrets.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Store secrets in app locals
  app.locals.ouraClientId = secrets.clientId;
  app.locals.ouraClientSecret = secrets.clientSecret;

  // Serve static files
  app.use(express.static(path.join(__dirname, 'public')));

  // Routes
  app.use('/auth', authRoutes);
  app.use('/api', apiRoutes);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Root route - serve HTML
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // Error handling
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Start the application
initializeApp().catch(console.error);
```

### **src/routes/auth.js**
```javascript
const express = require('express');
const axios = require('axios');
const router = express.Router();

const OURA_AUTH_URL = 'https://cloud.ouraring.com/oauth/authorize';
const OURA_TOKEN_URL = 'https://api.ouraring.com/oauth/token';

// Start OAuth flow
router.get('/login', (req, res) => {
  const state = Math.random().toString(36).substring(7);
  req.session.oauthState = state;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: req.app.locals.ouraClientId,
    redirect_uri: `${getBaseUrl(req)}/auth/callback`,
    scope: 'daily_sleep personal',
    state: state
  });

  res.redirect(`${OURA_AUTH_URL}?${params}`);
});

// OAuth callback
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  // Verify state
  if (state !== req.session.oauthState) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }

  try {
    // Exchange code for tokens
    const response = await axios.post(OURA_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: req.app.locals.ouraClientId,
        client_secret: req.app.locals.ouraClientSecret,
        redirect_uri: `${getBaseUrl(req)}/auth/callback`
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    // Store tokens in session
    req.session.accessToken = response.data.access_token;
    req.session.refreshToken = response.data.refresh_token;
    req.session.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

    // Redirect to home
    res.redirect('/');
  } catch (error) {
    console.error('OAuth error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Helper function to get base URL
function getBaseUrl(req) {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  return `${protocol}://${req.get('host')}`;
}

module.exports = router;
```

### **src/routes/api.js**
```javascript
const express = require('express');
const router = express.Router();
const ouraService = require('../services/oura');
const cacheService = require('../services/cache');

// Get nap status
router.get('/nap-status', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.session.accessToken) {
      return res.status(401).json({
        error: 'Not authenticated',
        authUrl: '/auth/login'
      });
    }

    // Check cache first
    const cacheKey = `nap_status_${req.session.userId || 'default'}`;
    const cachedStatus = cacheService.get(cacheKey);

    if (cachedStatus) {
      return res.json(cachedStatus);
    }

    // Check if token needs refresh
    if (req.session.tokenExpiry && Date.now() > req.session.tokenExpiry - 60000) {
      await refreshAccessToken(req);
    }

    // Get sleep data from Oura
    const sleepData = await ouraService.getYesterdaySleep(req.session.accessToken);

    // Calculate nap status
    const status = calculateNapStatus(sleepData);

    // Cache for 5 minutes
    cacheService.set(cacheKey, status, 300);

    res.json(status);
  } catch (error) {
    console.error('API error:', error);

    if (error.response?.status === 401) {
      // Token expired, try to refresh
      try {
        await refreshAccessToken(req);
        // Retry the request
        return router.handle(req, res);
      } catch (refreshError) {
        return res.status(401).json({
          error: 'Authentication expired',
          authUrl: '/auth/login'
        });
      }
    }

    res.status(500).json({
      error: 'Failed to fetch nap status',
      message: error.message
    });
  }
});

// Calculate nap status
function calculateNapStatus(sleepData) {
  const sleepRecord = sleepData.data?.[0];
  const sleepSeconds = sleepRecord?.total_sleep_duration || 0;
  const sleepHours = sleepSeconds / 3600;

  // Get Mountain Time
  const now = new Date();
  const mountainTime = new Date(now.toLocaleString("en-US", {
    timeZone: "America/Denver"
  }));

  const hour = mountainTime.getHours();
  const isNapTime = hour >= 14 && hour < 17;

  const needsNap = sleepHours < 6 && isNapTime;

  return {
    needsNap,
    sleepHours: sleepHours.toFixed(1),
    sleepScore: sleepRecord?.score || null,
    isNapTime,
    currentTime: mountainTime.toLocaleString("en-US", {
      timeZone: "America/Denver",
      timeStyle: "short"
    }),
    lastUpdated: new Date().toISOString(),
    message: needsNap
      ? 'YES, EMILY NEEDS A NAP'
      : (!isNapTime && sleepHours < 6)
        ? 'Not Nap Time Yet'
        : "Nah, She's Fine",
    details: {
      deepSleep: sleepRecord?.contributors?.deep_sleep,
      efficiency: sleepRecord?.contributors?.efficiency,
      restfulness: sleepRecord?.contributors?.restfulness
    }
  };
}

// Refresh access token
async function refreshAccessToken(req) {
  if (!req.session.refreshToken) {
    throw new Error('No refresh token available');
  }

  const axios = require('axios');
  const response = await axios.post('https://api.ouraring.com/oauth/token',
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: req.session.refreshToken,
      client_id: req.app.locals.ouraClientId,
      client_secret: req.app.locals.ouraClientSecret
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  req.session.accessToken = response.data.access_token;
  req.session.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

  if (response.data.refresh_token) {
    req.session.refreshToken = response.data.refresh_token;
  }
}

module.exports = router;
```

### **src/services/oura.js**
```javascript
const axios = require('axios');

const OURA_API_BASE = 'https://api.ouraring.com/v2';

class OuraService {
  async getYesterdaySleep(accessToken) {
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateString = yesterday.toISOString().split('T')[0];

    const response = await axios.get(
      `${OURA_API_BASE}/usercollection/daily_sleep`,
      {
        params: {
          start_date: dateString,
          end_date: dateString
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    return response.data;
  }

  async getUserInfo(accessToken) {
    const response = await axios.get(
      `${OURA_API_BASE}/usercollection/personal_info`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    return response.data;
  }

  async getReadiness(accessToken, date) {
    const response = await axios.get(
      `${OURA_API_BASE}/usercollection/daily_readiness`,
      {
        params: {
          start_date: date,
          end_date: date
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    return response.data;
  }
}

module.exports = new OuraService();
```

### **src/services/cache.js**
```javascript
const NodeCache = require('node-cache');

class CacheService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutes default
      checkperiod: 60 // Check for expired keys every 60 seconds
    });
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value, ttl = 300) {
    return this.cache.set(key, value, ttl);
  }

  del(key) {
    return this.cache.del(key);
  }

  flush() {
    return this.cache.flushAll();
  }

  getStats() {
    return this.cache.getStats();
  }
}

module.exports = new CacheService();
```

### **src/public/index.html**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Does Emily Need a Nap?</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            transition: background-color 0.5s ease;
            overflow: hidden;
        }

        .container {
            text-align: center;
            padding: 2rem;
            max-width: 600px;
            animation: fadeIn 0.5s ease;
        }

        h1 {
            font-size: clamp(2rem, 5vw, 3.5rem);
            margin-bottom: 2rem;
            font-weight: 900;
            letter-spacing: -0.02em;
            transition: all 0.3s ease;
        }

        .sleep-info {
            font-size: 1.1rem;
            opacity: 0.7;
            margin-bottom: 1rem;
            font-weight: 300;
        }

        .time-info {
            font-size: 0.9rem;
            opacity: 0.5;
            margin-top: 2rem;
        }

        /* Nap needed state */
        body.needs-nap {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        /* No nap needed state */
        body.no-nap {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
        }

        /* Loading state */
        body.loading {
            background: linear-gradient(135deg, #e0e0e0 0%, #bdbdbd 100%);
            color: #666;
        }

        /* Not nap time state */
        body.not-nap-time {
            background: linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%);
            color: white;
        }

        /* Error state */
        body.error {
            background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
            color: white;
        }

        .button {
            margin-top: 2rem;
            padding: 0.8rem 2rem;
            font-size: 1rem;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
            text-decoration: none;
            display: inline-block;
        }

        .button:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
```
