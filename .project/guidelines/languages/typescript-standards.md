# TypeScript Coding Standards

## General Principles
- Type safety is non-negotiable - strict mode always enabled
- Explicit is better than implicit
- Avoid `any` at all costs
- Prefer immutability and functional patterns

## TypeScript Configuration

### tsconfig.json Requirements
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## Naming Conventions

### Variables and Functions
```typescript
// Variables: camelCase
const userProfile = { name: 'John' };
const isLoading = false;

// Functions: camelCase, verb prefix
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = process.env.VITE_API_URL;
```

### Types and Interfaces
```typescript
// Types: PascalCase
type UserRole = 'admin' | 'user' | 'guest';

// Interfaces: PascalCase, NO 'I' prefix
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// Enums: PascalCase for name, UPPER_SNAKE_CASE for values
enum HttpStatus {
  OK = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  NOT_FOUND = 404,
}
```

## Type Patterns

### Prefer Type Inference Where Clear
```typescript
// Good: Type is obvious
const name = 'John'; // string
const age = 30; // number
const items = [1, 2, 3]; // number[]

// Good: Explicit when not obvious
const data: Record<string, unknown> = await fetchData();
const handler: EventHandler<MouseEvent> = (e) => { };
```

### Use Utility Types
```typescript
// Partial for optional properties
type UpdateUserDto = Partial<User>;

// Pick for subset of properties
type UserPreview = Pick<User, 'id' | 'name'>;

// Omit to exclude properties
type PublicUser = Omit<User, 'password'>;

// Record for objects
type ErrorMessages = Record<string, string>;

// Required to make all properties required
type CompleteUser = Required<PartialUser>;
```

### Discriminated Unions for State
```typescript
// Good: Discriminated union
type LoadingState<T> = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// Usage
function handleState<T>(state: LoadingState<T>) {
  switch (state.status) {
    case 'loading':
      return 'Loading...';
    case 'success':
      return state.data; // TypeScript knows data exists here
    case 'error':
      return state.error.message;
    case 'idle':
      return null;
  }
}
```

## Function Patterns

### Type Parameters and Constraints
```typescript
// Generic with constraint
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// Multiple type parameters
function map<T, U>(array: T[], fn: (item: T) => U): U[] {
  return array.map(fn);
}

// Default type parameters
function createArray<T = string>(length: number, value: T): T[] {
  return Array(length).fill(value);
}
```

### Function Overloads
```typescript
// Define overloads for different signatures
function parseInput(input: string): string;
function parseInput(input: number): number;
function parseInput(input: string | number): string | number {
  if (typeof input === 'string') {
    return input.trim();
  }
  return Math.floor(input);
}
```

## Error Handling

### Custom Error Types
```typescript
class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

class ValidationError extends AppError {
  constructor(message: string, public readonly field: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}
```

### Result Type Pattern
```typescript
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

async function fetchUser(id: string): Promise<Result<User>> {
  try {
    const user = await api.getUser(id);
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

// Usage
const result = await fetchUser('123');
if (result.success) {
  console.log(result.data); // TypeScript knows data exists
} else {
  console.error(result.error); // TypeScript knows error exists
}
```

## Module Organization

### File Structure
```typescript
// user.types.ts - Type definitions
export interface User { }
export type UserRole = 'admin' | 'user';

// user.utils.ts - Utility functions
export function validateUser(user: User): boolean { }

// user.service.ts - Business logic
export class UserService { }

// user.test.ts - Tests
describe('UserService', () => { });
```

### Barrel Exports
```typescript
// index.ts in feature folder
export * from './user.types';
export * from './user.service';
export { validateUser } from './user.utils';
```

## Async Patterns

### Always Use Async/Await
```typescript
// Good: Async/await
async function fetchData(): Promise<Data> {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    logger.error('Failed to fetch data', error);
    throw error;
  }
}

// Avoid: Promise chains
function fetchData(): Promise<Data> {
  return fetch('/api/data')
    .then(response => response.json())
    .catch(error => { throw error; });
}
```

### Type-Safe Event Emitters
```typescript
type EventMap = {
  'user:login': { userId: string; timestamp: Date };
  'user:logout': { userId: string };
  'error': Error;
};

class TypedEventEmitter<T extends Record<string, any>> {
  private handlers: Partial<{
    [K in keyof T]: Array<(data: T[K]) => void>;
  }> = {};

  on<K extends keyof T>(event: K, handler: (data: T[K]) => void) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event]!.push(handler);
  }

  emit<K extends keyof T>(event: K, data: T[K]) {
    this.handlers[event]?.forEach(handler => handler(data));
  }
}
```

## Type Guards

### User-Defined Type Guards
```typescript
// Type guard function
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value &&
    typeof (value as any).id === 'string' &&
    typeof (value as any).email === 'string'
  );
}

// Usage
function processValue(value: unknown) {
  if (isUser(value)) {
    // TypeScript knows value is User here
    console.log(value.email);
  }
}
```

## Common Anti-Patterns to Avoid

```typescript
// BAD: Using any
let data: any = fetchData();

// GOOD: Use unknown and type guards
let data: unknown = fetchData();
if (isValidData(data)) { /* ... */ }

// BAD: Type assertions without checks
const user = response as User;

// GOOD: Validate before asserting
if (isUser(response)) {
  const user = response;
}

// BAD: Callback hell
getData((data) => {
  processData(data, (processed) => {
    saveData(processed, (saved) => { });
  });
});

// GOOD: Async/await
const data = await getData();
const processed = await processData(data);
const saved = await saveData(processed);

// BAD: Magic strings/numbers
if (status === 404) { }

// GOOD: Named constants
if (status === HttpStatus.NOT_FOUND) { }
```

## Testing TypeScript Code

```typescript
// Use type-safe mocks
const mockUser: User = {
  id: '123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user'
};

// Type-safe test utilities
function createMockUser(overrides?: Partial<User>): User {
  return {
    id: '123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    ...overrides
  };
}
```

## Performance Considerations

- Use const assertions for literal types
- Prefer interfaces over type aliases for object types (better performance)
- Use mapped types sparingly in hot code paths
- Enable incremental compilation for large projects