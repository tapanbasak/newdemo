# MongoDB migration plan — Prompt Catch Up (Next.js)

This document analyzes moving Prompt Catch Up from **hardcoded data**, **static JSON**, and **browser localStorage** to **MongoDB** as the single source of truth.

---

## Current state (summary)

| Area | Where it lives today | Notes |
|------|----------------------|--------|
| **Agents** | `lib/data.ts` (`AGENTS`) | Large static array |
| **Groups** | `lib/data.ts` (`GROUPS`) | Counts partly computed in UI |
| **Scoreboards** | `lib/data.ts` (`SCOREBOARD_DATA`) | Three leaderboard cards |
| **Sidebar links** | `lib/data.ts` (`SIDEBAR_LINKS`) | Mix of routes + static labels |
| **Prompt catalog (seed)** | `public/assets/prompt-catalog-sample.json` | Loaded by catalog/detail pages |
| **View / role metadata** | `lib/view-meta.ts` | `AGENT_VIEW_META`, `CURRENT_USER_ROLE` |
| **Shared prompts** | API `POST /api/shared-prompts` | Mongo if `MONGODB_URI` set, else in-memory |
| **Upvotes** | API + **localStorage** (`pcu_user_id`, upvote records) | Client sends `userId`; Mongo/memory on server |
| **Comments** | API | Mongo/memory |
| **My Upvotes list** | Derived from upvote API (`getMyUpvotes`) | Not stored as its own collection today |

---

## Target state

- **One MongoDB database** (e.g. name from env: `MONGODB_DB=prompt_catchup`).
- **Collections** (see below) replace or back the above sources.
- **No reliance on localStorage** for durable upvotes (optional: keep anonymous session id only if you still need guest users without login).
- **App reads** from APIs or server components that query MongoDB; **writes** go through existing or new API routes.

---

## Suggested collections (high level)

Names are illustrative — adjust to your naming convention.

1. **`agents`**  
   - One document per agent/assistant row (id, name, description, status, category, `promptCount` or derive from prompts).
   - Replaces `lib/data.ts` `AGENTS`.

2. **`groups`** (or embed in `settings`)  
   - Group definitions: slug, display name, sort order.  
   - Optional: cached `count` if you materialize; else compute from agents/prompts.

3. **`scoreboards`**  
   - Either one document per scoreboard card with `rows[]`, or one document with `boards[]`.  
   - Replaces `SCOREBOARD_DATA`.

4. **`prompt_catalogs` / `prompts`**  
   - Option A: nested `prompts[]` per `agentId` (catalog document).  
   - Option B: flat `prompts` collection with `agentId` + indexes.  
   - Replaces `prompt-catalog-sample.json` and shared-prompt merge logic on the server.

5. **`shared_prompts`**  
   - Already conceptually aligned with current API; formalize schema (title, audience, createdBy, etc.).

6. **`upvotes`**  
   - Fields e.g. `userId` (or `subjectId`), `agentId`, `promptId`, `createdAt`. Unique index on `(userId, agentId, promptId)` to prevent duplicates.  
   - Replaces localStorage + current `upvotes` collection usage.

7. **`comments`**  
   - Already partially there; align with production indexes (`agentId`, `promptId`).

8. **`user_roles` / `profiles`** (optional)  
   - Store `CURRENT_USER_ROLE` and preferences instead of `lib/view-meta.ts` constants for “For my role”.

9. **`agent_view_meta`** (optional)  
   - `agentId`, `roleTags[]`, `usageCount` — or merge into `agents` documents.

10. **`app_settings`** (optional single doc)  
    - Sidebar links, feature flags, default view mode.

---

## Application changes (by area)

### 1. Configuration & connection

- Keep `MONGODB_URI` and `MONGODB_DB` in `.env` (already in `.env.example`).
- Ensure all environments (dev/staging/prod) use the same DB name for consistency.

### 2. Data loading — replace static imports

| File / area | Change |
|-------------|--------|
| `lib/data.ts` | Remove or shrink to types only; **or** export async loaders that read from DB (prefer API routes + `fetch` on client). |
| `public/assets/prompt-catalog-sample.json` | Deprecate after migration; optional keep as seed script only. |
| `lib/view-meta.ts` | Move to DB or merge into `agents`; API to return metadata for logged-in user. |

