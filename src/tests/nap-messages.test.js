const NapCalculator = require('../services/nap-calculator');

describe('Nap Calculator Messages', () => {
  // Helper to mock a specific time
  const mockTime = (hour) => {
    const mockDate = new Date('2024-01-15T12:00:00-07:00');
    mockDate.setHours(hour);
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
  };

  // Helper to create sleep data
  const sleepData = (hours) => ({
    data: [{
      type: 'long_sleep',
      day: new Date().toISOString().split('T')[0],
      total_sleep_duration: hours * 3600,
      efficiency: 85
    }]
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Sleep Time (11pm-7am)', () => {
    it('should tell Emily to be asleep at 2 AM', () => {
      mockTime(2);
      const result = NapCalculator.calculateNapStatus(sleepData(5));
      
      expect(result.message).toBe('Sleep Time');
      expect(result.recommendation).toBe('Emily should be asleep right now.');
    });
  });

  describe('Pre-Nap Time (7am-2pm)', () => {
    beforeEach(() => mockTime(10)); // 10 AM

    it('tells Emily in shambles to survive until 2pm', () => {
      const result = NapCalculator.calculateNapStatus(sleepData(3));
      
      expect(result.message).toBe('Not Nap Time');
      expect(result.recommendation).toBe('Emily is in shambles. She needs to survive until nap time at 2 PM.');
    });

    it('shames struggling Emily', () => {
      const result = NapCalculator.calculateNapStatus(sleepData(5));
      
      expect(result.recommendation).toContain('bad sleep habits');
      expect(result.recommendation).toContain('ashamed');
    });
  });

  describe('Nap Time (2pm-5pm)', () => {
    beforeEach(() => mockTime(15)); // 3 PM

    it('urgently tells shambles Emily to nap', () => {
      const result = NapCalculator.calculateNapStatus(sleepData(3));
      
      expect(result.message).toBe('NAP TIME');
      expect(result.recommendation).toContain('RIGHT NOW. GO TO BED');
    });

    it('gently suggests nap for struggling Emily', () => {
      const result = NapCalculator.calculateNapStatus(sleepData(5));
      
      expect(result.message).toBe('Maybe Nap Time');
      expect(result.recommendation).toContain('probably considering a nap');
    });

    it('makes nap optional for OK Emily', () => {
      const result = NapCalculator.calculateNapStatus(sleepData(7));
      
      expect(result.message).toBe('Not Nap Time');
      expect(result.recommendation).toContain("doesn't NEED to nap. But it could be fun");
    });
  });

  describe('Post-Nap Time (5pm-11pm)', () => {
    beforeEach(() => mockTime(19)); // 7 PM

    it('yells at shambles Emily', () => {
      const result = NapCalculator.calculateNapStatus(sleepData(3));
      
      expect(result.recommendation).toBe('GO TO BED GIRL');
    });

    it('harshly judges struggling Emily', () => {
      const result = NapCalculator.calculateNapStatus(sleepData(5));
      
      expect(result.recommendation).toContain('bad, bad girl');
      expect(result.recommendation).toContain('consequences of her choices');
    });
  });

  describe('Special Cases', () => {
    it('handles no data with humor', () => {
      mockTime(10);
      const result = NapCalculator.calculateNapStatus({ data: [] });
      
      expect(result.recommendation).toContain('idk something dumb might have happened lmao');
    });

    it('prevents double napping', () => {
      mockTime(15); // 3 PM
      const dataWithNap = {
        data: [
          ...sleepData(5).data,
          {
            type: 'late_nap',
            day: new Date().toISOString().split('T')[0],
            total_sleep_duration: 1800,
            bedtime_start: new Date().toISOString().replace(/T.*/, 'T14:00:00-07:00')
          }
        ]
      };
      
      const result = NapCalculator.calculateNapStatus(dataWithNap);
      expect(result.recommendation).toBe('Emily has napped already. Another nap would be silly.');
    });
  });

  describe('Nap Need Logic', () => {
    it('shambles always needs nap', () => {
      mockTime(10); // morning
      const result = NapCalculator.calculateNapStatus(sleepData(3));
      expect(result.needsNap).toBe(true);
    });

    it('struggling needs nap only during nap time', () => {
      // Morning - no nap
      mockTime(10);
      let result = NapCalculator.calculateNapStatus(sleepData(5));
      expect(result.needsNap).toBe(false);

      // Nap time - yes nap
      mockTime(15);
      result = NapCalculator.calculateNapStatus(sleepData(5));
      expect(result.needsNap).toBe(true);
    });

    it('OK never needs nap', () => {
      mockTime(15); // even during nap time
      const result = NapCalculator.calculateNapStatus(sleepData(7));
      expect(result.needsNap).toBe(false);
    });
  });
});