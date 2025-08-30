# Implementation Structure

## Project Structure
```
src/
├── index.js              # Main server entry point
├── routes/
│   ├── auth.js           # OAuth authentication routes
│   └── api.js            # API endpoints for nap status
├── services/
│   ├── oura.js           # Oura API service
│   └── cache.js          # In-memory cache service
├── tests/                # Test files (TDD approach)
│   ├── oura.test.js      # Oura API tests
│   ├── auth.test.js      # Authentication tests
│   └── api.test.js       # API endpoint tests
└── public/
    └── index.html        # Frontend UI
```

## Key Dependencies
```json
{
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
    "jest": "^29.0.0",
    "supertest": "^6.3.0",
    "nodemon": "^3.0.1"
  }
}
```

## Core Functions

### Nap Status Calculation
```javascript
function calculateNapStatus(sleepData) {
  const sleepRecord = sleepData.data?.[0];
  const sleepSeconds = sleepRecord?.total_sleep_duration || 0;
  const sleepHours = sleepSeconds / 3600;

  // Get Mountain Time
  const mountainTime = new Date(new Date().toLocaleString("en-US", {
    timeZone: "America/Denver"
  }));

  const hour = mountainTime.getHours();
  const isNapTime = hour >= 14 && hour < 17; // 2 PM - 5 PM

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
    message: needsNap 
      ? 'YES, EMILY NEEDS A NAP'
      : (!isNapTime && sleepHours < 6)
        ? 'Not Nap Time Yet' 
        : "Nah, She's Fine"
  };
}
```

## Test-Driven Development Approach
1. Write tests first for each component
2. Implement minimal code to pass tests
3. Refactor and optimize
4. Repeat for each feature

## Environment Setup
- Use existing FastAPI backend structure as reference
- Leverage current Cloud Run deployment pipeline
- Integrate with existing Makefile commands