# Migrating from Cloudflare Workers to Other Platforms

This guide covers migrating from Cloudflare Workers to other deployment platforms like Vercel, Netlify, Railway, or traditional Node.js servers.

## Cloudflare-Specific Dependencies

The starter pack uses several Cloudflare-specific features that need to be replaced when migrating:

### 1. D1 Database (SQLite at the edge)
- **Cloudflare**: `D1Database` type and Wrangler bindings
- **Migration needed**: Replace with PostgreSQL, MySQL, or SQLite

### 2. Worker Runtime
- **Cloudflare**: Workers runtime with `Bindings` interface
- **Migration needed**: Express, Fastify, or platform-specific serverless functions

### 3. Types
- **Cloudflare**: `@cloudflare/workers-types` package
- **Migration needed**: Remove and use standard Node.js/platform types

## Platform-Specific Migration Guides

### Migrating to Vercel

#### 1. Remove Cloudflare Dependencies
```bash
npm uninstall @cloudflare/workers-types
```

#### 2. Update TypeScript Configuration
```json
// tsconfig.json - remove this line:
"types": ["@cloudflare/workers-types"],
```

#### 3. Convert Worker to Vercel Functions
```typescript
// api/todos/route.ts (Next.js App Router)
import { sql } from '@vercel/postgres'; // or your DB choice

export async function GET() {
  // Your database queries here
  const todos = await sql`SELECT * FROM todos ORDER BY created_at DESC`;
  return Response.json(todos.rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  // Your database insert here
  return Response.json(newTodo);
}
```

#### 4. Update Frontend API Calls
```typescript
// Update API_URL in .env
VITE_API_URL=/api  // For Next.js API routes
```

### Migrating to Netlify

#### 1. Remove Cloudflare Dependencies
```bash
npm uninstall @cloudflare/workers-types
```

#### 2. Convert to Netlify Functions
```typescript
// netlify/functions/todos.ts
import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const method = event.httpMethod;
  
  if (method === 'GET') {
    // Database query
    return {
      statusCode: 200,
      body: JSON.stringify(todos),
    };
  }
  
  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    // Database insert
    return {
      statusCode: 201,
      body: JSON.stringify(newTodo),
    };
  }
};
```

### Migrating to Express/Node.js

#### 1. Remove Cloudflare Dependencies
```bash
npm uninstall @cloudflare/workers-types
```

#### 2. Install Node.js Dependencies
```bash
npm install express cors dotenv
npm install --save-dev @types/express @types/cors
```

#### 3. Create Express Server
```typescript
// server.ts
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg'; // or your database choice

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Routes
app.get('/api/todos', async (req, res) => {
  const result = await pool.query('SELECT * FROM todos ORDER BY created_at DESC');
  res.json(result.rows);
});

app.post('/api/todos', async (req, res) => {
  const { text } = req.body;
  const result = await pool.query(
    'INSERT INTO todos (text) VALUES ($1) RETURNING *',
    [text]
  );
  res.status(201).json(result.rows[0]);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

#### 4. Update package.json Scripts
```json
{
  "scripts": {
    "start": "node dist/server.js",
    "dev:server": "tsx watch server.ts"
  }
}
```

### Migrating to Railway/Render

Similar to the Express/Node.js migration above, but with platform-specific configurations:

#### Railway
```toml
# railway.toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
```

#### Render
```yaml
# render.yaml
services:
  - type: web
    name: web-app
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
```

## Database Migration

See [D1 to PostgreSQL Migration Guide](./d1-to-postgresql.md) for detailed database migration instructions.

## Key Code Changes

### 1. Remove Cloudflare Types
```typescript
// Before (Cloudflare)
interface Bindings {
  DB: D1Database;
}

// After (Generic)
interface Config {
  database: DatabaseConnection; // Your DB type
}
```

### 2. Update Environment Variable Access
```typescript
// Before (Cloudflare Workers)
c.env.DB

// After (Node.js)
process.env.DATABASE_URL
```

### 3. Replace Hono with Express/Platform Router
```typescript
// Before (Hono)
import { Hono } from 'hono';
const app = new Hono<{ Bindings: Bindings }>();
app.get('/api/todos', async (c) => { ... });

// After (Express)
import express from 'express';
const app = express();
app.get('/api/todos', async (req, res) => { ... });
```

## Deployment Configuration

### Remove Cloudflare Files
- Delete `wrangler.toml`
- Remove `.wrangler/` directory
- Update `.gitignore` to remove Cloudflare-specific entries

### Add Platform-Specific Config
- **Vercel**: Add `vercel.json`
- **Netlify**: Add `netlify.toml`
- **Railway**: Add `railway.toml`
- **Heroku**: Add `Procfile`

## Testing After Migration

1. **Update environment variables** for your new platform
2. **Test database connections** with new provider
3. **Verify API endpoints** are accessible
4. **Check CORS configuration** for your domain
5. **Run E2E tests** to ensure functionality

## Rollback Plan

If you need to rollback to Cloudflare Workers:

1. Reinstall Cloudflare dependencies:
   ```bash
   npm install --save-dev @cloudflare/workers-types
   ```

2. Restore `wrangler.toml` configuration

3. Convert API routes back to Hono/Worker format

4. Restore D1 database bindings

## Summary

The main areas requiring changes when migrating from Cloudflare Workers:

1. **Database**: D1 → PostgreSQL/MySQL/SQLite
2. **Runtime**: Workers → Node.js/Serverless Functions
3. **Types**: `@cloudflare/workers-types` → Platform types
4. **Router**: Hono → Express/Platform router
5. **Environment**: Bindings → Environment variables
6. **Deployment**: Wrangler → Platform CLI

While the starter pack is optimized for Cloudflare Workers, the architecture is designed to be portable. Most of the application code (React frontend, API structure) remains the same - only the infrastructure layer needs updating.