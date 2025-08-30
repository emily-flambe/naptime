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
    // Check if user is authenticated
    if (!req.session.accessToken) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'Please connect your Oura Ring first',
        authUrl: '/auth/login',
        needsAuth: true
      });
    }

    // Create cache key
    const cacheKey = `nap_status_${req.session.userId || 'default'}`;
    
    // Check cache first (5 minute cache)
    const cachedStatus = cache.get(cacheKey);
    if (cachedStatus) {
      return res.json({
        ...cachedStatus,
        cached: true,
        cacheTime: cachedStatus.lastUpdated
      });
    }

    // Check if token needs refresh (refresh if expires within 1 minute)
    if (req.session.tokenExpiry && Date.now() > req.session.tokenExpiry - 60000) {
      try {
        await refreshAccessToken(req);
      } catch (refreshError) {
        return res.status(401).json({
          error: 'Authentication expired',
          message: 'Please reconnect your Oura Ring',
          authUrl: '/auth/login',
          needsAuth: true
        });
      }
    }

    // Get sleep data from Oura API
    const sleepData = await ouraService.getYesterdaySleep(req.session.accessToken);
    
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
      // Token expired or invalid
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Please reconnect your Oura Ring',
        authUrl: '/auth/login',
        needsAuth: true
      });
    }

    if (error.status === 429) {
      // Rate limit exceeded
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests to Oura API. Please try again later.',
        retryAfter: 60
      });
    }

    if (error.message.includes('Network')) {
      // Network error
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
    if (!req.session.accessToken) {
      return res.status(401).json({
        error: 'Not authenticated',
        authUrl: '/auth/login',
        needsAuth: true
      });
    }

    // Get sleep data
    const sleepData = await ouraService.getYesterdaySleep(req.session.accessToken);
    
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
 * Get user's sleep history (last 7 days)
 */
router.get('/sleep-history', async (req, res) => {
  try {
    if (!req.session.accessToken) {
      return res.status(401).json({
        error: 'Not authenticated',
        authUrl: '/auth/login',
        needsAuth: true
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
      req.session.accessToken, 
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
 * Get current user info and authentication status
 */
router.get('/user', async (req, res) => {
  try {
    if (!req.session.accessToken) {
      return res.json({
        authenticated: false,
        authUrl: '/auth/login'
      });
    }

    // Try to get user info to validate token
    const userInfo = await ouraService.getUserInfo(req.session.accessToken);
    
    res.json({
      authenticated: true,
      user: {
        id: userInfo.id || 'unknown',
        email: userInfo.email || null
      },
      tokenExpiry: req.session.tokenExpiry,
      currentTime: new Date().toISOString()
    });

  } catch (error) {
    console.error('User API error:', error);
    
    if (error.status === 401) {
      return res.json({
        authenticated: false,
        authUrl: '/auth/login',
        error: 'Token expired'
      });
    }

    res.status(500).json({
      error: 'Failed to fetch user info',
      message: error.message
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
 * Refresh OAuth access token
 */
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

  // Update session with new tokens
  req.session.accessToken = response.data.access_token;
  req.session.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

  if (response.data.refresh_token) {
    req.session.refreshToken = response.data.refresh_token;
  }
}

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