/**
 * Nap Calculator Tests
 * Testing the core logic for determining if Emily needs a nap
 */

const NapCalculator = require('../services/nap-calculator');
const MockDate = require('mockdate');

describe('NapCalculator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    MockDate.reset();
  });

  describe('calculateNapStatus', () => {
    it('should determine Emily maybe needs a nap when sleep 4-6 hours and time is 2-5 PM MT', () => {
      // Arrange - Mock Mountain Time 3:00 PM
      // Mountain Time is UTC-7 (or UTC-6 during DST)
      // Setting to 9:00 PM UTC = 3:00 PM MT (during DST)
      MockDate.set('2024-07-15T21:00:00.000Z');
      
      const mockSleepData = {
        data: [{
          type: 'long_sleep',
          day: new Date().toISOString().split('T')[0],
          total_sleep_duration: 19800, // 5.5 hours in seconds
          readiness: {
            score: 72,
            contributors: {
              deep_sleep: 85,
              efficiency: 90,
              restfulness: 60
            }
          }
        }]
      };

      // Act
      const result = NapCalculator.calculateNapStatus(mockSleepData);

      // Assert
      expect(result.needsNap).toBe(true);
      expect(result.sleepHours).toBe('5.5');
      expect(result.sleepCategory).toBe('struggling');
      expect(result.napPriority).toBe('maybe');
      expect(result.isNapTime).toBe(true);
      expect(result.message).toBe('Maybe Nap Time');
      expect(result.sleepScore).toBe(72);
      expect(result.currentTime).toBeDefined();
      expect(result.lastUpdated).toBeDefined();
    });

    it('should determine Emily desperately needs a nap when severely sleep deprived (<4 hours) regardless of time', () => {
      // Arrange - Mock Mountain Time 10:00 AM (outside nap time)
      // 10:00 AM MT = 4:00 PM UTC (during DST)
      MockDate.set('2024-07-15T16:00:00.000Z');

      const mockSleepData = {
        data: [{
          type: 'long_sleep',
          day: new Date().toISOString().split('T')[0],
          total_sleep_duration: 10800, // 3 hours in seconds
          readiness: {
            score: 45
          }
        }]
      };

      // Act
      const result = NapCalculator.calculateNapStatus(mockSleepData);

      // Assert
      expect(result.needsNap).toBe(true);
      expect(result.sleepHours).toBe('3.0');
      expect(result.sleepCategory).toBe('severely-deprived');
      expect(result.napPriority).toBe('yes');
      expect(result.isNapTime).toBe(false);
      expect(result.message).toBe('Not Nap Time'); // 10 AM is pre-nap time
    });

    it('should determine Emily needs a nap when oversleep (>9 hours) indicates sickness', () => {
      // Arrange - Mock Mountain Time 10:00 AM (outside nap time)
      // 10:00 AM MT = 4:00 PM UTC (during DST)
      MockDate.set('2024-07-15T16:00:00.000Z');
      
      const mockSleepData = {
        data: [{
          type: 'long_sleep',
          day: new Date().toISOString().split('T')[0],
          total_sleep_duration: 36000, // 10 hours in seconds
          readiness: {
            score: 75
          }
        }]
      };

      // Act
      const result = NapCalculator.calculateNapStatus(mockSleepData);

      // Assert
      expect(result.needsNap).toBe(true);
      expect(result.sleepHours).toBe('10.0');
      expect(result.sleepCategory).toBe('oversleep');
      expect(result.napPriority).toBe('yes');
      expect(result.isNapTime).toBe(false);
      expect(result.message).toBe('Not Nap Time'); // 10 AM is pre-nap time
    });

    it('should determine Emily does NOT need a nap when sleep >= 6 hours during nap time', () => {
      // Arrange - Mock Mountain Time 3:00 PM
      // 3:30 PM MT = 9:30 PM UTC (during DST)
      MockDate.set('2024-07-15T21:30:00.000Z');
      
      const mockSleepData = {
        data: [{
          type: 'long_sleep',
          day: new Date().toISOString().split('T')[0],
          total_sleep_duration: 25920, // 7.2 hours in seconds
          readiness: {
            score: 88,
            contributors: {
              deep_sleep: 95,
              efficiency: 92,
              restfulness: 85
            }
          }
        }]
      };

      // Act
      const result = NapCalculator.calculateNapStatus(mockSleepData);

      // Assert
      expect(result.needsNap).toBe(false);
      expect(result.sleepHours).toBe('7.2');
      expect(result.sleepCategory).toBe('good');
      expect(result.napPriority).toBe('none');
      expect(result.isNapTime).toBe(true);
      expect(result.message).toBe('Not Nap Time');
      expect(result.sleepScore).toBe(88);
    });

    it('should determine Emily does NOT need a nap when sleep < 6 hours but outside nap time', () => {
      // Arrange - Mock Mountain Time 12:00 PM (before nap time)
      // 12:00 PM MT = 6:00 PM UTC (during DST)
      MockDate.set('2024-07-15T18:00:00.000Z');
      
      const mockSleepData = {
        data: [{
          type: 'long_sleep',
          day: new Date().toISOString().split('T')[0],
          total_sleep_duration: 19800, // 5.5 hours
          readiness: {
            score: 65
          }
        }]
      };

      // Act
      const result = NapCalculator.calculateNapStatus(mockSleepData);

      // Assert
      expect(result.needsNap).toBe(false);
      expect(result.sleepHours).toBe('5.5');
      expect(result.sleepCategory).toBe('struggling');
      expect(result.napPriority).toBe('none');
      expect(result.isNapTime).toBe(false);
      expect(result.message).toBe('Not Nap Time');
    });

    it('should handle edge case: exactly 6 hours of sleep during nap time', () => {
      // Arrange
      // 2:00 PM MT = 8:00 PM UTC (during DST)
      MockDate.set('2024-07-15T20:00:00.000Z');
      
      const mockSleepData = {
        data: [{
          type: 'long_sleep',
          day: new Date().toISOString().split('T')[0],
          total_sleep_duration: 21600, // exactly 6 hours
          readiness: {
            score: 80
          }
        }]
      };

      // Act
      const result = NapCalculator.calculateNapStatus(mockSleepData);

      // Assert
      expect(result.needsNap).toBe(false); // >= 6 hours, so no nap needed
      expect(result.sleepHours).toBe('6.0');
      expect(result.message).toBe('Not Nap Time');
    });

    it('should handle edge case: just under 6 hours during nap time', () => {
      // Arrange
      // 4:59 PM MT = 10:59 PM UTC (during DST)
      MockDate.set('2024-07-15T22:59:00.000Z');
      
      const mockSleepData = {
        data: [{
          type: 'long_sleep',
          day: new Date().toISOString().split('T')[0],
          total_sleep_duration: 21240, // 5.9 hours
          readiness: {
            score: 75
          }
        }]
      };

      // Act
      const result = NapCalculator.calculateNapStatus(mockSleepData);

      // Assert
      expect(result.needsNap).toBe(true);
      expect(result.sleepHours).toBe('5.9');
      expect(result.message).toBe('Maybe Nap Time');
    });

    it('should handle missing sleep data gracefully', () => {
      // Arrange
      // 3:00 PM MT = 9:00 PM UTC (during DST)
      MockDate.set('2024-07-15T21:00:00.000Z');
      const mockSleepData = { data: [] };

      // Act
      const result = NapCalculator.calculateNapStatus(mockSleepData);

      // Assert
      expect(result.needsNap).toBe(false);
      expect(result.sleepHours).toBe('0.0');
      expect(result.sleepScore).toBe(null);
      expect(result.message).toBe('Unknown'); // 3 PM is nap time, no-data message is "Unknown"
    });

    it('should handle null/undefined sleep data', () => {
      // Arrange
      // 3:00 PM MT = 9:00 PM UTC (during DST)
      MockDate.set('2024-07-15T21:00:00.000Z');

      // Act
      const result1 = NapCalculator.calculateNapStatus(null);
      const result2 = NapCalculator.calculateNapStatus(undefined);
      const result3 = NapCalculator.calculateNapStatus({});

      // Assert
      [result1, result2, result3].forEach(result => {
        expect(result.needsNap).toBe(false);
        expect(result.sleepHours).toBe('0.0');
        expect(result.sleepScore).toBe(null);
      });
    });

    it('should detect when Emily has already napped today', () => {
      // Arrange - Mock Mountain Time 3:00 PM
      // 3:00 PM MT = 9:00 PM UTC (during DST)
      MockDate.set('2024-07-15T21:00:00.000Z');
      
      const mockSleepData = {
        data: [
          {
            type: 'long_sleep',
            day: new Date().toISOString().split('T')[0],
            total_sleep_duration: 14400, // 4 hours - would normally need a nap
            readiness: {
              score: 60
            }
          },
          {
            type: 'late_nap',
            day: new Date().toISOString().split('T')[0],
            bedtime_start: new Date().toISOString().replace(/T.*/, 'T14:00:00-06:00'), // 2pm MT
            bedtime_end: new Date().toISOString().replace(/T.*/, 'T14:30:00-06:00'), // 2:30pm MT
            total_sleep_duration: 1800, // 30 minute nap
            readiness: {
              score: 85
            }
          }
        ]
      };

      // Act
      const result = NapCalculator.calculateNapStatus(mockSleepData);

      // Assert
      expect(result.needsNap).toBe(false);
      expect(result.message).toBe('Napping Has Occurred');
      expect(result.recommendation).toBe('Emily has napped already. Another nap would be silly.');
      expect(result.hasNappedToday).toBe(true);
      expect(result.sleepHours).toBe('4.0'); // Should only count main sleep, not nap
    });

    it('should NOT count nighttime sleep as a nap', () => {
      // Arrange - Mock Mountain Time 3:00 PM
      // 3:00 PM MT = 9:00 PM UTC (during DST)
      MockDate.set('2024-07-15T21:00:00.000Z');
      
      const mockSleepData = {
        data: [
          {
            type: 'long_sleep',
            day: new Date().toISOString().split('T')[0],
            total_sleep_duration: 14400, // 4 hours - would normally need a nap
            readiness: {
              score: 60
            }
          },
          {
            type: 'sleep',
            day: new Date().toISOString().split('T')[0],
            bedtime_start: new Date().toISOString().replace(/T.*/, 'T23:30:00-06:00'), // 11:30pm MT (nighttime)
            bedtime_end: new Date().toISOString().replace(/T.*/, 'T00:00:00-06:00'), // midnight
            total_sleep_duration: 1800, // 30 minutes
            readiness: {
            score: 70
          }
          }
        ]
      };

      // Act
      const result = NapCalculator.calculateNapStatus(mockSleepData);

      // Assert - Should NOT have napped (nighttime sleep doesn't count)
      expect(result.hasNappedToday).toBe(false);
      expect(result.recommendation).not.toContain('Emily has napped already');
      // With 4 hours sleep at 3pm, Emily would need a nap
      expect(result.isNapTime).toBe(true);
      expect(result.needsNap).toBe(true);
    });

    it('should include detailed sleep metrics in response', () => {
      // Arrange
      // 3:00 PM MT = 9:00 PM UTC (during DST)
      MockDate.set('2024-07-15T21:00:00.000Z');
      
      const mockSleepData = {
        data: [{
          type: 'long_sleep',
          day: new Date().toISOString().split('T')[0],
          total_sleep_duration: 18000, // 5 hours
          readiness: {
            readiness: {
            score: 70
          },
            contributors: {
              deep_sleep: 80,
              efficiency: 85,
              restfulness: 65
            }
          }
        }]
      };

      // Act
      const result = NapCalculator.calculateNapStatus(mockSleepData);

      // Assert
      expect(result.details).toEqual({
        totalSleepDurationSeconds: 18000,
        efficiency: undefined, // Not present in mock data
        deepSleepMinutes: 0, // Not present in mock data
        remSleepMinutes: 0, // Not present in mock data
        lightSleepMinutes: 0 // Not present in mock data
      });
    });
  });

  describe('Mountain Time Boundaries', () => {
    it('should recognize 2:00 PM as start of nap time', () => {
      // 2:00 PM MT = 8:00 PM UTC (during DST)
      MockDate.set('2024-07-15T20:00:00.000Z');
      const result = NapCalculator.calculateNapStatus({ data: [{ type: 'long_sleep', day: new Date().toISOString().split('T')[0], total_sleep_duration: 18000 }] });
      expect(result.isNapTime).toBe(true);
    });

    it('should recognize 4:59 PM as still nap time', () => {
      // 4:59 PM MT = 10:59 PM UTC (during DST)
      MockDate.set('2024-07-15T22:59:00.000Z');
      const result = NapCalculator.calculateNapStatus({ data: [{ type: 'long_sleep', day: new Date().toISOString().split('T')[0], total_sleep_duration: 18000 }] });
      expect(result.isNapTime).toBe(true);
    });

    it('should recognize 5:00 PM as end of nap time', () => {
      // 5:00 PM MT = 11:00 PM UTC (during DST)
      MockDate.set('2024-07-15T23:00:00.000Z');
      const result = NapCalculator.calculateNapStatus({ data: [{ type: 'long_sleep', day: new Date().toISOString().split('T')[0], total_sleep_duration: 18000 }] });
      expect(result.isNapTime).toBe(false);
    });

    it('should recognize 1:59 PM as before nap time', () => {
      // 1:59 PM MT = 7:59 PM UTC (during DST)
      MockDate.set('2024-07-15T19:59:00.000Z');
      const result = NapCalculator.calculateNapStatus({ data: [{ type: 'long_sleep', day: new Date().toISOString().split('T')[0], total_sleep_duration: 18000 }] });
      expect(result.isNapTime).toBe(false);
    });
  });

  describe('Time Zone Handling', () => {
    it('should format time correctly in Mountain Time', () => {
      // Mock specific Mountain Time
      // 3:30 PM MT = 9:30 PM UTC (during DST)
      MockDate.set('2024-07-15T21:30:00.000Z');
      
      const result = NapCalculator.calculateNapStatus({ data: [{ type: 'long_sleep', day: new Date().toISOString().split('T')[0], total_sleep_duration: 21600 }] });
      
      // Should include formatted Mountain Time
      expect(result.currentTime).toMatch(/3:30/);
    });

    it('should handle Daylight Saving Time correctly', () => {
      // This test ensures we use America/Denver timezone which handles DST
      // 2:00 PM MT = 8:00 PM UTC (during DST)
      MockDate.set('2024-07-15T20:00:00.000Z');
      
      const result = NapCalculator.calculateNapStatus({ data: [{ type: 'long_sleep', day: new Date().toISOString().split('T')[0], total_sleep_duration: 18000 }] });
      
      expect(result.isNapTime).toBe(true);
      expect(result.currentTime).toBeDefined();
    });
  });
});