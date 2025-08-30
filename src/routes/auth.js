/**
 * Authentication Routes
 * OAuth 2.0 flow with Oura Ring API
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();

const OURA_AUTH_URL = 'https://cloud.ouraring.com/oauth/authorize';
const OURA_TOKEN_URL = 'https://api.ouraring.com/oauth/token';

/**
 * Start OAuth flow - redirect to Oura authorization
 */
router.get('/login', (req, res) => {
  // Generate random state for security
  const state = Math.random().toString(36).substring(7);
  req.session.oauthState = state;

  // Build authorization URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: req.app.locals.ouraClientId,
    redirect_uri: getRedirectUri(req),
    scope: 'daily_sleep personal',
    state: state
  });

  const authUrl = `${OURA_AUTH_URL}?${params}`;
  
  console.log('Starting OAuth flow:', {
    clientId: req.app.locals.ouraClientId?.substring(0, 8) + '...',
    redirectUri: getRedirectUri(req),
    state: state
  });

  res.redirect(authUrl);
});

/**
 * OAuth callback - handle authorization code
 */
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error);
    return res.redirect('/?error=oauth_denied&message=' + encodeURIComponent('Authorization was denied'));
  }

  // Verify state parameter
  if (state !== req.session.oauthState) {
    console.error('Invalid state parameter:', { expected: req.session.oauthState, received: state });
    return res.redirect('/?error=invalid_state&message=' + encodeURIComponent('Invalid security state'));
  }

  if (!code) {
    console.error('No authorization code received');
    return res.redirect('/?error=no_code&message=' + encodeURIComponent('No authorization code received'));
  }

  try {
    console.log('Exchanging authorization code for tokens...');
    
    // Exchange authorization code for access token
    const tokenResponse = await axios.post(OURA_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: req.app.locals.ouraClientId,
        client_secret: req.app.locals.ouraClientSecret,
        redirect_uri: getRedirectUri(req)
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Store tokens in session
    req.session.accessToken = access_token;
    req.session.refreshToken = refresh_token;
    req.session.tokenExpiry = Date.now() + (expires_in * 1000);

    // Clear OAuth state
    delete req.session.oauthState;

    console.log('OAuth success - tokens obtained');

    // Try to get user info to validate token and store user ID
    try {
      const ouraService = require('../services/oura');
      const userInfo = await ouraService.getUserInfo(access_token);
      req.session.userId = userInfo.id;
      console.log('User info obtained:', { id: userInfo.id });
    } catch (userInfoError) {
      console.warn('Could not fetch user info:', userInfoError.message);
      // Continue anyway - we have the tokens
    }

    // Redirect to success page
    res.redirect('/?auth=success&message=' + encodeURIComponent('Successfully connected to Oura Ring!'));

  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    
    const errorMessage = error.response?.data?.error_description || 
                        error.response?.data?.error || 
                        'Failed to connect to Oura Ring';

    res.redirect('/?error=token_exchange&message=' + encodeURIComponent(errorMessage));
  }
});

/**
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
  if (!req.session.refreshToken) {
    return res.status(401).json({
      error: 'No refresh token available',
      authUrl: '/auth/login'
    });
  }

  try {
    console.log('Refreshing access token...');

    const response = await axios.post(OURA_TOKEN_URL,
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

    const { access_token, refresh_token, expires_in } = response.data;

    // Update session with new tokens
    req.session.accessToken = access_token;
    req.session.tokenExpiry = Date.now() + (expires_in * 1000);

    // Update refresh token if provided
    if (refresh_token) {
      req.session.refreshToken = refresh_token;
    }

    console.log('Token refreshed successfully');

    res.json({
      message: 'Token refreshed successfully',
      expiresIn: expires_in,
      tokenExpiry: req.session.tokenExpiry
    });

  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    
    // Clear invalid tokens
    delete req.session.accessToken;
    delete req.session.refreshToken;
    delete req.session.tokenExpiry;
    delete req.session.userId;

    res.status(401).json({
      error: 'Token refresh failed',
      message: 'Please reconnect your Oura Ring',
      authUrl: '/auth/login'
    });
  }
});

/**
 * Check authentication status
 */
router.get('/status', (req, res) => {
  const isAuthenticated = !!(req.session.accessToken && req.session.tokenExpiry && Date.now() < req.session.tokenExpiry);
  
  res.json({
    authenticated: isAuthenticated,
    userId: req.session.userId || null,
    tokenExpiry: req.session.tokenExpiry || null,
    hasRefreshToken: !!req.session.refreshToken,
    expiresInMinutes: req.session.tokenExpiry ? 
      Math.round((req.session.tokenExpiry - Date.now()) / 60000) : null
  });
});

/**
 * Logout - clear session
 */
router.post('/logout', (req, res) => {
  const wasAuthenticated = !!req.session.accessToken;
  
  // Clear all session data
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }

    console.log('User logged out');
    res.json({ 
      message: wasAuthenticated ? 'Logged out successfully' : 'No active session',
      redirectUrl: '/'
    });
  });
});

/**
 * Get logout URL (for GET requests)
 */
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
    }
    res.redirect('/?message=' + encodeURIComponent('Logged out successfully'));
  });
});

// Helper functions

/**
 * Get the correct redirect URI based on environment
 */
function getRedirectUri(req) {
  // Use BASE_URL from environment if set (for production)
  if (process.env.BASE_URL) {
    return `${process.env.BASE_URL}/auth/callback`;
  }
  
  // For development, construct from request
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:8080';
  
  return `${protocol}://${host}/auth/callback`;
}

/**
 * Middleware to require authentication
 */
function requireAuth(req, res, next) {
  if (!req.session.accessToken) {
    return res.status(401).json({
      error: 'Authentication required',
      authUrl: '/auth/login'
    });
  }

  // Check if token is expired
  if (req.session.tokenExpiry && Date.now() > req.session.tokenExpiry) {
    return res.status(401).json({
      error: 'Token expired',
      authUrl: '/auth/login',
      refreshUrl: '/auth/refresh'
    });
  }

  next();
}

// Export middleware for use in other routes
router.requireAuth = requireAuth;

module.exports = router;