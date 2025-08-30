/**
 * Jest Test Setup
 * Global configuration and mocks for testing
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret-key';
process.env.OURA_CLIENT_ID = 'test-client-id';
process.env.OURA_CLIENT_SECRET = 'test-client-secret';

// Increase Jest timeout for integration tests
jest.setTimeout(10000);

// Mock console.log and console.error to reduce noise in tests
// Keep console.warn for debugging
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

global.console = {
  ...console,
  log: jest.fn(() => {}),
  error: jest.fn(() => {}),
  warn: originalConsoleLog, // Keep warnings visible
  info: originalConsoleLog, // Keep info visible
};

// Restore console for debugging when needed
global.restoreConsole = () => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
};

// Setup global test helpers
global.testHelpers = {
  mockSleepData: (hours = 6, score = 80) => ({
    data: [{
      total_sleep_duration: hours * 3600, // Convert hours to seconds
      score,
      contributors: {
        deep_sleep: 85,
        efficiency: 90,
        restfulness: 75
      }
    }]
  }),
  
  mockEmptySleepData: () => ({ data: [] }),
  
  mockUserInfo: (id = 'test_user', email = 'test@example.com') => ({
    id,
    email
  }),
  
  mockNapStatus: (needsNap = false, sleepHours = '6.0') => ({
    needsNap,
    sleepHours,
    sleepScore: 80,
    isNapTime: true,
    currentTime: '3:00 PM',
    lastUpdated: '2024-01-15T21:00:00.000Z',
    message: needsNap ? 'YES, EMILY NEEDS A NAP' : "Nah, She's Fine",
    details: {
      deepSleep: 85,
      efficiency: 90,
      restfulness: 75
    }
  })
};

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset environment variables if they were changed
  process.env.NODE_ENV = 'test';
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export for use in tests
module.exports = {
  testHelpers: global.testHelpers,
  restoreConsole: global.restoreConsole
};