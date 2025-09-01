# Oura API Data Guide

## Overview

The Oura Ring API provides access to comprehensive health and wellness data collected by your ring. This guide explains the different types of data available and how to retrieve them.

## Authentication

All Oura API requests require a Personal Access Token:

```javascript
const headers = {
  'Authorization': `Bearer ${YOUR_OURA_TOKEN}`
};
```

## Base URL

All API endpoints use this base URL:
```
https://api.ouraring.com/v2
```

## Available Data Types

### 1. Sleep Data

The most comprehensive data from Oura, tracking your nightly rest patterns.

**Endpoint:** `/usercollection/daily_sleep`

**Key Metrics:**
- `total_sleep_duration` - Total sleep time in seconds
- `time_in_bed` - Total time spent in bed
- `awake_time` - Time spent awake during sleep period
- `rem_sleep_duration` - REM sleep in seconds
- `light_sleep_duration` - Light sleep in seconds
- `deep_sleep_duration` - Deep sleep in seconds
- `sleep_score` - Overall sleep quality (0-100)

**Example Request:**
```javascript
// Get last 7 days of sleep data
const response = await fetch(
  'https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=2024-01-08&end_date=2024-01-15',
  { headers }
);
const sleepData = await response.json();
```

**Sample Response:**
```json
{
  "data": [{
    "day": "2024-01-14",
    "total_sleep_duration": 28800,  // 8 hours
    "rem_sleep_duration": 7200,      // 2 hours
    "deep_sleep_duration": 5400,     // 1.5 hours
    "sleep_score": 85
  }]
}
```

### 2. Activity Data

Tracks daily movement, calories, and exercise.

**Endpoint:** `/usercollection/daily_activity`

**Key Metrics:**
- `steps` - Total daily steps
- `active_calories` - Calories burned from activity
- `total_calories` - Total calories burned
- `activity_score` - Daily activity score (0-100)
- `met_minutes` - Metabolic equivalent minutes
- `movement_30_min` - 30-minute movement alerts met

**Example Request:**
```javascript
const activityData = await fetch(
  'https://api.ouraring.com/v2/usercollection/daily_activity?start_date=2024-01-14',
  { headers }
);
```

### 3. Readiness Score

Measures your body's recovery and preparedness for the day.

**Endpoint:** `/usercollection/daily_readiness`

**Key Metrics:**
- `score` - Overall readiness (0-100)
- `temperature_deviation` - Body temp variance from baseline
- `resting_heart_rate` - Lowest HR during sleep
- `hrv_balance` - Heart rate variability balance

**Example Request:**
```javascript
const readiness = await fetch(
  'https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=2024-01-14',
  { headers }
);
```

### 4. Heart Rate Data

Continuous heart rate measurements throughout the day.

**Endpoint:** `/usercollection/heartrate`

**Data Points:**
- `bpm` - Beats per minute
- `timestamp` - Exact time of measurement
- `source` - Measurement source (awake/rest/sleep)

**Example Request:**
```javascript
// Get heart rate for specific time period
const hrData = await fetch(
  'https://api.ouraring.com/v2/usercollection/heartrate?start_datetime=2024-01-14T00:00:00&end_datetime=2024-01-14T23:59:59',
  { headers }
);
```

### 5. Workout Data

Detailed information about tracked workouts and exercises.

**Endpoint:** `/usercollection/workout`

**Key Metrics:**
- `activity` - Type of workout
- `calories` - Calories burned
- `distance` - Distance covered (if applicable)
- `start_datetime` - Workout start time
- `end_datetime` - Workout end time

### 6. Sleep Periods

Individual sleep sessions including naps.

**Endpoint:** `/usercollection/sleep`

**Provides:**
- Multiple sleep periods per day
- Nap detection
- Sleep stage transitions
- Sleep efficiency metrics

