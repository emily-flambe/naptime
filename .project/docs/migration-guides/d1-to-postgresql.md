# Migrating from D1 (SQLite) to PostgreSQL

This guide covers migrating from Cloudflare D1 (using raw SQL) to PostgreSQL across different deployment platforms.

## Why Migrate?

**D1 (SQLite) is great for:**
- Edge deployment with Cloudflare Workers
- Simple applications
- Read-heavy workloads
- Zero configuration
- Raw SQL simplicity

**PostgreSQL is better for:**
- Complex queries and relationships
- Concurrent writes
- Advanced features (JSON, full-text search, extensions)
- Legacy application compatibility
- Multi-region replication
- Existing PostgreSQL codebases

## PostgreSQL Provider Options

### 1. Neon (Recommended for Cloudflare Workers)
- **Pros**: Serverless, scales to zero, great Cloudflare Workers support
- **Cons**: Cold starts, connection limits on free tier
- **Pricing**: Free tier with 0.5 GB storage

### 2. Supabase
- **Pros**: Includes auth, realtime, storage
- **Cons**: More complex, overkill for simple apps
- **Pricing**: Free tier with 500 MB database

### 3. PlanetScale (MySQL-compatible)
- **Pros**: Excellent scaling, branching
- **Cons**: MySQL not PostgreSQL
- **Pricing**: Free tier discontinued

### 4. Railway
- **Pros**: Simple setup, good DX
- **Cons**: Can get expensive
- **Pricing**: $5/month + usage

### 5. Render
- **Pros**: Managed PostgreSQL, automatic backups
- **Cons**: Free tier databases deleted after 90 days
- **Pricing**: Free tier available

## Migration Steps by Platform

### Cloudflare Workers + Neon (Raw SQL)

#### 1. Set up Neon
```bash
# Sign up at https://neon.tech
# Create a new project and database
# Copy your connection string (looks like: postgresql://user:pass@host/db)
```

#### 2. Install Dependencies
```bash
npm install @neondatabase/serverless
```

#### 3. Update Schema (SQL Changes)

The main differences between D1 (SQLite) and PostgreSQL SQL:

**D1 Schema (SQLite):**
```sql
-- db/schema.sql (current)
CREATE TABLE todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_todos_completed ON todos(completed);
CREATE INDEX idx_todos_created_at ON todos(created_at DESC);
```

**PostgreSQL Schema:**
```sql
-- db/schema.postgresql.sql (new)
CREATE TABLE todos (
  id SERIAL PRIMARY KEY,                      -- SERIAL instead of INTEGER AUTOINCREMENT
  text TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,   -- BOOLEAN instead of INTEGER
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), -- TIMESTAMP instead of INTEGER
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_todos_completed ON todos(completed);
CREATE INDEX idx_todos_created_at ON todos(created_at DESC);

-- Optional: Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_todos_updated_at BEFORE UPDATE
    ON todos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 4. Update Worker Code

**Current D1 Implementation:**
```typescript
// worker/index.ts (current)
import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Get all todos
app.get('/api/todos', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM todos ORDER BY created_at DESC'
  ).all<Todo>();
  
  // Convert SQLite integers to booleans
  const todos = results.map(todo => ({
    ...todo,
    completed: todo.completed === 1
  }));
  
  return c.json(todos);
});

// Create todo
app.post('/api/todos', async (c) => {
  const body = await c.req.json<{ text: string }>();
  const now = Math.floor(Date.now() / 1000);
  
  const result = await c.env.DB.prepare(
    'INSERT INTO todos (text, completed, created_at, updated_at) VALUES (?, ?, ?, ?)'
  ).bind(body.text, 0, now, now).run();
  
  return c.json({ id: result.meta.last_row_id, ...body });
});
```

**PostgreSQL Implementation with Neon:**
```typescript
// worker/index.ts (PostgreSQL version)
import { Hono } from 'hono';
import { neon } from '@neondatabase/serverless';

type Bindings = {
  DATABASE_URL: string;  // Changed from DB: D1Database
};

const app = new Hono<{ Bindings: Bindings }>();

// Get all todos
app.get('/api/todos', async (c) => {
  const sql = neon(c.env.DATABASE_URL);
  
  const todos = await sql`
    SELECT * FROM todos ORDER BY created_at DESC
  `;
  
  // No conversion needed - PostgreSQL returns proper booleans
  return c.json(todos);
});

// Create todo
app.post('/api/todos', async (c) => {
  const body = await c.req.json<{ text: string }>();
  const sql = neon(c.env.DATABASE_URL);
  
  const [newTodo] = await sql`
    INSERT INTO todos (text) 
    VALUES (${body.text})
    RETURNING *
  `;
  
  return c.json(newTodo, 201);
});

