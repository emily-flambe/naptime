# Test-Driven Development Approach

## Philosophy

Our TDD approach emphasizes **confidence through comprehensive testing** with a focus on maintainability, developer experience, and real-world user scenarios. We follow the testing pyramid with modern tooling optimized for React 19 and current best practices.

## Testing Stack

### Core Testing Framework
- **Vitest 3.2.x**: Next-generation testing framework with native ESM support and 10x faster than Jest
- **React Testing Library 16.3.0**: Component testing with React 19 support and new hooks
- **Playwright**: End-to-end testing with Chromium browser and visual regression testing

### Testing Pyramid

```
    /\     E2E Tests (Playwright)
   /  \    - Critical user journeys
  /    \   - Chromium browser testing
 /______\  - Visual regression testing
/        \ 
|  Integration Tests (Vitest + RTL)
|  - Component integration
|  - API route testing
|  - State management
|________
|
| Unit Tests (Vitest)
| - Pure functions
| - Business logic
| - Utilities
|________________
```

## Testing Strategy by Layer

### Unit Tests (60-70% of tests)
**Purpose**: Test individual functions, utilities, and isolated components

**Tools**: Vitest with native TypeScript support

**Focus Areas**:
- Pure functions and utilities
- Business logic validation  
- Custom hooks (including React 19 hooks like `useOptimistic`)
- Type safety validation
- Edge cases and error conditions

**Best Practices**:
```typescript
// Example: Testing custom hooks with React 19
import { renderHook, act } from '@testing-library/react'
import { useOptimistic } from 'react'
import { useCartActions } from '@/hooks/useCartActions'

describe('useCartActions', () => {
  it('should optimistically update cart state', async () => {
    const { result } = renderHook(() => useCartActions())
    
    act(() => {
      result.current.addItem({ id: '1', name: 'Test Item' })
    })
    
    expect(result.current.optimisticCart).toContainEqual(
      expect.objectContaining({ id: '1', name: 'Test Item' })
    )
  })
})
```

### Integration Tests (25-35% of tests)
**Purpose**: Test component integration, API interactions, and feature workflows

**Tools**: Vitest + React Testing Library

**Focus Areas**:
- Component integration with providers
- Form submissions with `useActionState`
- API route handlers
- Authentication flows
- State management interactions

**Best Practices**:
```typescript
// Example: Testing React 19 form actions
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useActionState } from 'react'
import { LoginForm } from '@/components/LoginForm'

describe('LoginForm Integration', () => {
  it('should handle login submission with useActionState', async () => {
    render(<LoginForm />)
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' }
    })
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument()
    })
  })
})
```

### E2E Tests (5-15% of tests)
**Purpose**: Test critical user journeys in Chromium browser

**Tools**: Playwright with visual regression testing (Chromium only)

**Focus Areas**:
- Complete user workflows
- Authentication integration
- Payment processing
- Core functionality validation
- Performance validation

## React 19 Specific Testing Patterns

### Testing New Hooks

#### useOptimistic Hook
```typescript
// Testing optimistic updates
import { renderHook, act } from '@testing-library/react'

test('useOptimistic provides optimistic state', async () => {
  const { result } = renderHook(() => {
    const [optimisticMessages, addOptimisticMessage] = useOptimistic(
      messages,
      (state, newMessage) => [...state, { ...newMessage, sending: true }]
    )
    return { optimisticMessages, addOptimisticMessage }
  })

  act(() => {
    result.current.addOptimisticMessage({ text: 'Hello', id: 'temp-1' })
  })

  expect(result.current.optimisticMessages).toHaveLength(messages.length + 1)
  expect(result.current.optimisticMessages.at(-1)).toMatchObject({
    text: 'Hello',
    sending: true
  })
})
```

#### useActionState Hook
```typescript
// Testing form actions with useActionState
import { renderHook, act } from '@testing-library/react'

test('useActionState handles form submission', async () => {
  const mockAction = vi.fn().mockResolvedValue({ success: true })
  
  const { result } = renderHook(() => 
    useActionState(mockAction, { success: false })
  )

  const [state, formAction] = result.current

  act(() => {
    formAction(new FormData())
  })

  await waitFor(() => {
    expect(result.current[0].success).toBe(true)
  })
})
```

### Testing Server Components
```typescript
// For RSC-style components (when using Next.js later)
import { render } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'

test('server component renders with data', async () => {
  const mocks = [
    {
      request: { query: GET_USER_QUERY },
      result: { data: { user: { name: 'John Doe' } } }
    }
  ]

  const { findByText } = render(
    <MockedProvider mocks={mocks}>
      <UserProfile userId="1" />
    </MockedProvider>
  )

  expect(await findByText('John Doe')).toBeInTheDocument()
})
```

