/**
 * API Routes
 * Main API endpoints for nap status and health checks
 */

const express = require('express');
const router = express.Router();
const ouraService = require('../services/oura');
const napCalculator = require('../services/nap-calculator');
const cache = require('../services/cache');

/**
 * Simple hello endpoint for frontend connectivity test
 */
router.get('/hello', (req, res) => {
  res.json({
    message: 'Hello from Emily Needs A Nap backend!',
    timestamp: new Date().toISOString(),
    backend: 'Node.js + Express',
    frontend: 'React + TypeScript + Vite'
  });
});

/**
 * Get nap status endpoint
 * Determines if Emily needs a nap based on sleep data and current time
 */
router.get('/nap-status', async (req, res) => {
  try {
    // Use hardcoded access token from environment
    const accessToken = process.env.OURA_API_TOKEN;
    
    if (!accessToken) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'Oura API token not configured'
      });
    }

    // Create cache key
    const cacheKey = 'emily_nap_status';
    
    // Check cache first (5 minute cache)
    const cachedStatus = cache.get(cacheKey);
    if (cachedStatus) {
      return res.json({
        ...cachedStatus,
        cached: true,
        cacheTime: cachedStatus.lastUpdated
      });
    }

    // Get sleep data from Oura API
    const sleepData = await ouraService.getYesterdaySleep(accessToken);
    
    // Calculate nap status
    const status = napCalculator.calculateNapStatus(sleepData);
    
    // Cache the result for 5 minutes
    cache.set(cacheKey, status, 300);

    // Return the status
    res.json(status);

  } catch (error) {
    console.error('API error:', error);

    // Handle different error types
    if (error.status === 401) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Oura API token is invalid or expired'
      });
    }

    if (error.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests to Oura API. Please try again later.',
        retryAfter: 60
      });
    }

    if (error.message.includes('Network')) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Unable to connect to Oura API. Please try again later.'
      });
    }

    // Generic error
    res.status(500).json({
      error: 'Failed to fetch nap status',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get detailed nap recommendations
 */
router.get('/nap-recommendations', async (req, res) => {
  try {
    const accessToken = process.env.OURA_API_TOKEN;
    
    if (!accessToken) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'Oura API token not configured'
      });
    }

    // Get sleep data
    const sleepData = await ouraService.getYesterdaySleep(accessToken);
    
    // Get detailed recommendations
    const recommendations = napCalculator.getDetailedRecommendations(sleepData);
    
    res.json(recommendations);

  } catch (error) {
    console.error('Recommendations API error:', error);
    res.status(500).json({
      error: 'Failed to fetch recommendations',
      message: error.message
    });
  }
});

/**
 * Get Emily's sleep history (last 7 days)
 */
router.get('/sleep-history', async (req, res) => {
  try {
    const accessToken = process.env.OURA_API_TOKEN;
    
    if (!accessToken) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'Oura API token not configured'
      });
    }

    // Calculate date range (last 7 days)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Yesterday
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6); // 7 days ago

    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    // Get sleep data range
    const sleepData = await ouraService.getSleepRange(
      accessToken, 
      startDateString, 
      endDateString
    );

    // Process data for frontend
    const processedHistory = sleepData.data.map(record => ({
      date: record.day,
      sleepHours: napCalculator.secondsToHours(record.total_sleep_duration),
      score: record.score,
      quality: napCalculator.getSleepQuality(record.score),
      deepSleep: record.contributors?.deep_sleep,
      efficiency: record.contributors?.efficiency,
      restfulness: record.contributors?.restfulness
    }));

    res.json({
      history: processedHistory,
      summary: {
        averageSleep: calculateAverageSleep(processedHistory),
        averageScore: calculateAverageScore(processedHistory),
        totalDays: processedHistory.length
      }
    });

  } catch (error) {
    console.error('Sleep history API error:', error);
    res.status(500).json({
      error: 'Failed to fetch sleep history',
      message: error.message
    });
  }
});


/**
 * Debug endpoint: Raw sleep data for past 3 days
 */
router.get('/debug/sleep', async (req, res) => {
  // Temporarily allow in all environments for debugging

  try {
    const accessToken = process.env.OURA_API_TOKEN;
    
    if (!accessToken) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'Oura API token not configured'
      });
    }

    // Get past 3 days of sleep data
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 3);

    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    // Get sleep data range
    const sleepData = await ouraService.getSleepRange(
      accessToken, 
      startDateString, 
      endDateString
    );

    // Also try getting yesterday's sleep specifically
    const yesterdayData = await ouraService.getYesterdaySleep(accessToken);

    res.json({
      dateRange: `${startDateString} to ${endDateString}`,
      rawData: sleepData,
      yesterdayData: yesterdayData,
      processedData: sleepData.data ? sleepData.data.map(record => ({
        date: record.day,
        sleepHours: napCalculator.secondsToHours(record.total_sleep_duration),
        totalSleepDurationSeconds: record.total_sleep_duration,
        score: record.score,
        quality: napCalculator.getSleepQuality(record.score)
      })) : null
    });

  } catch (error) {
    console.error('Debug sleep API error:', error);
    res.status(500).json({
      error: 'Failed to fetch debug sleep data',
      message: error.message,
      stack: error.stack
    });
  }
});

/**
 * Clear cache endpoint (for development/testing)
 */
router.post('/cache/clear', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Not available in production' });
  }
  
  cache.flush();
  res.json({ message: 'Cache cleared successfully' });
});

// Helper functions

/**
 * Calculate average sleep hours from history
 */
function calculateAverageSleep(history) {
  if (!history.length) return 0;
  const total = history.reduce((sum, record) => sum + parseFloat(record.sleepHours), 0);
  return (total / history.length).toFixed(1);
}

/**
 * Calculate average sleep score from history
 */
function calculateAverageScore(history) {
  if (!history.length) return 0;
  const total = history.reduce((sum, record) => sum + (record.score || 0), 0);
  return Math.round(total / history.length);
}

module.exports = router;