// Update todo
app.put('/api/todos/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<{ text?: string; completed?: boolean }>();
  const sql = neon(c.env.DATABASE_URL);
  
  // Build dynamic update
  const updates = [];
  if (body.text !== undefined) updates.push(sql`text = ${body.text}`);
  if (body.completed !== undefined) updates.push(sql`completed = ${body.completed}`);
  
  const [updated] = await sql`
    UPDATE todos 
    SET ${sql(updates)}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  
  return c.json(updated);
});

// Delete todo
app.delete('/api/todos/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const sql = neon(c.env.DATABASE_URL);
  
  const result = await sql`
    DELETE FROM todos WHERE id = ${id}
  `;
  
  return c.json({ message: 'Deleted' });
});
```

#### 5. Update Environment
```bash
# .dev.vars
DATABASE_URL=postgresql://user:password@host.neon.tech/database

# For production, add via Wrangler:
wrangler secret put DATABASE_URL
```

### Vercel + Vercel Postgres (Raw SQL)

#### 1. Set up Vercel Postgres
```bash
# In Vercel Dashboard:
# 1. Go to Storage tab
# 2. Create PostgreSQL database
# 3. Connect to your project
```

#### 2. Install Dependencies
```bash
npm install @vercel/postgres
```

#### 3. API Routes (Next.js App Router)
```typescript
// app/api/todos/route.ts
import { sql } from '@vercel/postgres';

export async function GET() {
  const { rows } = await sql`
    SELECT * FROM todos ORDER BY created_at DESC
  `;
  return Response.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { rows } = await sql`
    INSERT INTO todos (text) 
    VALUES (${body.text})
    RETURNING *
  `;
  return Response.json(rows[0], { status: 201 });
}
```

### Netlify + Supabase (Raw SQL)

#### 1. Set up Supabase
```bash
# Sign up at https://supabase.com
# Create new project
# Go to Settings > Database
# Copy connection string
```

#### 2. Install Dependencies
```bash
npm install postgres
```

#### 3. Netlify Functions
```typescript
// netlify/functions/todos.ts
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: 'require',
});

export const handler = async (event: any) => {
  if (event.httpMethod === 'GET') {
    const todos = await sql`
      SELECT * FROM todos ORDER BY created_at DESC
    `;
    return {
      statusCode: 200,
      body: JSON.stringify(todos),
    };
  }
  
  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body);
    const [newTodo] = await sql`
      INSERT INTO todos (text) 
      VALUES (${body.text})
      RETURNING *
    `;
    return {
      statusCode: 201,
      body: JSON.stringify(newTodo),
    };
  }
};
```

### Railway/Render (Traditional Node.js with Raw SQL)

#### 1. Standard PostgreSQL Connection
```typescript
// server.ts
import express from 'express';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const app = express();
app.use(express.json());

app.get('/api/todos', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM todos ORDER BY created_at DESC'
  );
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

app.put('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { text, completed } = req.body;
  
  const result = await pool.query(
    'UPDATE todos SET text = $1, completed = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    [text, completed, id]
  );
  res.json(result.rows[0]);
});

app.delete('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM todos WHERE id = $1', [id]);
  res.json({ message: 'Deleted' });
});

app.listen(process.env.PORT || 3000);
```

## Data Migration

### Export from D1
```bash
# Export data from D1 to JSON
wrangler d1 execute app-database --command "SELECT * FROM todos" > todos_backup.json

# Or export as SQL inserts
wrangler d1 execute app-database --command "
  SELECT 'INSERT INTO todos (text, completed, created_at, updated_at) VALUES (' || 
    quote(text) || ', ' ||
    CASE completed WHEN 1 THEN 'true' ELSE 'false' END || ', ' ||
    'to_timestamp(' || created_at || '), ' ||
    'to_timestamp(' || updated_at || '));'
  FROM todos
" > todos_inserts.sql
```

### Import to PostgreSQL

#### Option 1: Direct SQL Import
```sql
-- First, create the table
CREATE TABLE todos (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Then run the generated inserts
-- Or manually convert the data:
INSERT INTO todos (text, completed, created_at, updated_at) VALUES
  ('Task 1', false, to_timestamp(1699000000), to_timestamp(1699000000)),
  ('Task 2', true, to_timestamp(1699000001), to_timestamp(1699000001));
```

#### Option 2: Migration Script
```typescript
// migrate-data.ts
import { neon } from '@neondatabase/serverless';
import oldData from './todos_backup.json';

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  for (const todo of oldData) {
    // Convert SQLite integers to PostgreSQL types
    const completed = todo.completed === 1;
    const createdAt = new Date(todo.created_at * 1000);
    const updatedAt = new Date(todo.updated_at * 1000);
    
    await sql`
      INSERT INTO todos (text, completed, created_at, updated_at)
      VALUES (${todo.text}, ${completed}, ${createdAt}, ${updatedAt})
    `;
  }
  console.log(`Migrated ${oldData.length} todos`);
}

migrate().catch(console.error);
```

## Key Differences: D1 vs PostgreSQL

### Data Types
| D1 (SQLite) | PostgreSQL | Notes |
|-------------|------------|-------|
| INTEGER (0/1) | BOOLEAN | Use true/false in PostgreSQL |
| INTEGER (timestamp) | TIMESTAMP | PostgreSQL has native datetime |
| INTEGER PRIMARY KEY AUTOINCREMENT | SERIAL PRIMARY KEY | Auto-increment syntax differs |
| TEXT | TEXT | Same |
| strftime('%s', 'now') | NOW() | Different time functions |

### Query Differences

**Parameterized Queries:**
```javascript
// D1
await db.prepare('SELECT * FROM todos WHERE id = ?').bind(id).first();

// PostgreSQL (Neon)
await sql`SELECT * FROM todos WHERE id = ${id}`;

// PostgreSQL (pg library)
await pool.query('SELECT * FROM todos WHERE id = $1', [id]);
```

**Boolean Handling:**
```javascript
// D1 - must convert
completed: todo.completed === 1

// PostgreSQL - native boolean
completed: todo.completed
```

**Timestamps:**
```javascript
// D1 - Unix timestamp as integer
const now = Math.floor(Date.now() / 1000);

// PostgreSQL - native timestamp
// Handled automatically with DEFAULT NOW()
```

## Performance Considerations

### Connection Strategies

**Cloudflare Workers**: Must use HTTP-based drivers
```typescript
// ✅ Good - HTTP-based
import { neon } from '@neondatabase/serverless';

// ❌ Bad - Needs persistent connection
import { Pool } from 'pg';  // Won't work in Workers!
```

**Traditional Servers**: Use connection pooling
```typescript
const pool = new Pool({
  max: 20,  // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Query Optimization

**Add Indexes:**
```sql
-- Same as D1, but PostgreSQL has more index types
CREATE INDEX idx_todos_completed ON todos(completed);
CREATE INDEX idx_todos_created_at ON todos(created_at DESC);

-- PostgreSQL-specific optimizations
CREATE INDEX idx_todos_text_search ON todos USING gin(to_tsvector('english', text));
```

**Use EXPLAIN:**
```sql
-- PostgreSQL provides detailed query plans
EXPLAIN ANALYZE SELECT * FROM todos WHERE completed = false;
```

## Cost Comparison

| Provider | Free Tier | Paid Starting | Best For |
|----------|-----------|---------------|----------|
| D1 | 5GB, 10M rows | $0.75/GB | Cloudflare Workers only |
| Neon | 0.5GB, 3 databases | $19/month | Serverless, Workers |
| Supabase | 500MB, 2 projects | $25/month | Full-stack apps |
| Vercel Postgres | 256MB | $15/month | Vercel deployments |
| Railway | Trial credits | $5/month | Traditional hosting |

## Common Gotchas

1. **Timestamps**: D1 uses Unix integers, PostgreSQL uses TIMESTAMP type
2. **Booleans**: D1 uses 0/1, PostgreSQL uses true/false
3. **Auto-increment**: Different syntax (AUTOINCREMENT vs SERIAL)
4. **Connections**: Workers can't maintain persistent connections
5. **Prepared Statements**: Different syntax across libraries
6. **Case Sensitivity**: PostgreSQL converts unquoted identifiers to lowercase

## Testing the Migration

```typescript
// test-connection.ts
import { neon } from '@neondatabase/serverless';

async function testConnection() {
  const sql = neon(process.env.DATABASE_URL!);
  
  try {
    // Test connection
    const [time] = await sql`SELECT NOW() as current_time`;
    console.log('✅ Connected to PostgreSQL:', time);
    
    // Test todos table
    const todos = await sql`SELECT COUNT(*) as count FROM todos`;
    console.log('📊 Todos count:', todos[0].count);
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
}

testConnection();
```

## Rollback Plan

If you need to rollback to D1:

1. **Export PostgreSQL data:**
```sql
-- Export with compatible types
SELECT 
  id,
  text,
  CASE WHEN completed THEN 1 ELSE 0 END as completed,
  EXTRACT(EPOCH FROM created_at)::integer as created_at,
  EXTRACT(EPOCH FROM updated_at)::integer as updated_at
FROM todos;
```

2. **Import back to D1:**
```bash
# Create D1 schema
wrangler d1 execute app-database --local --file=./db/schema.sql

# Import data
wrangler d1 execute app-database --local --file=./rollback-data.sql
```

3. **Revert code changes:**
- Switch back to D1Database binding
- Remove PostgreSQL dependencies
- Restore integer/boolean conversions

## Conclusion

Migrating from D1 to PostgreSQL with raw SQL is straightforward. The main considerations are:

1. **Choose the right provider** based on your deployment platform
2. **Update SQL syntax** (SERIAL, BOOLEAN, TIMESTAMP, NOW())
3. **Use appropriate connection method** (HTTP for Workers, Pool for servers)
4. **Handle type conversions** during data migration
5. **Test thoroughly** with both schema and data

The easiest path for Cloudflare Workers is **Neon** with its HTTP-based driver, while traditional Node.js hosting works well with the standard `pg` library and connection pooling.