## Testing Configuration

### Vitest Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        '.project/'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```


### Playwright Configuration
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI
  }
})
```

## Coverage Requirements

### Minimum Coverage Thresholds
- **Statements**: 85%
- **Branches**: 80%  
- **Functions**: 85%
- **Lines**: 85%

### Critical Path Coverage
- **Authentication flows**: 95%
- **Payment processing**: 95%
- **Data validation**: 90%
- **Security functions**: 95%

## Testing Workflow

### Red-Green-Refactor Cycle
1. **Red**: Write failing test that describes desired behavior
2. **Green**: Write minimal code to make test pass
3. **Refactor**: Improve code quality while maintaining tests

### Failed Test Resolution Strategy

When encountering a failed test, follow this strict protocol:

1. **Evaluate Test Usefulness**
   - Is the test validating actual business requirements?
   - Does the test protect against real bugs or regressions?
   - Is the test testing implementation details instead of behavior?
   - If the test is not useful, remove or rewrite it to test behavior

2. **Understand Root Cause**
   - Read the actual error message and stack trace carefully
   - Identify whether it's a code issue, test issue, or environment issue
   - Use debugging tools to step through the code if needed
   - Check if requirements have changed making the test outdated

3. **Address the Root Cause Properly**
   - **NEVER** mock away the problem to make tests pass
   - **NEVER** use lazy fallbacks that hide actual issues
   - **NEVER** disable or skip tests without documenting why
   - Fix the actual bug in the code, not the test
   - If the test is outdated, update it to match new requirements
   - If mocking is necessary, ensure it accurately represents real behavior

#### Anti-Patterns to Avoid

**Inappropriate Mocking**:
```typescript
// BAD: Mocking to hide a real problem
test('user login', () => {
  // Don't mock away authentication errors
  vi.mock('@/services/auth', () => ({
    login: vi.fn().mockResolvedValue({ success: true }) // Hiding real auth issues
  }))
})

// GOOD: Fix the actual authentication logic
test('user login', () => {
  // Test with real auth service or proper mock that represents actual behavior
  const authService = createTestAuthService() // Properly configured test service
  // Test actual authentication flow
})
```

**Lazy Fallbacks**:
```typescript
// BAD: Using try-catch to suppress errors
function getData() {
  try {
    return fetchData()
  } catch {
    return [] // Lazy fallback hiding real issues
  }
}

// GOOD: Handle errors explicitly
function getData() {
  try {
    return fetchData()
  } catch (error) {
    logger.error('Failed to fetch data:', error)
    throw new DataFetchError('Unable to retrieve data', { cause: error })
  }
}
```

### Pre-commit Testing
```bash
# Lint-staged configuration
{
  "*.{ts,tsx}": [
    "npm run type-check",
    "npm run test -- --related --run",
    "npm run lint:fix"
  ]
}
```

### CI/CD Integration
```yaml
# .github/workflows/test.yml
- name: Run unit and integration tests
  run: npm run test:coverage

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload coverage reports
  uses: codecov/codecov-action@v4
```

## Performance Testing

### Core Web Vitals Testing
```typescript
// tests/e2e/performance.spec.ts
import { test, expect } from '@playwright/test'

test('page loads successfully', async ({ page }) => {
  await page.goto('/')
  
  // Verify page loaded correctly
  await expect(page).toHaveTitle(/Web App/)
  
  // Performance validation can be added here as needed
})
```

### Bundle Size Testing
```typescript
// vitest integration for bundle analysis
test('bundle is optimized', async () => {
  const stats = await import('../dist/stats.json')
  const mainChunkSize = stats.chunks.find(chunk => 
    chunk.names.includes('main')
  ).size
  
  // Verify bundle is optimized (adjust threshold as needed)
  expect(mainChunkSize).toBeDefined()
})
```

## Best Practices

### Test Organization
- **Co-locate tests**: Keep test files next to source files
- **Descriptive names**: Use clear, behavior-focused test names
- **Arrange-Act-Assert**: Structure tests for clarity
- **Single responsibility**: Each test validates one behavior

### Mocking Strategy
- **Mock external dependencies**: APIs, third-party services
- **Avoid mocking internal modules**: Test real integration
- **Use factory functions**: Create reusable test data
- **Clean up after tests**: Reset mocks and state

### React 19 Considerations
- **Test concurrent features**: Suspense, transitions, streaming
- **Validate accessibility**: Use RTL's accessibility queries
- **Test error boundaries**: Ensure proper error handling
- **Performance testing**: Measure render times and re-renders

This TDD approach ensures robust, maintainable code while leveraging the latest features and best practices of React 19 and modern testing tools.