**Example - Detecting Naps:**
```javascript
const sleepPeriods = await fetch(
  'https://api.ouraring.com/v2/usercollection/sleep?start_date=2024-01-14',
  { headers }
);

// Filter for naps (sleep periods < 3 hours during day)
const naps = sleepPeriods.data.filter(period => {
  const duration = period.total_sleep_duration;
  const hour = new Date(period.bedtime_start).getHours();
  return duration < 10800 && hour > 6 && hour < 20;
});
```

## Common Use Cases

### Calculate Average Sleep Duration

```javascript
async function getAverageSleep(days = 7) {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 86400000)
    .toISOString().split('T')[0];
  
  const response = await fetch(
    `https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${startDate}&end_date=${endDate}`,
    { headers }
  );
  
  const data = await response.json();
  const totalSleep = data.data.reduce(
    (sum, day) => sum + day.total_sleep_duration, 0
  );
  
  return totalSleep / data.data.length / 3600; // Hours
}
```

### Check If User Needs a Nap

```javascript
async function shouldTakeNap() {
  // Get last night's sleep
  const yesterday = new Date(Date.now() - 86400000)
    .toISOString().split('T')[0];
  
  const sleepResponse = await fetch(
    `https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${yesterday}`,
    { headers }
  );
  
  const sleepData = await sleepResponse.json();
  const lastNight = sleepData.data[0];
  
  // Check sleep duration and current time
  const sleepHours = lastNight.total_sleep_duration / 3600;
  const currentHour = new Date().getHours();
  
  return {
    needsNap: sleepHours < 6 && currentHour >= 14 && currentHour < 17,
    sleepHours,
    reason: sleepHours < 6 ? 'Insufficient sleep' : 'Adequate sleep'
  };
}
```

### Monitor Recovery Status

```javascript
async function getRecoveryStatus() {
  const today = new Date().toISOString().split('T')[0];
  
  const [readiness, sleep, activity] = await Promise.all([
    fetch(`https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${today}`, { headers }),
    fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${today}`, { headers }),
    fetch(`https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${today}`, { headers })
  ]);
  
  const data = {
    readiness: (await readiness.json()).data[0],
    sleep: (await sleep.json()).data[0],
    activity: (await activity.json()).data[0]
  };
  
  return {
    isRecovered: data.readiness.score > 70,
    readinessScore: data.readiness.score,
    sleepScore: data.sleep.sleep_score,
    activityScore: data.activity.activity_score
  };
}
```

## Rate Limiting

The Oura API has rate limits to prevent abuse:

- **Requests per minute:** 50
- **Daily request limit:** 5000

Handle rate limiting gracefully:

```javascript
async function fetchWithRetry(url, options, retries = 3) {
  try {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || 60;
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    
    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}
```

## Error Handling

Common error responses and how to handle them:

```javascript
async function safeOuraRequest(endpoint) {
  try {
    const response = await fetch(endpoint, { headers });
    
    if (!response.ok) {
      switch (response.status) {
        case 401:
          throw new Error('Invalid or expired API token');
        case 429:
          throw new Error('Rate limit exceeded');
        case 404:
          throw new Error('No data available for requested date');
        default:
          throw new Error(`API error: ${response.status}`);
      }
    }
    
    return await response.json();
  } catch (error) {
    console.error('Oura API error:', error);
    throw error;
  }
}
```

## Best Practices

1. **Cache responses** to minimize API calls
2. **Request only needed date ranges** to reduce data transfer
3. **Use batch requests** when fetching multiple data types
4. **Store tokens securely** in environment variables
5. **Implement exponential backoff** for retries
6. **Monitor rate limit headers** in responses

## Useful Date Ranges

```javascript
// Common date range helpers
const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
```

## Additional Resources

- [Official Oura API Documentation](https://cloud.ouraring.com/docs/)
- [API Authentication Guide](https://cloud.ouraring.com/docs/authentication)
- [Data Field Definitions](https://cloud.ouraring.com/docs/data-fields)