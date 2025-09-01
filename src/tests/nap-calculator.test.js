/**
 * Nap Calculator Tests
 * Testing the core logic for determining if Emily needs a nap
 */

const NapCalculator = require('../services/nap-calculator');

describe('NapCalculator', () => {
  // Store original Date for restoration
  let originalDate;
  
  beforeAll(() => {
    originalDate = Date;
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  describe('calculateNapStatus', () => {
    it('should determine Emily maybe needs a nap when sleep 4-6 hours and time is 2-5 PM MT', () => {
      // Arrange - Mock Mountain Time 3:00 PM
      mockMountainTime(15, 0); // 3:00 PM
      
      const mockSleepData = {
        data: [{
          type: 'long_sleep',
          day: new Date().toISOString().split('T')[0],
          total_sleep_duration: 19800, // 5.5 hours in seconds
          score: 72,
          contributors: {
            deep_sleep: 85,
            efficiency: 90,
            restfulness: 60
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
      mockMountainTime(10, 0);
      
      const mockSleepData = {
        data: [{
          type: 'long_sleep',
          day: new Date().toISOString().split('T')[0],
          total_sleep_duration: 10800, // 3 hours in seconds
          score: 45
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
      expect(result.message).toBe('NAP TIME');
    });

    it('should determine Emily needs a nap when oversleep (>9 hours) indicates sickness', () => {
      // Arrange - Mock Mountain Time 10:00 AM (outside nap time)
      mockMountainTime(10, 0);
      
      const mockSleepData = {
        data: [{
          type: 'long_sleep',
          day: new Date().toISOString().split('T')[0],
          total_sleep_duration: 36000, // 10 hours in seconds
          score: 75
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
      expect(result.message).toBe('NAP TIME');
    });

    it('should determine Emily does NOT need a nap when sleep >= 6 hours during nap time', () => {
      // Arrange - Mock Mountain Time 3:00 PM
      mockMountainTime(15, 30); // 3:30 PM
      
      const mockSleepData = {
        data: [{
          type: 'long_sleep',
          day: new Date().toISOString().split('T')[0],
          total_sleep_duration: 25920, // 7.2 hours in seconds
          score: 88,
          contributors: {
            deep_sleep: 95,
            efficiency: 92,
            restfulness: 85
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
      mockMountainTime(12, 0);
      
      const mockSleepData = {
        data: [{
          type: 'long_sleep',
          day: new Date().toISOString().split('T')[0],
          total_sleep_duration: 19800, // 5.5 hours
          score: 65
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
      mockMountainTime(14, 0); // 2:00 PM (start of nap time)
      
      const mockSleepData = {
        data: [{
          type: 'long_sleep',
          day: new Date().toISOString().split('T')[0],
          total_sleep_duration: 21600, // exactly 6 hours
          score: 80
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
      mockMountainTime(16, 59); // 4:59 PM (end of nap time)
      
      const mockSleepData = {
        data: [{
          type: 'long_sleep',
          day: new Date().toISOString().split('T')[0],
          total_sleep_duration: 21540, // 5.983 hours (just under 6)
          score: 75
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
      mockMountainTime(15, 0);
      const mockSleepData = { data: [] };

      // Act
      const result = NapCalculator.calculateNapStatus(mockSleepData);

      // Assert
      expect(result.needsNap).toBe(false);
      expect(result.sleepHours).toBe('0.0');
      expect(result.sleepScore).toBe(null);
      expect(result.message).toBe('Not Nap Time Yet'); // 0 hours < 6, but treated as no data
    });

    it('should handle null/undefined sleep data', () => {
      // Arrange
      mockMountainTime(15, 0);

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
      mockMountainTime(15, 0);
      
      const mockSleepData = {
        data: [
          {
            type: 'long_sleep',
            day: new Date().toISOString().split('T')[0],
            total_sleep_duration: 14400, // 4 hours - would normally need a nap
            score: 60
          },
          {
            type: 'late_nap',
            day: new Date().toISOString().split('T')[0],
            bedtime_start: new Date().toISOString().replace(/T.*/, 'T14:00:00-06:00'), // 2pm MT
            bedtime_end: new Date().toISOString().replace(/T.*/, 'T14:30:00-06:00'), // 2:30pm MT
            total_sleep_duration: 1800, // 30 minute nap
            score: 85
          }
        ]
      };

      // Act
      const result = NapCalculator.calculateNapStatus(mockSleepData);

      // Assert
      expect(result.needsNap).toBe(false);
      expect(result.message).toBe('Not Nap Time');
      expect(result.recommendation).toBe('emily has napped already. Another nap would be silly.');
      expect(result.hasNappedToday).toBe(true);
      expect(result.sleepHours).toBe('4.0'); // Should only count main sleep, not nap
    });

    it('should NOT count nighttime sleep as a nap', () => {
      // Arrange - Mock Mountain Time 3:00 PM
      mockMountainTime(15, 0);
      
      const mockSleepData = {
        data: [
          {
            type: 'long_sleep',
            day: new Date().toISOString().split('T')[0],
            total_sleep_duration: 14400, // 4 hours - would normally need a nap
            score: 60
          },
          {
            type: 'sleep',
            day: new Date().toISOString().split('T')[0],
            bedtime_start: new Date().toISOString().replace(/T.*/, 'T23:30:00-06:00'), // 11:30pm MT (nighttime)
            bedtime_end: new Date().toISOString().replace(/T.*/, 'T00:00:00-06:00'), // midnight
            total_sleep_duration: 1800, // 30 minutes
            score: 70
          }
        ]
      };

      // Act
      const result = NapCalculator.calculateNapStatus(mockSleepData);

      // Assert - Should NOT have napped (nighttime sleep doesn't count)
      expect(result.hasNappedToday).toBe(false);
      expect(result.recommendation).not.toContain('emily has napped already');
      // With 4 hours sleep at 3pm, Emily would need a nap
      expect(result.isNapTime).toBe(true);
      expect(result.needsNap).toBe(true);
    });

    it('should include detailed sleep metrics in response', () => {
      // Arrange
      mockMountainTime(15, 0);
      
      const mockSleepData = {
        data: [{
          type: 'long_sleep',
          day: new Date().toISOString().split('T')[0],
          total_sleep_duration: 18000, // 5 hours
          score: 70,
          contributors: {
            deep_sleep: 80,
            efficiency: 85,
            restfulness: 65
          }
        }]
      };

      // Act
      const result = NapCalculator.calculateNapStatus(mockSleepData);

      // Assert
      expect(result.details).toEqual({
        deepSleep: 80,
        efficiency: 85,
        restfulness: 65
      });
    });
  });

  describe('Mountain Time Boundaries', () => {
    it('should recognize 2:00 PM as start of nap time', () => {
      mockMountainTime(14, 0);
      const result = NapCalculator.calculateNapStatus({ data: [{ type: 'long_sleep', day: new Date().toISOString().split('T')[0], total_sleep_duration: 18000 }] });
      expect(result.isNapTime).toBe(true);
    });

    it('should recognize 4:59 PM as still nap time', () => {
      mockMountainTime(16, 59);
      const result = NapCalculator.calculateNapStatus({ data: [{ type: 'long_sleep', day: new Date().toISOString().split('T')[0], total_sleep_duration: 18000 }] });
      expect(result.isNapTime).toBe(true);
    });

    it('should recognize 5:00 PM as end of nap time', () => {
      mockMountainTime(17, 0);
      const result = NapCalculator.calculateNapStatus({ data: [{ type: 'long_sleep', day: new Date().toISOString().split('T')[0], total_sleep_duration: 18000 }] });
      expect(result.isNapTime).toBe(false);
    });

    it('should recognize 1:59 PM as before nap time', () => {
      mockMountainTime(13, 59);
      const result = NapCalculator.calculateNapStatus({ data: [{ type: 'long_sleep', day: new Date().toISOString().split('T')[0], total_sleep_duration: 18000 }] });
      expect(result.isNapTime).toBe(false);
    });
  });

  describe('Time Zone Handling', () => {
    it('should format time correctly in Mountain Time', () => {
      // Mock specific Mountain Time
      mockMountainTime(15, 30);
      
      const result = NapCalculator.calculateNapStatus({ data: [{ type: 'long_sleep', day: new Date().toISOString().split('T')[0], total_sleep_duration: 21600 }] });
      
      // Should include formatted Mountain Time
      expect(result.currentTime).toMatch(/3:30/);
    });

    it('should handle Daylight Saving Time correctly', () => {
      // This test ensures we use America/Denver timezone which handles DST
      mockMountainTime(14, 0);
      
      const result = NapCalculator.calculateNapStatus({ data: [{ type: 'long_sleep', day: new Date().toISOString().split('T')[0], total_sleep_duration: 18000 }] });
      
      expect(result.isNapTime).toBe(true);
      expect(result.currentTime).toBeDefined();
    });
  });
});

/**
 * Helper function to mock Mountain Time
 * @param {number} hour - Hour in Mountain Time (0-23)
 * @param {number} minute - Minute (0-59)
 */
function mockMountainTime(hour, minute = 0) {
  const mockDate = new Date();
  const OriginalDate = global.Date;
  
  // Mock Date constructor and toLocaleString
  global.Date = class extends OriginalDate {
    constructor(...args) {
      if (args.length) {
        return new OriginalDate(...args);
      }
      return new OriginalDate('2024-01-15T12:00:00Z'); // Arbitrary base time
    }
    
    static now() {
      return new OriginalDate('2024-01-15T12:00:00Z').getTime();
    }
    
    toLocaleString(locale, options) {
      if (options && options.timeZone === 'America/Denver') {
        // Return mocked Mountain Time
        const timeString = `${hour}:${minute.toString().padStart(2, '0')}`;
        if (options.timeStyle === 'short') {
          return timeString + (hour >= 12 ? ' PM' : ' AM');
        }
        return `1/15/2024, ${timeString}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
      }
      return super.toLocaleString(locale, options);
    }
  };
  
  // Also need to mock the Date constructor used in calculateNapStatus
  // The function creates: new Date(now.toLocaleString("en-US", { timeZone: "America/Denver" }))
  const mockMountainDate = new OriginalDate();
  mockMountainDate.setHours(hour, minute, 0, 0);
  
  global.Date.prototype.toLocaleString = function(locale, options) {
    if (options && options.timeZone === 'America/Denver') {
      const timeString = `${hour}:${minute.toString().padStart(2, '0')}`;
      if (options.timeStyle === 'short') {
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        return `${displayHour}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
      }
      return `1/15/2024, ${hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour)}:${minute.toString().padStart(2, '0')}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
    }
    return originalDate.prototype.toLocaleString.call(this, locale, options);
  };
}