### 3. API routes (`app/api/**`)

- **`shared-prompts`**: Already inserts; ensure schema matches UI and add indexes.
- **`upvotes`**, **`upvotes/mine`**, **`upvotes/counts`**:  
  - Require authenticated user id from session/JWT (or stable server-side id), **not** only client-generated `userId` in body — unless you explicitly keep anonymous mode.
- **New (recommended)**:
  - `GET /api/agents` — list agents with filters.
  - `GET /api/groups` — group definitions + optional counts.
  - `GET /api/scoreboards` — leaderboard data.
  - `GET /api/catalog/[agentId]` — prompts for one agent (or paginate).
  - `POST/PATCH` admin or seed routes if you manage content from tools.

### 4. Client (`lib/client-api.ts`, pages)

- Replace `fetch('/assets/...')` with `fetch('/api/...')` for catalog.
- Remove **localStorage** keys used for upvotes (`getUserId` pattern) once server identity is defined; or keep only as anonymous fallback.
- Home page (`app/prompt-catchup/page.tsx`): load agents/groups/scoreboards from API when possible.

### 5. Auth & identity (critical for upvotes)

- Decide: **logged-in users only** vs **anonymous** upvotes.
- For Mongo-only upvotes: map each user to a stable `userId` from your auth provider and pass it server-side (session), not trust client-only IDs for anti-abuse.

### 6. Migration / seeding

- One-time script (Node or `mongoimport`) to:
  - Insert agents, groups, scoreboards from current `lib/data.ts` + JSON.
  - Optional: import `view-meta` into `agents` or `agent_view_meta`.
- Keep idempotency (upsert by `agentId` / slug).

### 7. Indexes (recommended)

- `upvotes`: compound unique `(userId, agentId, promptId)`; index `agentId + promptId` for counts.
- `prompts`: index `agentId`; text index if you need full-text search.
- `agents`: index `category`, `status`.

### 8. Operational concerns

- **Backups**, **retention**, **PII** in `createdBy`, comments.
- **Rate limiting** on upvote and share endpoints.
- **Admin UI** (optional) to edit scoreboards and agents without redeploying.

---

## Order of implementation (suggested)

1. Formalize Mongo schemas + indexes for `agents`, `groups`, `scoreboards`.
2. Seed from current static data.
3. Add read APIs; switch UI from static files to APIs.
4. Move prompt catalog JSON to `prompts` / `prompt_catalogs` collection; switch catalog/detail pages.
5. Unify upvotes on Mongo with real user identity; remove localStorage persistence for counts.
6. Move `view-meta` / role defaults to DB or user profile.
7. Remove deprecated static assets and dead code paths.

---

## MongoDB terminology (quick reference)

| Concept | In MongoDB | Rough SQL analogy |
|--------|------------|-------------------|
| **Database name** | e.g. `prompt_catchup` | Database name (same idea) |
| **Collection** | e.g. `agents`, `upvotes` | **Table** |
| **Document** | One JSON object in a collection | **Row** |
| **Field** | Key inside a document, e.g. `name`, `status` | **Column** (but schema can vary per document) |
| **Embedded array / subdocument** | Nested objects/arrays inside a document | Sometimes normalized into separate tables in SQL |

**Important:** MongoDB does **not** use the words “table” or “column” in its API — it uses **database**, **collection**, **document**, and **field**. People still say “table-like” when comparing to relational DBs.

**Difference “collection” vs “database name”:**

- **Database name** = the top-level namespace (like a database in PostgreSQL/MySQL). You connect to a URI and often specify **which database** to use (`MONGODB_DB`).
- **Collection** = a **named bucket of documents inside that database**. Multiple collections live under one database (e.g. `prompt_catchup.agents`, `prompt_catchup.upvotes`).

---

## Clarification you asked

- **Mongo collection vs “normal database name”:**  
  - **Database name** = which database (e.g. `prompt_catchup`).  
  - **Collection** = a **table-like** set of documents **inside** that database — not the same as the database name.

- **In Mongo, “tables” are called:** **collections**.

- **“Table columns” are called:** **fields** (properties on each document).

---

*Generated for planning; adjust collection names and fields to match your org’s standards.*
