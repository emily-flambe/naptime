/**
 * Oura Service Tests
 * Testing Oura API integration with TDD approach
 */

const axios = require('axios');
const OuraService = require('../services/oura');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('OuraService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getYesterdaySleep', () => {
    it('should fetch sleep data for yesterday', async () => {
      // Arrange
      const mockAccessToken = 'mock_access_token';
      const mockSleepData = {
        data: [{
          id: 'sleep_123',
          day: '2024-01-15',
          score: 85,
          total_sleep_duration: 27900, // 7.75 hours
          contributors: {
            deep_sleep: 95,
            efficiency: 90,
            latency: 88,
            rem_sleep: 70,
            restfulness: 54,
            timing: 94,
            total_sleep: 88
          }
        }],
        next_token: null
      };

      mockedAxios.get.mockResolvedValue({ data: mockSleepData });

      // Act
      const result = await OuraService.getYesterdaySleep(mockAccessToken);

      // Assert
      expect(result).toEqual(mockSleepData);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      
      // Verify API call parameters
      const [url, config] = mockedAxios.get.mock.calls[0];
      expect(url).toBe('https://api.ouraring.com/v2/usercollection/sleep');
      expect(config.headers.Authorization).toBe(`Bearer ${mockAccessToken}`);
      expect(config.params.start_date).toBeDefined();
      expect(config.params.end_date).toBeDefined();
    });

    it('should use yesterday\'s date in the API call', async () => {
      // Arrange
      const mockAccessToken = 'mock_token';

      // Calculate dates using Mountain Time like the actual service does
      const now = new Date();
      const todayMT = now.toLocaleDateString("en-US", {
        timeZone: "America/Denver",
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const [month, day, year] = todayMT.split('/');
      const todayDateString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      const todayMTDate = new Date(`${todayDateString}T00:00:00`);
      const yesterdayMT = new Date(todayMTDate);
      yesterdayMT.setDate(yesterdayMT.getDate() - 1);
      const tomorrowMT = new Date(todayMTDate);
      tomorrowMT.setDate(tomorrowMT.getDate() + 1);

      const expectedStartDate = yesterdayMT.toISOString().split('T')[0];
      const expectedEndDate = tomorrowMT.toISOString().split('T')[0];

      mockedAxios.get.mockResolvedValue({ data: { data: [] } });

      // Act
      await OuraService.getYesterdaySleep(mockAccessToken);

      // Assert
      const [, config] = mockedAxios.get.mock.calls[0];
      expect(config.params.start_date).toBe(expectedStartDate);
      expect(config.params.end_date).toBe(expectedEndDate);
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const mockAccessToken = 'invalid_token';
      const apiError = new Error('API Error');
      apiError.response = { status: 401, data: { error: 'Unauthorized' } };
      
      mockedAxios.get.mockRejectedValue(apiError);

      // Act & Assert
      await expect(OuraService.getYesterdaySleep(mockAccessToken))
        .rejects.toThrow('API Error');
    });

    it('should handle empty sleep data', async () => {
      // Arrange
      const mockAccessToken = 'mock_token';
      const emptySleepData = { data: [], next_token: null };
      
      mockedAxios.get.mockResolvedValue({ data: emptySleepData });

      // Act
      const result = await OuraService.getYesterdaySleep(mockAccessToken);

      // Assert
      expect(result).toEqual(emptySleepData);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('getUserInfo', () => {
    it('should fetch user personal information', async () => {
      // Arrange
      const mockAccessToken = 'mock_access_token';
      const mockUserInfo = {
        id: 'user_123',
        email: 'emily@example.com',
        date_of_birth: '1990-01-01'
      };

      mockedAxios.get.mockResolvedValue({ data: mockUserInfo });

      // Act
      const result = await OuraService.getUserInfo(mockAccessToken);

      // Assert
      expect(result).toEqual(mockUserInfo);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.ouraring.com/v2/usercollection/personal_info',
        {
          headers: {
            'Authorization': `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    });
  });

  describe('getReadiness', () => {
    it('should fetch readiness data for specified date', async () => {
      // Arrange
      const mockAccessToken = 'mock_access_token';
      const testDate = '2024-01-15';
      const mockReadinessData = {
        data: [{
          id: 'readiness_123',
          day: testDate,
          score: 78,
          contributors: {
            activity_balance: 85,
            body_temperature: 90,
            hrv_balance: 70
          }
        }],
        next_token: null
      };

      mockedAxios.get.mockResolvedValue({ data: mockReadinessData });

      // Act
      const result = await OuraService.getReadiness(mockAccessToken, testDate);

      // Assert
      expect(result).toEqual(mockReadinessData);
      
      const [url, config] = mockedAxios.get.mock.calls[0];
      expect(url).toBe('https://api.ouraring.com/v2/usercollection/daily_readiness');
      expect(config.params.start_date).toBe(testDate);
      expect(config.params.end_date).toBe(testDate);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle network timeout', async () => {
      // Arrange
      const mockAccessToken = 'mock_token';
      const timeoutError = new Error('Network timeout');
      timeoutError.code = 'ECONNABORTED';
      
      mockedAxios.get.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(OuraService.getYesterdaySleep(mockAccessToken))
        .rejects.toThrow('Network timeout');
    });

    it('should handle malformed response data', async () => {
      // Arrange
      const mockAccessToken = 'mock_token';
      
      // Mock a response with missing data property
      mockedAxios.get.mockResolvedValue({ data: { invalid: 'structure' } });

      // Act
      const result = await OuraService.getYesterdaySleep(mockAccessToken);

      // Assert
      expect(result).toEqual({ invalid: 'structure' });
    });

    it('should handle 429 rate limit error', async () => {
      // Arrange
      const mockAccessToken = 'mock_token';
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.response = { 
        status: 429, 
        statusText: 'Too Many Requests',
        data: { error: 'Too Many Requests' },
        headers: { 'retry-after': '60' }
      };
      
      mockedAxios.get.mockRejectedValue(rateLimitError);

      // Act & Assert
      await expect(OuraService.getYesterdaySleep(mockAccessToken))
        .rejects.toThrow('Oura API Error: 429 Too Many Requests');
    });
  });
});