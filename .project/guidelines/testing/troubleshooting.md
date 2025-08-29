# Troubleshooting Guide

## Common Issues and Solutions

This guide covers common issues and their solutions for React 19, Vite 6, TypeScript 5.8, Tailwind CSS 4, and Cloudflare Workers deployment.

## Development Environment Issues

### Node.js Version Issues

**Problem**: Vite 6 fails to start with Node.js version error
```bash
Error: Vite requires Node.js version 20.19.0 or higher, but you are using v18.x.x
```

**Solution**:
```bash
# Install Node.js 22 (recommended)
nvm install 22
nvm use 22

# Or use Node.js 20.19+ (minimum)
nvm install 20.19.0
nvm use 20.19.0

# Verify version
node --version
```

**Prevention**: Update `.nvmrc` file:
```
22
```

### Vite 6 Configuration Issues

**Problem**: Vite fails to resolve TypeScript paths
```bash
Error: Failed to resolve import "@/components/Button"
```

**Solution**: Update `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

**Problem**: Vite dev server crashes on file changes
```bash
Error: EMFILE: too many open files
```

**Solution**: Increase file descriptor limit:
```bash
# macOS/Linux
ulimit -n 4096

# Or add to vite.config.ts
export default defineConfig({
  server: {
    watch: {
      usePolling: true,
      interval: 1000
    }
  }
})
```

### TypeScript 5.8 Issues

**Problem**: React 19 types not recognized
```typescript
// Error: Property 'useOptimistic' does not exist on type 'typeof React'
import { useOptimistic } from 'react'
```

**Solution**: Update `package.json` dependencies:
```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.8.0"
  }
}
```

**Problem**: TypeScript strict mode errors with React 19
```typescript
// Error: Type 'string | undefined' is not assignable to type 'string'
const [state, formAction] = useActionState(myAction, undefined)
```

**Solution**: Provide proper initial state:
```typescript
const [state, formAction] = useActionState(myAction, {
  success: false,
  message: '',
  data: null
})
```

**Problem**: Module resolution errors with absolute imports
```typescript
// Error: Cannot find module '@/types/user'
import { User } from '@/types/user'
```

**Solution**: Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": true
  }
}
```

## React 19 Specific Issues

### useOptimistic Hook Issues

**Problem**: Optimistic updates not reverting on error
```typescript
// Optimistic state stuck after server error
const [optimisticState, addOptimistic] = useOptimistic(state, reducer)
```

**Solution**: Implement proper error handling:
```typescript
async function handleAction(formData: FormData) {
  // Add optimistic update
  addOptimistic({ type: 'add', data: newItem })
  
  try {
    await serverAction(formData)
  } catch (error) {
    // Optimistic state will automatically revert
    // Show error message to user
    toast.error('Action failed. Please try again.')
  }
}
```

### useActionState Hook Issues

**Problem**: Form state not updating after submission
```typescript
const [state, formAction] = useActionState(submitForm, initialState)
```

**Solution**: Ensure server action returns proper state:
```typescript
async function submitForm(prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const result = await api.submit(formData)
    return {
      success: true,
      message: 'Form submitted successfully',
      data: result
    }
  } catch (error) {
    return {
      success: false,
      message: error.message,
      data: null
    }
  }
}
```

### useFormStatus Hook Issues

**Problem**: Form status not updating in nested components
```typescript
// Component not receiving form status updates
const { pending } = useFormStatus()
```

**Solution**: Ensure component is child of form:
```typescript
function SubmitButton() {
  const { pending, data, method, action } = useFormStatus()
  
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  )
}

function MyForm() {
  return (
    <form action={formAction}>
      <input name="email" type="email" />
      <SubmitButton /> {/* Must be inside form */}
    </form>
  )
}
```

## Tailwind CSS 4 Issues

**Problem**: Tailwind styles not loading
```bash
Error: Cannot resolve '@tailwindcss/vite'
```

**Solution**: Install Tailwind CSS 4 with Vite plugin:
```bash
npm install -D @tailwindcss/vite@next tailwindcss@next
```

