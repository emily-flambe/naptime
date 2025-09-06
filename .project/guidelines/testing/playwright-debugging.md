# Playwright Debugging Guide

## Overview

This guide documents how to use Playwright for debugging and troubleshooting web applications, particularly for diagnosing styling issues, CORS problems, and general browser behavior.

## Quick Setup

### Installation

```bash
# Already included in devDependencies
npm install --save-dev playwright

# Install browsers (first time only)
npx playwright install chromium
```

### File Organization

**Important**: Save ad-hoc debugging scripts to the `.temp/` folder to keep them out of version control.

```bash
# Create .temp folder for temporary debugging scripts
mkdir -p .temp

# Example: Save debugging scripts here
.temp/
├── debug-styling.ts      # One-off style debugging
├── test-api-calls.ts     # Temporary API testing
└── check-performance.ts  # Ad-hoc performance checks
```

**Permanent scripts** (like `check-styles.ts`, `debug.ts`) can stay in the project root or a dedicated folder.

## Debugging Scripts

### 1. Style Checking Script (`check-styles.ts`)

Automated script to verify if Tailwind CSS and other styles are being applied correctly.

**Features:**
- Automatically tries multiple ports (5173-5177, 8787)
- Takes screenshots for visual inspection
- Checks for CSS classes on elements
- Verifies if Tailwind is loaded
- Reports computed styles

**Usage:**
```bash
npx tsx check-styles.ts
```

**Output Example:**
```
 Trying http://localhost:5177...
 Connected to port 5177
 Screenshot saved as style-check.png
H1 classes: text-4xl font-bold text-gray-900 dark:text-white mb-2
H1 computed styles: { fontSize: '36px', fontWeight: '700', ... }
Tailwind detected:  Yes
```

### 2. Manual Debugging Script (`debug.ts`)

Opens a browser window with DevTools for manual inspection.

**Features:**
- Shows browser window (headless: false)
- Opens DevTools automatically
- Keeps browser open for manual debugging

**Usage:**
```bash
npx tsx debug.ts
```

### 3. CORS Testing Script (`test-cors.ts`)

Verifies CORS configuration between frontend and backend.

**Features:**
- Monitors console errors
- Tracks API responses
- Takes screenshots
- Reports CORS issues

**Usage:**
```bash
npx tsx test-cors.ts
```

## Common Debugging Scenarios

### Diagnosing Styling Issues

**Problem**: Styles not applying correctly

**Solution Using Playwright:**
1. Run the style checking script
2. Review the screenshot
3. Check if CSS classes are present
4. Verify if stylesheets are loaded

```typescript
// Check if element has expected classes
const element = await page.locator('.my-element').first();
const classes = await element.getAttribute('class');
console.log('Classes:', classes);

// Check computed styles
const styles = await element.evaluate(el => {
  const computed = window.getComputedStyle(el);
  return {
    color: computed.color,
    fontSize: computed.fontSize,
    // Add other properties as needed
  };
});
```

### Debugging CORS Issues

**Problem**: API calls failing due to CORS

**Solution Using Playwright:**
1. Monitor network requests
2. Check response headers
3. Verify preflight requests

```typescript
// Monitor API responses
page.on('response', response => {
  if (response.url().includes('/api/')) {
    console.log(`API: ${response.status()} - ${response.url()}`);
    console.log('Headers:', response.headers());
  }
});

// Check for CORS errors
page.on('console', msg => {
  if (msg.type() === 'error' && msg.text().includes('CORS')) {
    console.log('CORS Error:', msg.text());
  }
});
```

### Visual Regression Testing

**Problem**: UI changes unexpectedly

**Solution Using Playwright:**
```typescript
// Take screenshot for comparison
await page.screenshot({ 
  path: 'screenshots/current.png',
  fullPage: true 
});

// Take screenshot of specific element
await page.locator('.header').screenshot({ 
  path: 'screenshots/header.png' 
});
```

### Performance Debugging

**Problem**: Slow page loads or interactions

**Solution Using Playwright:**
```typescript
// Navigate to the application
await page.goto('http://localhost:5173');

// Verify page loaded successfully
const title = await page.title();
console.log('Page title:', title);

// Check for any console errors
page.on('console', msg => {
  if (msg.type() === 'error') {
    console.error('Console error:', msg.text());
  }
});
```

## Advanced Techniques

### Running Tests

```typescript
import { chromium } from 'playwright';

// Run tests in Chromium (our primary test browser)
const browser = await chromium.launch();
const page = await browser.newPage();
// Run tests
await browser.close();

// Note: While we only test on Chromium in CI, you can test locally
// on other browsers if needed by importing firefox or webkit
```

### Mobile Device Emulation

```typescript
import { devices } from 'playwright';

// Emulate iPhone
const iPhone = devices['iPhone 13'];
const context = await browser.newContext({
  ...iPhone,
});
```

### Network Conditions

```typescript
// Simulate slow network
await page.route('**/*', route => {
  setTimeout(() => route.continue(), 1000); // Add 1s delay
});

// Block certain resources
await page.route('**/*.css', route => route.abort());
```

### Console and Error Monitoring

```typescript
// Capture all console messages
page.on('console', msg => {
  console.log(`${msg.type()}: ${msg.text()}`);
});

// Capture page errors
page.on('pageerror', error => {
  console.log('Page error:', error.message);
});

// Monitor failed requests
page.on('requestfailed', request => {
  console.log(`Failed: ${request.url()} - ${request.failure()?.errorText}`);
});
```

## Best Practices

1. **Keep Scripts Simple**: Each script should have a single purpose
2. **Use Descriptive Output**: Clear console messages help diagnose issues
3. **Take Screenshots**: Visual evidence is invaluable for debugging
4. **Check Multiple Conditions**: Don't stop at the first issue found
5. **Handle Errors Gracefully**: Scripts should report problems clearly
6. **Use .temp/ for Ad-hoc Scripts**: Keep temporary debugging scripts in `.temp/` folder to avoid cluttering the repository

## Troubleshooting Common Issues

### Browser Installation

If browsers aren't installed:
```bash
npx playwright install chromium
# Or install all browsers
npx playwright install
```

### Port Conflicts

The scripts automatically try multiple ports. If needed, modify the ports array:
```typescript
const ports = [5173, 5174, 5175, 5176, 5177, 8787];
```

### Timeout Issues

Increase timeout if pages load slowly:
```typescript
await page.goto('http://localhost:5173', { 
  timeout: 30000,  // 30 seconds
  waitUntil: 'networkidle' 
});
```

## Integration with Development Workflow

### Add to package.json Scripts

```json
{
  "scripts": {
    "debug": "tsx debug.ts",
    "check-styles": "tsx check-styles.ts",
    "test-cors": "tsx test-cors.ts"
  }
}
```

### Use in CI/CD

Playwright scripts can be integrated into CI/CD pipelines for automated checking:
```yaml
- name: Check Styles
  run: npx tsx check-styles.ts
  
- name: Verify CORS
  run: npx tsx test-cors.ts
```

## When to Use Playwright for Debugging

 **Good Use Cases:**
- Visual issues (styling, layout)
- CORS and API communication problems
- Cross-browser compatibility
- Performance issues
- User interaction problems
- Console errors that only appear in browser

 **When NOT to Use:**
- Unit testing (use Jest/Vitest)
- Simple API testing (use curl/Postman)
- Backend-only issues
- Build/compilation errors

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)

---

**Note**: Always check system time when searching for current documentation. For example, in 2025, search for "Playwright 2025" not "Playwright 2024".