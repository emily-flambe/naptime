# React Coding Standards

## General Principles
- Functional components only - no class components
- Hooks for all state and side effects
- TypeScript for all components and props
- Accessibility is mandatory, not optional
- Performance optimization where measurable

## Component Patterns

### Basic Component Structure
```tsx
// ComponentName.tsx
import { memo, useCallback, useMemo } from 'react';
import type { FC, ReactNode } from 'react';

interface ComponentNameProps {
  children?: ReactNode;
  title: string;
  onAction?: (id: string) => void;
  className?: string;
}

export const ComponentName: FC<ComponentNameProps> = memo(({
  children,
  title,
  onAction,
  className = '',
}) => {
  // Hooks at the top
  const [state, setState] = useState<string>('');
  
  // Memoized values
  const computedValue = useMemo(() => {
    return expensiveComputation(state);
  }, [state]);
  
  // Callbacks
  const handleClick = useCallback((id: string) => {
    onAction?.(id);
  }, [onAction]);
  
  // Effects
  useEffect(() => {
    // Effect logic
    return () => {
      // Cleanup
    };
  }, [dependency]);
  
  // Early returns for edge cases
  if (!title) {
    return null;
  }
  
  // Main render
  return (
    <div className={`component-name ${className}`}>
      <h2>{title}</h2>
      {children}
    </div>
  );
});

ComponentName.displayName = 'ComponentName';
```

### File Organization
```
components/
├── Button/
│   ├── Button.tsx           # Component implementation
│   ├── Button.test.tsx      # Tests
│   ├── Button.stories.tsx   # Storybook stories
│   ├── Button.module.css    # Styles (if CSS modules)
│   └── index.ts            # Barrel export
```

## Hooks Rules and Patterns

### Custom Hook Structure
```tsx
// hooks/useExample.ts
import { useState, useEffect, useCallback } from 'react';

interface UseExampleOptions {
  initialValue?: string;
  onUpdate?: (value: string) => void;
}

interface UseExampleReturn {
  value: string;
  isLoading: boolean;
  error: Error | null;
  updateValue: (newValue: string) => Promise<void>;
  reset: () => void;
}

export function useExample({
  initialValue = '',
  onUpdate,
}: UseExampleOptions = {}): UseExampleReturn {
  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const updateValue = useCallback(async (newValue: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Async operation
      await apiCall(newValue);
      setValue(newValue);
      onUpdate?.(newValue);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [onUpdate]);
  
  const reset = useCallback(() => {
    setValue(initialValue);
    setError(null);
    setIsLoading(false);
  }, [initialValue]);
  
  return {
    value,
    isLoading,
    error,
    updateValue,
    reset,
  };
}
```

### Hook Dependencies
```tsx
// GOOD: All dependencies listed
useEffect(() => {
  fetchData(userId, filters);
}, [userId, filters]);

// GOOD: Stable reference with useCallback
const stableCallback = useCallback((data: Data) => {
  processData(data, options);
}, [options]);

// BAD: Missing dependencies
useEffect(() => {
  fetchData(userId); // ESLint will warn
}, []); 

// BAD: Unstable object/array in dependencies
useEffect(() => {
  fetchData({ id: userId }); // Creates new object every render
}, [{ id: userId }]); // Don't do this!
```

## State Management Patterns

### Local State with useState
```tsx
// Simple state
const [count, setCount] = useState(0);

// Complex state with discriminated unions
type FormState = 
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; data: FormData }
  | { status: 'error'; error: string };

const [formState, setFormState] = useState<FormState>({ status: 'idle' });
```

### Context for Global State
```tsx
// contexts/ThemeContext.tsx
interface ThemeContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);
  
  const value = useMemo(
    () => ({ theme, toggleTheme }),
    [theme, toggleTheme]
  );
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
```

### Reducer for Complex State
```tsx
// Reducer with TypeScript
type State = {
  count: number;
  history: number[];
};

type Action = 
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'reset' }
  | { type: 'set'; payload: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return {
        count: state.count + 1,
        history: [...state.history, state.count + 1],
      };
    case 'decrement':
      return {
        count: state.count - 1,
        history: [...state.history, state.count - 1],
      };
    case 'reset':
      return { count: 0, history: [] };
    case 'set':
      return {
        count: action.payload,
        history: [...state.history, action.payload],
      };
    default:
      return state;
  }
}
```

## Performance Optimization

### When to Use memo()
```tsx
// Use memo for expensive renders or frequent parent updates
export const ExpensiveComponent = memo<Props>(({ data, onUpdate }) => {
  // Complex rendering logic
  return <ComplexVisualization data={data} />;
});

// Don't overuse - React is fast by default
// Profile first, optimize second
```