Update `vite.config.ts`:
```typescript
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ]
})
```

**Problem**: Custom CSS not working with Tailwind 4
```css
/* Error: @apply directive not recognized */
.custom-button {
  @apply bg-blue-500 hover:bg-blue-600;
}
```

**Solution**: Use CSS custom properties:
```css
/* Use Tailwind 4's CSS-first approach */
.custom-button {
  background-color: theme(colors.blue.500);
  transition: background-color 0.2s;
}

.custom-button:hover {
  background-color: theme(colors.blue.600);
}
```

**Problem**: Tailwind IntelliSense not working
```bash
# No autocomplete for Tailwind classes
```

**Solution**: Update VS Code settings:
```json
{
  "tailwindCSS.experimental.configFile": "vite.config.ts",
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

## Testing Issues

### Vitest 3 Configuration Issues

**Problem**: Tests fail with module resolution errors
```bash
Error: Cannot resolve 'virtual:vitest/env'
```

**Solution**: Update `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts']
  }
})
```

**Problem**: React Testing Library 16 compatibility issues
```typescript
// Error: render is not a function
import { render } from '@testing-library/react'
```

**Solution**: Update test setup file:
```typescript
// src/test/setup.ts
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

afterEach(() => {
  cleanup()
})
```


### Playwright Issues

**Problem**: Playwright tests timing out
```bash
Error: Test timeout of 30000ms exceeded
```

**Solution**: Update Playwright configuration:
```typescript
// playwright.config.ts
export default defineConfig({
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  use: {
    actionTimeout: 10000,
    navigationTimeout: 30000
  }
})
```

**Problem**: Tests fail in CI/CD but pass locally
```bash
# Different behavior between local and CI
```

**Solution**: Use consistent test environment:
```typescript
export default defineConfig({
  use: {
    // Consistent viewport
    viewport: { width: 1280, height: 720 },
    
    // Disable animations for consistent screenshots
    launchOptions: {
      args: ['--disable-web-security', '--disable-dev-shm-usage']
    }
  },
  
  // Retry failed tests in CI
  retries: process.env.CI ? 2 : 0,
  
  // Use single worker in CI to avoid resource issues
  workers: process.env.CI ? 1 : undefined
})
```

## Cloudflare Workers Issues

### Deployment Issues

**Problem**: Worker deployment fails with build errors
```bash
Error: Build failed with exit code 1
```

**Solution**: Check `wrangler.toml` configuration:
```toml
#:schema node_modules/wrangler/config-schema.json
name = "my-app"
main = "dist/index.js"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]

[build]
command = "npm run build"

[[routes]]
pattern = "*"
zone_name = "example.com"
```

**Problem**: Environment variables not accessible
```typescript
// Error: env is undefined in worker
export default {
  async fetch(request, env) {
    const apiKey = env.API_KEY // undefined
  }
}
```

**Solution**: Properly define environment variables:
```toml
# wrangler.toml
[env.production.vars]
API_KEY = "your-api-key"
NODE_ENV = "production"

# Or use secrets for sensitive data
# wrangler secret put API_KEY
```

### Runtime Issues

**Problem**: Node.js APIs not working in Worker
```typescript
// Error: fs is not defined
import fs from 'fs'
```

**Solution**: Use Worker-compatible alternatives:
```typescript
// Instead of Node.js APIs, use Web APIs
const response = await fetch('https://api.example.com/data')
const data = await response.json()

// For file operations, use R2 storage
const object = await env.MY_BUCKET.get('file.json')
const content = await object?.text()
```

**Problem**: CORS errors in development
```bash
Error: Access to fetch blocked by CORS policy
```

**Solution**: Configure CORS in worker:
```typescript
function handleCORS(request: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
    'Access-Control-Max-Age': '86400',
  }
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  return corsHeaders
}

