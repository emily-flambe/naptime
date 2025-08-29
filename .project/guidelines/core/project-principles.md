# Project Principles & Standards

## Core Development Principles

### Code Quality Standards
- **Type Safety First**: Strict TypeScript/Python typing always enabled
- **Explicit Over Implicit**: Clear, self-documenting code
- **Consistency Over Perfection**: Follow existing patterns
- **Performance by Design**: Measure, optimize, validate

### Architecture Principles
- **Platform Portability**: Abstract platform-specific code
- **Component Isolation**: Single responsibility principle
- **Progressive Enhancement**: Core functionality first, enhancements second
- **API-First Design**: Backend services expose clean APIs

## File Organization

### Directory Structure
```
src/
├── components/        # React components
│   ├── common/       # Reusable UI components
│   └── features/     # Feature-specific components
├── hooks/            # Custom React hooks
├── services/         # API and external services
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
└── lib/              # Core libraries and integrations
```

### Naming Conventions
- **Components**: PascalCase (`UserProfile.tsx`)
- **Hooks**: camelCase with 'use' prefix (`useAuth.ts`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Types**: PascalCase for types/interfaces
- **Constants**: SCREAMING_SNAKE_CASE (`API_ENDPOINTS.ts`)

## Import/Export Standards

### Import Order
1. React imports
2. Third-party libraries
3. Internal imports (absolute paths using `@/`)
4. Relative imports
5. Type imports

```typescript
// Example
import React, { useState, useEffect } from 'react'
import { z } from 'zod'
import { Button } from '@/components/common'
import type { UserProfile } from '@/types'
import { LocalComponent } from './LocalComponent'
```

### Export Patterns
- Prefer named exports for utilities and services
- Use default exports sparingly (mainly for page components)
- Always export types alongside implementations
- Use barrel exports (index.ts) for clean imports

## Code Formatting

### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### ESLint Rules
- No unused variables
- No console.log in production
- Explicit return types for functions
- Exhaustive deps for React hooks
- No any types

## Error Handling Patterns

### Principles
- **Fail Fast**: Detect and report errors immediately
- **Never Suppress**: All errors must be logged or handled
- **User-Friendly**: Show helpful messages to users
- **Developer-Friendly**: Include context for debugging

### Implementation
```typescript
// Custom error classes for different contexts
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Result type pattern for predictable error handling
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }
```

## Performance Standards

### Targets
- **Initial Load**: Fast loading on all networks
- **Time to Interactive**: Quick interaction readiness
- **Bundle Size**: Optimized for fast loading
- **API Response**: Fast API responses

### Optimization Strategies
- Code splitting by route
- Lazy loading for heavy components
- Image optimization (WebP, AVIF)
- API response caching
- Database query optimization

## Security Practices

### Non-Negotiable Rules
1. **NEVER** commit secrets or API keys
2. **ALWAYS** validate user input
3. **ALWAYS** use parameterized queries
4. **NEVER** trust client-side validation alone
5. **ALWAYS** implement proper authentication

### Implementation
- Environment variables for all configuration
- Input validation with Zod schemas
- CSRF protection on state-changing operations
- Rate limiting on API endpoints
- Security headers (CSP, HSTS, etc.)

## Documentation Requirements

### Code Documentation
- JSDoc for public APIs
- Inline comments for complex logic
- README for each major feature
- Type definitions with descriptions

### Example
```typescript
/**
 * Validates and processes user registration data
 * @param data - Raw registration form data
 * @returns Processed user object or validation errors
 * @throws {ValidationError} When required fields are missing
 */
export async function processRegistration(
  data: unknown
): Promise<Result<User, ValidationError>> {
  // Implementation
}
```

## Testing Requirements

### Coverage Minimums
- **Unit Tests**: 80% coverage
- **Integration Tests**: Critical paths covered
- **E2E Tests**: Happy paths + main error cases

### Testing Philosophy
- Test behavior, not implementation
- Write tests before fixing bugs
- Keep tests simple and focused
- Use meaningful test descriptions

### Failed Test Resolution Protocol
When tests fail, follow this strict approach:
1. **Evaluate usefulness**: Ensure the test validates real requirements
2. **Understand root cause**: Debug thoroughly before making changes
3. **Fix properly**: Address the actual problem, never force tests to pass

**Prohibited Practices**:
- Using inappropriate mocks to hide real problems
- Adding lazy fallbacks that suppress errors
- Skipping tests without proper documentation
- Testing implementation details instead of behavior

## Version Control

### Commit Messages
Follow conventional commits:
```
type(scope): description

[optional body]
[optional footer]
```

Types: feat, fix, docs, style, refactor, test, chore

### Branch Strategy
- `main` - Production code
- `develop` - Integration branch
- `feature/*` - New features
- `fix/*` - Bug fixes
- `release/*` - Release preparation

## Review Standards

### Pull Request Requirements
- Passes all automated tests
- Includes relevant tests for changes
- Updates documentation if needed
- Has clear description of changes
- Addresses single concern

### Code Review Focus
1. Correctness and completeness
2. Performance implications
3. Security considerations
4. Code clarity and maintainability
5. Test coverage and quality

## Language-Specific Standards

For detailed language-specific guidelines, see:
- [TypeScript Standards](../languages/typescript-standards.md)
- [React Standards](../languages/react-standards.md)
- [Python Standards](../languages/python-standards.md)