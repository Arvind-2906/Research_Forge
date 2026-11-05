# ResearchForge Database Migration & Schema Evolution Guide

**Migration Engine:** Prisma Migrate (Node.js)  
**Schema Path:** `backend/node-server/prisma/schema.prisma`  
**Database:** Neon PostgreSQL with `pgvector`  

---

## 1. Schema Migration Ownership Rule

To prevent conflicting schema evolutions and data corruption in a multi-language backend:
> **RULE:** The Node.js API backend (`backend/node-server`) **exclusively owns all database migrations**.  
> The Python AI Engine is strictly a consumer and must never execute DDL statements or manage migration tables.

---

## 2. Standard Migration Workflow

When adding new tables, columns, or relations to ResearchForge:

### Step 1: Update Prisma Schema
Edit `backend/node-server/prisma/schema.prisma`.

```prisma
// Example: Adding a new field to ResearchRun
model ResearchRun {
  // ... existing fields ...
  summaryTags  String[]  @default([])
}
```

### Step 2: Generate Migration in Development
In `backend/node-server`:
```bash
npx prisma migrate dev --name add_summary_tags_to_run
```
This command:
1. Compares `schema.prisma` against your Neon database schema.
2. Generates a new SQL migration file in `backend/node-server/prisma/migrations/YYYYMMDDHHMMSS_add_summary_tags_to_run/migration.sql`.
3. Executes the migration on the development database.
4. Automatically runs `prisma generate` to update the Prisma JavaScript client.

### Step 3: Production Deployment
In CI/CD or production containers, execute:
```bash
npx prisma migrate deploy
```
This applies any pending migrations without prompting or resetting data.

---

## 3. Working with `pgvector` in Prisma

Because Prisma does not have native schema primitives for vector column operations, the `postgresqlExtensions` preview feature is enabled:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector]
}
```

### 3.1. Vector Column Definitions
Vector columns are defined using `Unsupported`:
```prisma
model KnowledgeNode {
  id        String                       @id @default(cuid())
  label     String
  embedding Unsupported("vector(384)")?
  // ...
}
```

### 3.2. Adding HNSW / IVFFlat Vector Indexes
When indexing vector columns for high-throughput approximate nearest neighbor (ANN) search, create the index directly in the migration SQL file or execute it via Prisma:

```sql
-- Cosine Distance HNSW Index for 384-dimensional embeddings
CREATE INDEX IF NOT EXISTS "idx_knowledge_node_embedding"
ON "KnowledgeNode" USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS "idx_source_chunk_embedding"
ON "SourceChunk" USING hnsw (embedding vector_cosine_ops);
```

---

## 4. Zero-Downtime Best Practices

1. **Avoid Destructive Rename Operations**: Instead of renaming a column directly, add the new column, dual-write to both, backfill existing rows, and subsequently drop the old column in a later release.
2. **Nullable Columns for New Features**: Always assign `@default(...)` or make new columns optional (`?`) so existing rows remain valid.
3. **Index Creation with `CONCURRENTLY`**: For large production tables, add indexes concurrently to prevent table read/write locks:
   ```sql
   CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_event_run_seq" 
   ON "ResearchEvent" ("runId", "sequence");
   ```
4. **Prisma Client Regeneration**: Always execute `npx prisma generate` after pulling migrations to ensure your TypeScript/JavaScript IntelliSense matches the database schema.