export default {
  async fetch(request: Request, env: Env) {
    const corsHeaders = handleCORS(request)
    
    // Handle your request
    const response = new Response('Hello World')
    
    // Add CORS headers to response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  }
}
```

## Authentication Issues (Auth0)

### Configuration Issues

**Problem**: Auth0 callback URL mismatch
```bash
Error: The redirect_uri MUST match the registered callback URL exactly
```

**Solution**: Update Auth0 dashboard and configuration:
```typescript
// src/lib/auth.ts
import { createAuth0Client } from '@auth0/auth0-spa-js'

export const auth0 = createAuth0Client({
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  authorizationParams: {
    redirect_uri: window.location.origin + '/callback',
    audience: import.meta.env.VITE_AUTH0_AUDIENCE
  }
})
```

**Problem**: Token refresh failing
```typescript
// Error: Unable to refresh token
const token = await getAccessTokenSilently()
```

**Solution**: Handle token refresh properly:
```typescript
import { useAuth0 } from '@auth0/auth0-react'

function useAuthenticatedFetch() {
  const { getAccessTokenSilently, loginWithRedirect } = useAuth0()
  
  return async (url: string, options: RequestInit = {}) => {
    try {
      const token = await getAccessTokenSilently()
      
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`
        }
      })
    } catch (error) {
      if (error.error === 'login_required') {
        await loginWithRedirect()
        return
      }
      throw error
    }
  }
}
```

## Performance Issues

### Bundle Size Issues

**Problem**: Large bundle sizes affecting performance
```bash
# Bundle analysis shows large chunks
chunk-vendor.js  1.2 MB
```

**Solution**: Implement code splitting:
```typescript
// Lazy load components
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Settings = lazy(() => import('@/pages/Settings'))

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  )
}

// Configure Vite for optimal chunking
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          auth: ['@auth0/auth0-react'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    }
  }
})
```

### Memory Leaks

**Problem**: Memory leaks with useEffect hooks
```typescript
// Memory leak: cleanup not implemented
useEffect(() => {
  const subscription = api.subscribe(callback)
  // Missing cleanup
}, [])
```

**Solution**: Implement proper cleanup:
```typescript
useEffect(() => {
  const controller = new AbortController()
  
  const fetchData = async () => {
    try {
      const response = await fetch('/api/data', {
        signal: controller.signal
      })
      const data = await response.json()
      setData(data)
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Fetch error:', error)
      }
    }
  }
  
  fetchData()
  
  return () => {
    controller.abort()
  }
}, [])
```

## Build Issues

### Production Build Failures

**Problem**: Build fails with TypeScript errors
```bash
Error: Type checking failed
```

**Solution**: Fix TypeScript configuration and errors:
```bash
# Check TypeScript errors
npx tsc --noEmit

# Fix common issues
# 1. Update tsconfig.json for Vite
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": false,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  }
}
```

### Environment Variables

**Problem**: Environment variables not available in production
```typescript
// undefined in production build
const apiUrl = import.meta.env.VITE_API_URL
```

**Solution**: Ensure proper environment variable setup:
```bash
# .env.production
VITE_API_URL=https://api.production.com
VITE_AUTH0_DOMAIN=your-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
```

```typescript
// vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_AUTH0_DOMAIN: string
  readonly VITE_AUTH0_CLIENT_ID: string
  readonly VITE_AUTH0_AUDIENCE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

## Debugging Tools

### Development Tools

```bash
# Debug Vite build
DEBUG=vite:* npm run build

# Analyze bundle size
npm run build -- --mode analyze

# TypeScript compiler with watch mode
npx tsc --watch --noEmit

# Lint with fix
npm run lint -- --fix

# Test with coverage
npm run test -- --coverage

# E2E tests with headed mode
npm run test:e2e -- --headed
```

### Browser DevTools

- **React DevTools**: Debug React 19 components and hooks
- **Network Tab**: Check API calls and response times
- **Performance Tab**: Identify performance bottlenecks
- **Lighthouse**: Audit web vitals and best practices
- **Sources Tab**: Debug with breakpoints and source maps

### VS Code Extensions

```json
// .vscode/extensions.json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-playwright.playwright",
    "vitest.explorer"
  ]
}
```

This troubleshooting guide covers the most common issues you'll encounter with the modern tech stack. Keep it updated as new issues arise and solutions are discovered.