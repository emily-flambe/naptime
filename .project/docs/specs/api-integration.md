# Oura API Integration Specification

## API Endpoints Used

### Daily Sleep Data
```
GET https://api.ouraring.com/v2/usercollection/daily_sleep
```

## Authentication Methods

### Option 1: Personal Access Token (Simpler, Deprecated late 2025)
```bash
# Generate from Oura Cloud Portal
https://cloud.ouraring.com/personal-access-tokens
```

### Option 2: OAuth 2.0 (Recommended)
```javascript
// OAuth endpoints
const OURA_AUTH_URL = 'https://cloud.ouraring.com/oauth/authorize';
const OURA_TOKEN_URL = 'https://api.ouraring.com/oauth/token';
```

## Response Data Structure
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

## Required OAuth Setup

### Step 1: Create Oura OAuth Application
1. Go to https://cloud.ouraring.com/oauth/applications
2. Click "New Application"
3. Fill in:
   - **Application Name**: "Does Emily Need a Nap"
   - **Redirect URI**: `https://oura-naptime-[HASH]-uc.a.run.app/auth/callback`
   - **Scopes**: `daily_sleep personal`
4. Save Client ID and Client Secret

### Environment Variables Needed
```bash
OURA_CLIENT_ID=your-client-id
OURA_CLIENT_SECRET=your-client-secret
```