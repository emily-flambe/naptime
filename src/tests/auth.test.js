/**
 * Authentication Routes Tests
 * Testing OAuth flow and authentication endpoints
 */

const request = require('supertest');
const axios = require('axios');
const app = require('../index');
const ouraService = require('../services/oura');

// Mock dependencies
jest.mock('axios');
jest.mock('../services/oura');

const mockedAxios = axios;

describe('Authentication Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /auth/login', () => {
    it('should redirect to Oura OAuth authorization URL', async () => {
      const response = await request(app).get('/auth/login');
      
      expect(response.status).toBe(302);
      expect(response.headers.location).toMatch(/^https:\/\/cloud\.ouraring\.com\/oauth\/authorize/);
      
      // Verify URL contains required parameters
      const url = new URL(response.headers.location);
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('client_id')).toBeTruthy();
      expect(url.searchParams.get('redirect_uri')).toMatch(/\/auth\/callback$/);
      expect(url.searchParams.get('scope')).toBe('daily_sleep personal');
      expect(url.searchParams.get('state')).toBeTruthy();
    });

    it('should set OAuth state in session', async () => {
      const agent = request.agent(app);
      const response = await agent.get('/auth/login');
      
      expect(response.status).toBe(302);
      
      // Check that state was set by trying to access callback with the state
      const url = new URL(response.headers.location);
      const state = url.searchParams.get('state');
      expect(state).toBeTruthy();
    });
  });

  describe('GET /auth/callback', () => {
    it('should handle OAuth error responses', async () => {
      const response = await request(app)
        .get('/auth/callback')
        .query({
          error: 'access_denied',
          error_description: 'User denied authorization'
        });
      
      expect(response.status).toBe(302);
      expect(response.headers.location).toMatch(/error=oauth_denied/);
    });

    it('should handle invalid state parameter', async () => {
      const agent = request.agent(app);
      
      // First, start OAuth flow to set state
      await agent.get('/auth/login');
      
      const response = await agent
        .get('/auth/callback')
        .query({
          code: 'test_code',
          state: 'invalid_state'
        });
      
      expect(response.status).toBe(302);
      expect(response.headers.location).toMatch(/error=invalid_state/);
    });

    it('should handle missing authorization code', async () => {
      const agent = request.agent(app);
      
      // Start OAuth flow to set valid state
      const loginResponse = await agent.get('/auth/login');
      const loginUrl = new URL(loginResponse.headers.location);
      const validState = loginUrl.searchParams.get('state');
      
      const response = await agent
        .get('/auth/callback')
        .query({ state: validState });
      
      expect(response.status).toBe(302);
      expect(response.headers.location).toMatch(/error=no_code/);
    });

    it('should successfully exchange code for tokens', async () => {
      const agent = request.agent(app);
      
      // Mock token exchange response
      const mockTokenResponse = {
        data: {
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          expires_in: 3600
        }
      };
      mockedAxios.post.mockResolvedValue(mockTokenResponse);
      
      // Mock user info response
      const mockUserInfo = { id: 'user123', email: 'emily@example.com' };
      ouraService.getUserInfo.mockResolvedValue(mockUserInfo);

      // Start OAuth flow
      const loginResponse = await agent.get('/auth/login');
      const loginUrl = new URL(loginResponse.headers.location);
      const validState = loginUrl.searchParams.get('state');
      
      const response = await agent
        .get('/auth/callback')
        .query({
          code: 'test_authorization_code',
          state: validState
        });
      
      expect(response.status).toBe(302);
      expect(response.headers.location).toMatch(/auth=success/);
      
      // Verify token exchange was called
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.ouraring.com/oauth/token',
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      );
    });

    it('should handle token exchange errors', async () => {
      const agent = request.agent(app);
      
      // Mock token exchange error
      const tokenError = new Error('Token exchange failed');
      tokenError.response = {
        data: {
          error: 'invalid_grant',
          error_description: 'Invalid authorization code'
        }
      };
      mockedAxios.post.mockRejectedValue(tokenError);

      // Start OAuth flow
      const loginResponse = await agent.get('/auth/login');
      const loginUrl = new URL(loginResponse.headers.location);
      const validState = loginUrl.searchParams.get('state');
      
      const response = await agent
        .get('/auth/callback')
        .query({
          code: 'invalid_code',
          state: validState
        });
      
      expect(response.status).toBe(302);
      expect(response.headers.location).toMatch(/error=token_exchange/);
    });
  });

  describe('GET /auth/status', () => {
    it('should return unauthenticated status by default', async () => {
      const response = await request(app).get('/auth/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        authenticated: false,
        userId: null,
        tokenExpiry: null,
        hasRefreshToken: false,
        expiresInMinutes: null
      });
    });

    it('should return authenticated status for valid session', async () => {
      const agent = request.agent(app);
      const futureExpiry = Date.now() + 3600000; // 1 hour from now
      
      // Set up authenticated session using test helper
      await agent
        .post('/auth/test-session')
        .send({
          accessToken: 'mock_access_token',
          refreshToken: 'mock_refresh_token',
          tokenExpiry: futureExpiry,
          userId: 'user123'
        });

      const response = await agent.get('/auth/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        authenticated: true,
        userId: 'user123',
        tokenExpiry: futureExpiry,
        hasRefreshToken: true
      });
      expect(response.body.expiresInMinutes).toBeGreaterThan(0);
    });

    it('should return unauthenticated for expired tokens', async () => {
      const agent = request.agent(app);
      const pastExpiry = Date.now() - 3600000; // 1 hour ago
      
      await agent
        .post('/auth/test-session')
        .send({
          accessToken: 'expired_token',
          tokenExpiry: pastExpiry
        });

      const response = await agent.get('/auth/status');
      
      expect(response.status).toBe(200);
      expect(response.body.authenticated).toBe(false);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should require refresh token', async () => {
      const response = await request(app).post('/auth/refresh');
      
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'No refresh token available',
        authUrl: '/auth/login'
      });
    });

    it('should refresh tokens successfully', async () => {
      const agent = request.agent(app);
      
      // Mock successful token refresh
      const mockRefreshResponse = {
        data: {
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          expires_in: 3600
        }
      };
      mockedAxios.post.mockResolvedValue(mockRefreshResponse);

      // Set up session with refresh token
      await agent
        .post('/auth/test-session')
        .send({
          refreshToken: 'mock_refresh_token'
        });

      const response = await agent.post('/auth/refresh');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Token refreshed successfully',
        expiresIn: 3600
      });
      expect(response.body.tokenExpiry).toBeDefined();
    });

    it('should handle refresh token errors', async () => {
      const agent = request.agent(app);
      
      // Mock refresh error
      const refreshError = new Error('Refresh failed');
      refreshError.response = {
        data: {
          error: 'invalid_grant',
          error_description: 'Refresh token is invalid'
        }
      };
      mockedAxios.post.mockRejectedValue(refreshError);

      await agent
        .post('/auth/test-session')
        .send({
          refreshToken: 'invalid_refresh_token'
        });

      const response = await agent.post('/auth/refresh');
      
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Token refresh failed',
        authUrl: '/auth/login'
      });
    });
  });

  describe('POST /auth/logout', () => {
    it('should successfully logout authenticated user', async () => {
      const agent = request.agent(app);
      
      // Set up authenticated session
      await agent
        .post('/auth/test-session')
        .send({
          accessToken: 'mock_access_token',
          userId: 'user123'
        });

      const response = await agent.post('/auth/logout');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Logged out successfully',
        redirectUrl: '/'
      });
    });

    it('should handle logout when not authenticated', async () => {
      const response = await request(app).post('/auth/logout');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'No active session',
        redirectUrl: '/'
      });
    });
  });

  describe('GET /auth/logout', () => {
    it('should redirect after logout', async () => {
      const response = await request(app).get('/auth/logout');
      
      expect(response.status).toBe(302);
      expect(response.headers.location).toMatch(/message=.*Logged.*out/);
    });
  });
});

// Add test helper route for authentication tests
if (process.env.NODE_ENV === 'test') {
  app.post('/auth/test-session', (req, res) => {
    const { accessToken, tokenExpiry, userId, refreshToken } = req.body;
    
    if (accessToken) req.session.accessToken = accessToken;
    if (tokenExpiry) req.session.tokenExpiry = tokenExpiry;
    if (userId) req.session.userId = userId;
    if (refreshToken) req.session.refreshToken = refreshToken;
    
    res.json({ message: 'Test session set' });
  });
}