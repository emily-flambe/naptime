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
    // Set a default API token for tests
    process.env.OURA_API_TOKEN = 'test_api_token';
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.OURA_API_TOKEN;
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
    it('should return error when OURA_API_TOKEN is not configured', async () => {
      // Temporarily clear the token
      delete process.env.OURA_API_TOKEN;
      
      const response = await request(app).get('/api/nap-status');
      
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Configuration error',
        message: 'Oura API token not configured'
      });
    });

    it('should return nap status when API token is configured', async () => {
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

      const response = await request(app).get('/api/nap-status');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockNapStatus);
      expect(ouraService.getYesterdaySleep).toHaveBeenCalledWith('test_api_token');
      expect(napCalculator.calculateNapStatus).toHaveBeenCalledWith(mockSleepData);
    });

    it('should return cached results when available', async () => {
      const mockCachedStatus = {
        needsNap: false,
        sleepHours: '7.2',
        message: "Nah, She's Fine",
        lastUpdated: '2024-01-15T20:00:00.000Z'
      };
      
      cache.get.mockReturnValue(mockCachedStatus);

      const response = await request(app).get('/api/nap-status');
      
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
      // Mock API error
      const apiError = new Error('Oura API Error');
      apiError.status = 401;
      ouraService.getYesterdaySleep.mockRejectedValue(apiError);

      const response = await request(app).get('/api/nap-status');
      
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Authentication failed',
        message: 'Oura API token is invalid or expired'
      });
    });

    it('should handle rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.status = 429;
      ouraService.getYesterdaySleep.mockRejectedValue(rateLimitError);

      const response = await request(app).get('/api/nap-status');
      
      expect(response.status).toBe(429);
      expect(response.body).toMatchObject({
        error: 'Rate limit exceeded',
        retryAfter: 60
      });
    });
  });

  describe('GET /api/nap-recommendations', () => {
    it('should return error when OURA_API_TOKEN is not configured', async () => {
      // Temporarily clear the token
      delete process.env.OURA_API_TOKEN;
      
      const response = await request(app).get('/api/nap-recommendations');
      
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Configuration error',
        message: 'Oura API token not configured'
      });
    });

    it('should return detailed recommendations when API token is configured', async () => {
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

      const response = await request(app).get('/api/nap-recommendations');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRecommendations);
      expect(napCalculator.getDetailedRecommendations).toHaveBeenCalledWith(mockSleepData);
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
      // Mock an unexpected error
      ouraService.getYesterdaySleep.mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app).get('/api/nap-status');
      
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Failed to fetch nap status',
        message: 'An unexpected error occurred'
      });
    });
  });
});