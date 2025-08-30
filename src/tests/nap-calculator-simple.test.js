/**
 * Simplified Nap Calculator Tests
 * Testing core nap logic without complex date mocking
 */

const NapCalculator = require('../services/nap-calculator');

describe('NapCalculator - Basic Tests', () => {
  describe('calculateNapStatus', () => {
    it('should handle empty sleep data gracefully', () => {
      const result = NapCalculator.calculateNapStatus({ data: [] });
      
      expect(result.sleepHours).toBe('0.0');
      expect(result.sleepScore).toBe(null);
      expect(result.needsNap).toBe(false); // No sleep data means no nap needed
      expect(result.message).toBeDefined();
      expect(result.currentTime).toBeDefined();
      expect(result.lastUpdated).toBeDefined();
      expect(result.details).toBeDefined();
    });

    it('should handle null sleep data', () => {
      const result = NapCalculator.calculateNapStatus(null);
      
      expect(result.sleepHours).toBe('0.0');
      expect(result.sleepScore).toBe(null);
      expect(result.needsNap).toBe(false);
    });

    it('should calculate sleep hours correctly', () => {
      const mockSleepData = {
        data: [{
          total_sleep_duration: 21600, // 6 hours in seconds
          score: 85,
          contributors: {
            deep_sleep: 90,
            efficiency: 85,
            restfulness: 80
          }
        }]
      };

      const result = NapCalculator.calculateNapStatus(mockSleepData);
      
      expect(result.sleepHours).toBe('6.0');
      expect(result.sleepScore).toBe(85);
      expect(result.details.deepSleep).toBe(90);
      expect(result.details.efficiency).toBe(85);
      expect(result.details.restfulness).toBe(80);
    });

    it('should include all required fields in response', () => {
      const mockSleepData = {
        data: [{
          total_sleep_duration: 18000, // 5 hours
          score: 75,
          contributors: {
            deep_sleep: 80,
            efficiency: 90,
            restfulness: 70
          }
        }]
      };

      const result = NapCalculator.calculateNapStatus(mockSleepData);
      
      // Check all required fields
      expect(result).toHaveProperty('needsNap');
      expect(result).toHaveProperty('sleepHours');
      expect(result).toHaveProperty('sleepScore');
      expect(result).toHaveProperty('isNapTime');
      expect(result).toHaveProperty('currentTime');
      expect(result).toHaveProperty('lastUpdated');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('details');
      
      expect(typeof result.needsNap).toBe('boolean');
      expect(typeof result.sleepHours).toBe('string');
      expect(typeof result.isNapTime).toBe('boolean');
      expect(typeof result.currentTime).toBe('string');
      expect(typeof result.lastUpdated).toBe('string');
      expect(typeof result.message).toBe('string');
      expect(typeof result.details).toBe('object');
    });
  });

  describe('Helper methods', () => {
    it('should convert seconds to hours correctly', () => {
      expect(NapCalculator.secondsToHours(3600)).toBe('1.0'); // 1 hour
      expect(NapCalculator.secondsToHours(7200)).toBe('2.0'); // 2 hours
      expect(NapCalculator.secondsToHours(5400)).toBe('1.5'); // 1.5 hours
      expect(NapCalculator.secondsToHours(27900)).toBe('7.8'); // 7.75 hours
    });

    it('should assess sleep quality correctly', () => {
      expect(NapCalculator.getSleepQuality(95)).toBe('Excellent');
      expect(NapCalculator.getSleepQuality(85)).toBe('Excellent');
      expect(NapCalculator.getSleepQuality(75)).toBe('Good');
      expect(NapCalculator.getSleepQuality(70)).toBe('Good');
      expect(NapCalculator.getSleepQuality(60)).toBe('Fair');
      expect(NapCalculator.getSleepQuality(55)).toBe('Fair');
      expect(NapCalculator.getSleepQuality(45)).toBe('Poor');
      expect(NapCalculator.getSleepQuality(null)).toBe('Unknown');
      expect(NapCalculator.getSleepQuality(undefined)).toBe('Unknown');
    });

    it('should provide current nap time status', () => {
      const isNapTime = NapCalculator.isCurrentlyNapTime();
      expect(typeof isNapTime).toBe('boolean');
    });

    it('should provide Mountain Time info', () => {
      const timeInfo = NapCalculator.getMountainTimeInfo();
      
      expect(timeInfo).toHaveProperty('hour');
      expect(timeInfo).toHaveProperty('minute');
      expect(timeInfo).toHaveProperty('formatted');
      expect(timeInfo).toHaveProperty('fullFormatted');
      expect(timeInfo).toHaveProperty('isNapTime');
      
      expect(typeof timeInfo.hour).toBe('number');
      expect(typeof timeInfo.minute).toBe('number');
      expect(typeof timeInfo.formatted).toBe('string');
      expect(typeof timeInfo.fullFormatted).toBe('string');
      expect(typeof timeInfo.isNapTime).toBe('boolean');
      
      expect(timeInfo.hour).toBeGreaterThanOrEqual(0);
      expect(timeInfo.hour).toBeLessThanOrEqual(23);
      expect(timeInfo.minute).toBeGreaterThanOrEqual(0);
      expect(timeInfo.minute).toBeLessThanOrEqual(59);
    });

    it('should provide detailed recommendations', () => {
      const mockSleepData = {
        data: [{
          total_sleep_duration: 18000, // 5 hours
          score: 75
        }]
      };

      const result = NapCalculator.getDetailedRecommendations(mockSleepData);
      
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('timeInfo');
      expect(result).toHaveProperty('sleepQuality');
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.sleepQuality).toBe('Good');
    });
  });
});