### useMemo and useCallback
```tsx
// useMemo for expensive computations
const sortedData = useMemo(() => {
  return data.sort((a, b) => b.score - a.score);
}, [data]);

// useCallback for stable function references
const handleSubmit = useCallback((formData: FormData) => {
  onSubmit(formData);
}, [onSubmit]);

// Don't wrap primitives
// BAD: const value = useMemo(() => x + y, [x, y]);
// GOOD: const value = x + y;
```

### Code Splitting
```tsx
// Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

## Accessibility Requirements

### ARIA and Semantic HTML
```tsx
// Use semantic HTML
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/home">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>

// Proper button usage
<button 
  onClick={handleClick}
  aria-label="Close dialog"
  aria-pressed={isPressed}
>
  <CloseIcon aria-hidden="true" />
</button>

// Form accessibility
<label htmlFor="email">
  Email Address
  <input 
    id="email"
    type="email"
    required
    aria-describedby="email-error"
  />
</label>
{error && (
  <span id="email-error" role="alert">
    {error}
  </span>
)}
```

### Keyboard Navigation
```tsx
// Handle keyboard events
function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault();
      handleAction();
      break;
    case 'Escape':
      handleClose();
      break;
  }
}

// Focus management
const inputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  if (isOpen) {
    inputRef.current?.focus();
  }
}, [isOpen]);
```

## Error Handling

### Error Boundaries
```tsx
// ErrorBoundary.tsx
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ComponentType<{ error: Error }> },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error reporting service
  }
  
  render() {
    if (this.state.hasError && this.state.error) {
      const Fallback = this.props.fallback || DefaultErrorFallback;
      return <Fallback error={this.state.error} />;
    }
    
    return this.props.children;
  }
}
```

### Error States in Components
```tsx
function DataDisplay() {
  const { data, isLoading, error } = useData();
  
  if (isLoading) {
    return <Skeleton />;
  }
  
  if (error) {
    return (
      <Alert severity="error" role="alert">
        <AlertTitle>Error loading data</AlertTitle>
        {error.message}
      </Alert>
    );
  }
  
  if (!data || data.length === 0) {
    return (
      <EmptyState 
        message="No data available"
        action={<Button onClick={refetch}>Try Again</Button>}
      />
    );
  }
  
  return <DataList data={data} />;
}
```

## Testing Patterns

### Component Testing
```tsx
// Component.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Component', () => {
  it('should handle user interaction', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(
      <Component 
        title="Test Title"
        onAction={handleClick}
      />
    );
    
    // Query elements
    const button = screen.getByRole('button', { name: /submit/i });
    const input = screen.getByLabelText(/email/i);
    
    // User interactions
    await user.type(input, 'test@example.com');
    await user.click(button);
    
    // Assertions
    expect(handleClick).toHaveBeenCalledWith('test@example.com');
    
    // Wait for async updates
    await waitFor(() => {
      expect(screen.getByText(/success/i)).toBeInTheDocument();
    });
  });
  
  it('should be accessible', () => {
    const { container } = render(<Component title="Test" />);
    expect(container).toBeAccessible(); // Using jest-axe
  });
});
```

### Hook Testing
```tsx
// useExample.test.ts
import { renderHook, act } from '@testing-library/react';
import { useExample } from './useExample';

describe('useExample', () => {
  it('should update value', async () => {
    const { result } = renderHook(() => useExample());
    
    expect(result.current.value).toBe('');
    
    await act(async () => {
      await result.current.updateValue('new value');
    });
    
    expect(result.current.value).toBe('new value');
  });
});
```

## Common Anti-Patterns to Avoid

```tsx
// BAD: Direct DOM manipulation
document.getElementById('myDiv').style.color = 'red';

// GOOD: Use React state
const [color, setColor] = useState('red');
return <div style={{ color }}>Content</div>;

// BAD: Array index as key in dynamic lists
items.map((item, index) => <Item key={index} />);

// GOOD: Use stable, unique IDs
items.map(item => <Item key={item.id} />);

// BAD: Inline function definitions in render
<button onClick={() => handleClick(id)}>Click</button>

// GOOD: Use useCallback for stable reference
const onClick = useCallback(() => handleClick(id), [id]);
<button onClick={onClick}>Click</button>

// BAD: Modifying state directly
state.items.push(newItem);
setState(state);

// GOOD: Create new state
setState(prev => ({
  ...prev,
  items: [...prev.items, newItem]
}));
```

## Build and Bundle Considerations

- Keep bundle size optimized for fast initial load
- Use dynamic imports for route-based code splitting
- Analyze bundle with `npm run build -- --analyze`
- Tree-shake unused code with proper ES modules
- Optimize images with next-gen formats (WebP, AVIF)