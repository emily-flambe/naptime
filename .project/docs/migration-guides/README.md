# Migration Guides

This directory contains guides for migrating between different tools and technologies. These are reference documents for when you need to switch providers or technologies.

## Available Guides

### Database Migrations
- **[D1 to PostgreSQL](./d1-to-postgresql.md)** - Migrate from Cloudflare D1 (SQLite) to PostgreSQL
  - Covers Neon, Supabase, Vercel Postgres, Railway, Render
  - Platform-specific instructions for Cloudflare Workers, Vercel, Netlify
  - Data migration strategies and rollback plans

### Future Guides (To Be Added)
- **Vite to Next.js** - Migrating from Vite to Next.js
- **Vite to Webpack** - Migrating from Vite to traditional Webpack
- **Jest to Vitest** - Migrating test suites
- **Cloudflare to Vercel** - Deployment platform migration
- **Cloudflare to AWS** - Moving to AWS Lambda
- **Tailwind to CSS Modules** - Styling approach migration
- **React Router to App Router** - Next.js App Router migration

## When to Use These Guides

These guides are for **specific migration scenarios** only. Don't read them unless you're actually planning a migration.

## Contributing

When adding a new migration guide:
1. Create a descriptive filename: `from-to-target.md`
2. Include cost comparisons
3. Provide rollback strategies
4. Test all migration steps
5. Add platform-specific sections