const NapCalculator = require('../services/nap-calculator');

describe('Nap Calculator Logic', () => {
  // Simple helper to mock time
  const atTime = (hour, sleepHours = 5) => {
    const mockDate = new Date('2024-01-15T12:00:00-07:00');
    mockDate.setHours(hour);
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    
    return NapCalculator.calculateNapStatus({
      data: [{
        type: 'long_sleep',
        day: new Date().toISOString().split('T')[0],
        total_sleep_duration: sleepHours * 3600,
        efficiency: 85
      }]
    });
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Core Business Logic: When should Emily nap?', () => {
    it('Emily ALWAYS needs a nap with <4 hours sleep (shambles)', () => {
      expect(atTime(8, 3).needsNap).toBe(true);   // morning
      expect(atTime(15, 3).needsNap).toBe(true);  // nap time
      expect(atTime(19, 3).needsNap).toBe(true);  // evening
    });

    it('Emily needs a nap with 4-6 hours ONLY during nap time (2-5pm)', () => {
      const sleepHours = 5;
      
      // Before nap time - no nap
      expect(atTime(10, sleepHours).needsNap).toBe(false);
      expect(atTime(13, sleepHours).needsNap).toBe(false);
      
      // During nap time - yes nap
      expect(atTime(14, sleepHours).needsNap).toBe(true);
      expect(atTime(15, sleepHours).needsNap).toBe(true);
      expect(atTime(16, sleepHours).needsNap).toBe(true);
      
      // After nap time - no nap
      expect(atTime(17, sleepHours).needsNap).toBe(false);
      expect(atTime(20, sleepHours).needsNap).toBe(false);
    });

    it('Emily NEVER needs a nap with 6+ hours (OK)', () => {
      expect(atTime(8, 7).needsNap).toBe(false);   // morning
      expect(atTime(15, 7).needsNap).toBe(false);  // nap time
      expect(atTime(19, 8).needsNap).toBe(false);  // evening
    });

    it('Emily needs a nap with 9+ hours (might be sick)', () => {
      expect(atTime(10, 10).needsNap).toBe(true);
      expect(atTime(15, 11).needsNap).toBe(true);
    });
  });

  describe('Time Window Boundaries', () => {
    it('correctly identifies sleep time (11pm-7am)', () => {
      expect(atTime(22).isSleepTime).toBe(false);  // 10pm - not sleep
      expect(atTime(23).isSleepTime).toBe(true);   // 11pm - sleep starts
      expect(atTime(0).isSleepTime).toBe(true);    // midnight
      expect(atTime(6).isSleepTime).toBe(true);    // 6am - still sleep
      expect(atTime(7).isSleepTime).toBe(false);   // 7am - sleep ends
    });

    it('correctly identifies nap time (2pm-5pm)', () => {
      expect(atTime(13).isNapTime).toBe(false);  // 1pm - not nap time
      expect(atTime(14).isNapTime).toBe(true);   // 2pm - nap starts
      expect(atTime(16).isNapTime).toBe(true);   // 4pm - still nap time
      expect(atTime(17).isNapTime).toBe(false);  // 5pm - nap ends
    });
  });

  describe('Sleep State Boundaries', () => {
    it('correctly categorizes sleep amounts', () => {
      expect(atTime(10, 0).message).toContain('Not Nap Time');
      expect(atTime(10, 3.9).needsNap).toBe(true);   // shambles
      expect(atTime(10, 4).needsNap).toBe(false);    // struggling (morning)
      expect(atTime(10, 5.9).needsNap).toBe(false);  // struggling (morning)
      expect(atTime(10, 6).needsNap).toBe(false);    // OK
      expect(atTime(10, 9).needsNap).toBe(false);    // OK
      expect(atTime(10, 9.1).needsNap).toBe(true);   // oversleep
    });
  });

  describe('Already Napped Logic', () => {
    it('prevents napping twice in one day', () => {
      const mockDate = new Date('2024-01-15T15:00:00-07:00'); // 3 PM
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      const dataWithNap = {
        data: [
          {
            type: 'long_sleep',
            day: new Date().toISOString().split('T')[0],
            total_sleep_duration: 10800, // 3 hours - shambles!
            efficiency: 85
          },
          {
            type: 'late_nap',
            day: new Date().toISOString().split('T')[0],
            total_sleep_duration: 1800, // 30 min nap
            bedtime_start: new Date().toISOString().replace(/T.*/, 'T14:00:00-07:00')
          }
        ]
      };
      
      const result = NapCalculator.calculateNapStatus(dataWithNap);
      
      // Even though Emily is in shambles, she already napped
      expect(result.needsNap).toBe(false);
      expect(result.hasNappedToday).toBe(true);
      expect(result.recommendation).toContain('silly');
    });
  });

  describe('Message Priority', () => {
    it('sleep time message takes priority over everything', () => {
      const result = atTime(2, 3); // 2 AM, shambles
      expect(result.message).toBe('I Sleep'); // Sleep time message is "I Sleep"
      expect(result.recommendation).toContain('asleep right now');
    });

    it('harsh evening messages for struggling Emily', () => {
      const evening = atTime(19, 5); // 7 PM, struggling
      expect(evening.recommendation).toContain('bad, bad girl');
      expect(evening.recommendation).toContain('consequences');
    });

    it('urgent message for shambles Emily in evening', () => {
      const evening = atTime(19, 3); // 7 PM, shambles
      expect(evening.recommendation).toBe('GO TO BED GIRL');
    });
  });

  describe('Edge Cases', () => {
    it('handles no data appropriately', () => {
      const result = NapCalculator.calculateNapStatus({ data: [] });
      expect(result.sleepHours).toBe('0.0');
      expect(result.needsNap).toBe(false);
      expect(result.recommendation).toContain('idk something dumb');
    });

  });
});