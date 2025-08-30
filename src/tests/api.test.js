/**
 * API Routes Tests
 * Testing Express endpoints with supertest
 */

const request = require('supertest');
const app = require('../index');
const ouraService = require('../services/oura');
const napCalculator = require('../services/nap-calculator');
const cache = require('../services/cache');

// Mock dependencies
jest.mock('../services/oura');
jest.mock('../services/nap-calculator');
jest.mock('../services/cache');

describe('API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear cache before each test
    cache.flush.mockClear();
    cache.get.mockReturnValue(undefined); // Default: no cache hit
    cache.set.mockReturnValue(true);
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        environment: 'test'
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/nap-status', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/nap-status');
      
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Not authenticated',
        message: 'Please connect your Oura Ring first',
        authUrl: '/auth/login',
        needsAuth: true
      });
    });

    it('should return nap status for authenticated user', async () => {
      // Mock authenticated session
      const agent = request.agent(app);
      
      // Mock Oura service response
      const mockSleepData = {
        data: [{
          total_sleep_duration: 19800, // 5.5 hours
          score: 75,
          contributors: {
            deep_sleep: 80,
            efficiency: 85,
            restfulness: 70
          }
        }]
      };
      ouraService.getYesterdaySleep.mockResolvedValue(mockSleepData);

      // Mock nap calculator response
      const mockNapStatus = {
        needsNap: true,
        sleepHours: '5.5',
        sleepScore: 75,
        isNapTime: true,
        currentTime: '3:00 PM',
        lastUpdated: '2024-01-15T21:00:00.000Z',
        message: 'YES, EMILY NEEDS A NAP',
        details: {
          deepSleep: 80,
          efficiency: 85,
          restfulness: 70
        }
      };
      napCalculator.calculateNapStatus.mockReturnValue(mockNapStatus);

      // Set up session with authentication
      await agent
        .post('/auth/test-session')
        .send({
          accessToken: 'mock_access_token',
          tokenExpiry: Date.now() + 3600000,
          userId: 'test_user'
        });

      const response = await agent.get('/api/nap-status');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockNapStatus);
      expect(ouraService.getYesterdaySleep).toHaveBeenCalledWith('mock_access_token');
      expect(napCalculator.calculateNapStatus).toHaveBeenCalledWith(mockSleepData);
    });

    it('should return cached results when available', async () => {
      const agent = request.agent(app);
      
      const mockCachedStatus = {
        needsNap: false,
        sleepHours: '7.2',
        message: "Nah, She's Fine",
        lastUpdated: '2024-01-15T20:00:00.000Z'
      };
      
      cache.get.mockReturnValue(mockCachedStatus);

      // Set up authenticated session
      await agent
        .post('/auth/test-session')
        .send({
          accessToken: 'mock_access_token',
          tokenExpiry: Date.now() + 3600000
        });

      const response = await agent.get('/api/nap-status');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ...mockCachedStatus,
        cached: true,
        cacheTime: mockCachedStatus.lastUpdated
      });
      
      // Should not call external services when cached
      expect(ouraService.getYesterdaySleep).not.toHaveBeenCalled();
      expect(napCalculator.calculateNapStatus).not.toHaveBeenCalled();
    });

    it('should handle Oura API errors gracefully', async () => {
      const agent = request.agent(app);
      
      // Mock API error
      const apiError = new Error('Oura API Error');
      apiError.status = 401;
      ouraService.getYesterdaySleep.mockRejectedValue(apiError);

      await agent
        .post('/auth/test-session')
        .send({
          accessToken: 'invalid_token',
          tokenExpiry: Date.now() + 3600000
        });

      const response = await agent.get('/api/nap-status');
      
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Authentication failed',
        needsAuth: true
      });
    });

    it('should handle rate limiting', async () => {
      const agent = request.agent(app);
      
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.status = 429;
      ouraService.getYesterdaySleep.mockRejectedValue(rateLimitError);

      await agent
        .post('/auth/test-session')
        .send({
          accessToken: 'mock_access_token',
          tokenExpiry: Date.now() + 3600000
        });

      const response = await agent.get('/api/nap-status');
      
      expect(response.status).toBe(429);
      expect(response.body).toMatchObject({
        error: 'Rate limit exceeded',
        retryAfter: 60
      });
    });
  });

  describe('GET /api/nap-recommendations', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/nap-recommendations');
      
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Not authenticated',
        needsAuth: true
      });
    });

    it('should return detailed recommendations for authenticated user', async () => {
      const agent = request.agent(app);
      
      const mockSleepData = {
        data: [{ total_sleep_duration: 18000, score: 70 }]
      };
      const mockRecommendations = {
        needsNap: true,
        recommendations: ['Take a 20-30 minute nap now'],
        timeInfo: { hour: 15, isNapTime: true },
        sleepQuality: 'Good'
      };
      
      ouraService.getYesterdaySleep.mockResolvedValue(mockSleepData);
      napCalculator.getDetailedRecommendations.mockReturnValue(mockRecommendations);

      await agent
        .post('/auth/test-session')
        .send({
          accessToken: 'mock_access_token',
          tokenExpiry: Date.now() + 3600000
        });

      const response = await agent.get('/api/nap-recommendations');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRecommendations);
      expect(napCalculator.getDetailedRecommendations).toHaveBeenCalledWith(mockSleepData);
    });
  });

  describe('GET /api/user', () => {
    it('should return unauthenticated status when not logged in', async () => {
      const response = await request(app).get('/api/user');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        authenticated: false,
        authUrl: '/auth/login'
      });
    });

    it('should return user info for authenticated user', async () => {
      const agent = request.agent(app);
      
      const mockUserInfo = {
        id: 'user123',
        email: 'emily@example.com'
      };
      
      ouraService.getUserInfo.mockResolvedValue(mockUserInfo);

      await agent
        .post('/auth/test-session')
        .send({
          accessToken: 'mock_access_token',
          tokenExpiry: Date.now() + 3600000
        });

      const response = await agent.get('/api/user');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        authenticated: true,
        user: {
          id: 'user123',
          email: 'emily@example.com'
        }
      });
    });
  });

  describe('POST /api/cache/clear', () => {
    it('should clear cache in development mode', async () => {
      // Set NODE_ENV to development for this test
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request(app).post('/api/cache/clear');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Cache cleared successfully'
      });
      expect(cache.flush).toHaveBeenCalled();

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });

    it('should not be available in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app).post('/api/cache/clear');
      
      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: 'Not available in production'
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app).get('/api/nonexistent');
      
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'Not found'
      });
    });

    it('should handle server errors gracefully', async () => {
      const agent = request.agent(app);
      
      // Mock an unexpected error
      ouraService.getYesterdaySleep.mockRejectedValue(new Error('Unexpected error'));

      await agent
        .post('/auth/test-session')
        .send({
          accessToken: 'mock_access_token',
          tokenExpiry: Date.now() + 3600000
        });

      const response = await agent.get('/api/nap-status');
      
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Failed to fetch nap status',
        message: 'An unexpected error occurred'
      });
    });
  });
});

// Helper route for testing (only available in test environment)
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