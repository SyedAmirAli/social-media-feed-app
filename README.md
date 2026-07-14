# Social Feed Web App

Next.js social feed with PostgreSQL (Prisma), Cloudflare R2 uploads, JWT auth, and TanStack Query.

This guide walks a new developer from a fresh clone to a running local app with no extra tribal knowledge.

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [Clone the repository](#2-clone-the-repository)
3. [Install dependencies](#3-install-dependencies)
4. [Environment variables](#4-environment-variables)
5. [PostgreSQL setup](#5-postgresql-setup)
6. [Cloudflare R2 setup](#6-cloudflare-r2-setup)
7. [Prisma configuration](#7-prisma-configuration)
8. [Prisma Client](#8-prisma-client)
9. [TanStack Query](#9-tanstack-query)
10. [Database migrate, generate, and verify](#10-database-migrate-generate-and-verify)
11. [Run the development server](#11-run-the-development-server)
12. [Create your first account](#12-create-your-first-account)
13. [Useful scripts](#13-useful-scripts)
14. [Project structure (key paths)](#14-project-structure-key-paths)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Prerequisites

Install these before continuing:

| Tool | Version / notes |
|------|-----------------|
| **Node.js** | 20+ recommended (18+ minimum) |
| **Yarn** | Classic v1 (`yarn -v` → `1.x`). This repo ships a `yarn.lock`. |
| **TypeScript** | Pinned to **5.9.x** in `package.json`. Next.js 16.2 does not yet support TypeScript 7 for `next build` (missing JS compiler API). |
| **PostgreSQL** | Local install **or** a hosted instance (Neon, Supabase, Prisma Postgres, Railway, etc.) |
| **Cloudflare account** | For R2 object storage (avatars & post images) |
| **Git** | To clone the repository |

Optional but helpful:

- [Cloudflare Wrangler](https://developers.cloudflare.com/workers/wrangler/) (CLI R2 ops)
- A GUI for Postgres (TablePlus, pgAdmin, Prisma Studio)

Check versions:

```bash
node -v
yarn -v
```

---

## 2. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL> web
cd web
```

Replace `<YOUR_REPOSITORY_URL>` with the team’s GitHub/GitLab remote.

---

## 3. Install dependencies

This project uses **Yarn**:

```bash
yarn install
```

That installs Next.js, React, Prisma, `@prisma/adapter-pg`, TanStack Query, AWS S3 SDK (for R2), jose (JWT), and other app packages.

> Generated Prisma Client lives under `prisma/generated/` and is **gitignored**. You must run `yarn db:generate` after install (covered below).

---

## 4. Environment variables

### 4.1 Create your local `.env`

```bash
cp .env.example .env
```

Edit `.env` and replace every placeholder with real values. Comments in `.env.example` explain each variable.

### 4.2 Variable reference

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string for Prisma CLI and runtime |
| `PRISMA_API_KEY` | No | Only if you use Prisma Data Platform / Prisma Postgres API features |
| `R2_TOKEN_VALUE` | No* | Cloudflare API token (optional; S3 path uses access keys below) |
| `R2_ACCESS_KEY_ID` | Yes | R2 S3 Access Key ID |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 S3 Secret Access Key |
| `R2_ENDPOINT` | Yes | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `R2_BUCKET` | Yes | R2 bucket name |
| `R2_BUCKET_PREFIX` | Yes | Folder prefix inside the bucket (e.g. `appifylab`) |
| `ASSETS_BASE_URL` | Yes | Public origin that serves R2 files in the browser |
| `JWT_SECRET` | Yes | Secret for signing/verifying auth JWTs |
| `JWT_EXPIRATION` | Yes | JWT lifetime (default `30d`) |

\*Not required for the app’s `Bucket` S3 client; keep it if your team uses Cloudflare API automation.

### 4.3 Generate a JWT secret

```bash
openssl rand -base64 32
```

Paste the output into `JWT_SECRET` in `.env`.

---

## 5. PostgreSQL setup

### Option A — Local PostgreSQL

1. Install and start Postgres.
2. Create a database:

```bash
createdb social_feed
```

3. Set in `.env`:

```env
DATABASE_URL="postgres://postgres:YOUR_PASSWORD@localhost:5432/social_feed?schema=public"
```

Adjust user/password/host/port to match your install.

### Option B — Hosted Postgres

1. Create a project in Neon, Supabase, Prisma Postgres, Railway, etc.
2. Copy the connection string (usually with `sslmode=require`).
3. Paste it into `DATABASE_URL`.

Prisma config (`prisma.config.ts`) loads `DATABASE_URL` via `dotenv` for migrations and seed. The app runtime reads the same variable through `src/config/dotenv.ts` → `src/lib/prisma.ts`.

---

## 6. Cloudflare R2 setup

Uploads (avatars, post images) go through the S3-compatible R2 API implemented in `src/lib/r2/bucket.ts`.

### 6.1 Create a bucket

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com/) → **R2 Object Storage**.
2. **Create bucket** (e.g. `social-feed-dev`).
3. Set `R2_BUCKET` to that exact name.

### 6.2 Create an R2 API token (S3 credentials)

1. R2 → **Manage R2 API Tokens** → **Create API token**.
2. Permissions: **Object Read & Write** (account-wide or limited to your bucket).
3. Create the token and copy:
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY` (shown once)

### 6.3 Endpoint

1. In R2 overview / account settings, find your **Account ID**.
2. Set:

```env
R2_ENDPOINT="https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com"
```

Do **not** put the bucket name in the endpoint path.

### 6.4 Prefix

```env
R2_BUCKET_PREFIX="appifylab"
```

All uploads are stored under this virtual directory, e.g. `appifylab/posts/<file>.png`. The app persists the **full key** (including prefix) in the database.

### 6.5 Public access for `ASSETS_BASE_URL`

The UI builds image URLs with `asset()` (`src/config/utils.ts`):

```text
${ASSETS_BASE_URL}/${R2_BUCKET_PREFIX}/path/to/file
```

Pick one public access strategy:

**Recommended — Custom domain**

1. R2 bucket → **Settings** → **Custom Domains** → connect a domain/subdomain.
2. Set:

```env
ASSETS_BASE_URL="https://cdn.yourdomain.com"
```

**Alternative — r2.dev public URL**

1. Enable public access / r2.dev subdomain for the bucket.
2. Set `ASSETS_BASE_URL` to that public base URL (no trailing slash).

Without a working public base URL, uploads may succeed but avatars/post images will fail to render.

### 6.6 CORS (if the browser uploads directly)

This app primarily uploads from Next.js API routes (server-side). If you later upload from the browser straight to R2, add a CORS policy on the bucket allowing your local origin (`http://localhost:3000`) and required methods/headers.

---

## 7. Prisma configuration

| Piece | Location | Role |
|-------|----------|------|
| Schema | `prisma/schema.prisma` | Models (`User`, `Post`, `Comment`, `React`, …) |
| Config | `prisma.config.ts` | Datasource URL, migrations path, seed command |
| Migrations | `prisma/migrations/` | SQL history applied to your DB |
| Generated client | `prisma/generated/` | Output of `prisma generate` (gitignored) |

`prisma.config.ts` (summary):

- Loads `.env` via `import "dotenv/config"`.
- Reads `DATABASE_URL` with `env("DATABASE_URL")`.
- Seeds with `tsx prisma/seed.ts`.
- Uses the PostgreSQL provider declared in the schema.

You do **not** need a second Prisma config file. Keep a correct `.env` and the CLI will pick it up.

---

## 8. Prisma Client

Runtime client setup lives in `src/lib/prisma.ts`:

1. Reads `DATABASE_URL` from `src/config/dotenv.ts`.
2. Creates a `PrismaPg` driver adapter (`@prisma/adapter-pg`).
3. Instantiates `PrismaClient` from `prisma/generated/client` with that adapter.
4. Caches the client on `globalThis` in development to avoid hot-reload connection leaks.

**After every clone / `yarn install` / schema change, regenerate the client:**

```bash
yarn db:generate
```

API routes and server code import:

```ts
import { prisma } from "@/lib/prisma";
```

Do not instantiate `PrismaClient` elsewhere unless you have a strong reason (seed/verify scripts are exceptions).

---

## 9. TanStack Query

Client-side and SSR data fetching use **TanStack Query v5**.

| Piece | Location |
|-------|----------|
| Query client factory | `src/lib/query-client.ts` |
| App provider | `src/components/Providers.tsx` |
| Root wiring | `src/app/layout.tsx` → `<Providers>` |
| SSR example | `src/app/(public)/page.tsx` (`prefetchInfiniteQuery` + `HydrationBoundary`) |

### Behavior (already configured)

- **Server:** `getQueryClient()` creates a **new** client per request.
- **Browser:** reuses a singleton client.
- Defaults: `staleTime` 60s, `refetchOnWindowFocus` false, `retry` 1.
- Dehydration includes pending queries for SSR handoff.
- React Query Devtools mount in non-production.

No extra TanStack setup is required beyond installing dependencies and running the app. Prefer existing query keys under `src/lib/api/*` when adding features.

---

## 10. Database migrate, generate, and verify

With `.env` filled in (especially `DATABASE_URL`):

```bash
# 1) Generate Prisma Client into prisma/generated
yarn db:generate

# 2) Apply existing migrations to your database
yarn db:migrate

# 3) Optional sanity check
yarn db:verify
```

Notes:

- `yarn db:migrate` runs `prisma migrate dev`. On first run it applies migrations under `prisma/migrations/`.
- If prompted for a migration name and you have **no schema changes**, cancel — you only need to apply existing migrations.
- `yarn db:verify` prints a user count if the DB connection works.

### Seeding

`yarn db:seed` runs `prisma/seed.ts`. It upserts demo users (Alice, Bob, Cara), sample posts, comments, and reactions using the shared `Hash` helper.

- Email examples: `alice@example.com`, `bob@example.com`, `cara@example.com`
- Password for all seed users: `password123`

Re-running the seed is safe: users are upserted; posts/comments are only created when missing.

---

## 11. Run the development server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

- Unauthenticated visits to `/` redirect to `/auth/login` (see `src/proxy.ts`).
- Production build:

```bash
yarn build
yarn start
```

---

## 12. Create your first account

1. Open [http://localhost:3000/auth/registration](http://localhost:3000/auth/registration).
2. Register with email + password.
3. Log in at `/auth/login`.
4. You should land on the feed and can create posts (image uploads require working R2 + `ASSETS_BASE_URL`).

---

## 13. Useful scripts

| Script | Command | Description |
|--------|---------|-------------|
| Dev server | `yarn dev` | Next.js development server |
| Production build | `yarn build` | Create production build |
| Production start | `yarn start` | Serve production build |
| Lint | `yarn lint` | ESLint |
| Prisma generate | `yarn db:generate` | Generate client → `prisma/generated` |
| Migrate | `yarn db:migrate` | `prisma migrate dev` |
| Seed | `yarn db:seed` | Run seed script |
| Studio | `yarn db:studio` | Prisma Studio GUI |
| DB verify | `yarn db:verify` | Quick connection / user count check |

---

## 14. Project structure (key paths)

```text
web/
├── .env.example                 # Template for local secrets
├── prisma/
│   ├── schema.prisma            # Data models
│   ├── migrations/              # SQL migrations
│   ├── seed.ts                  # Optional seed
│   └── generated/               # Prisma Client (gitignored; run db:generate)
├── prisma.config.ts             # Prisma 7 config (URL, migrations, seed)
├── src/
│   ├── app/                     # Next.js App Router pages & API routes
│   ├── components/              # UI (Header, Feed, Providers, …)
│   ├── config/
│   │   ├── dotenv.ts            # Typed env accessors
│   │   └── utils.ts             # asset() URL helper
│   ├── lib/
│   │   ├── prisma.ts            # Prisma Client singleton + adapter
│   │   ├── query-client.ts      # TanStack Query client
│   │   ├── jwt.ts               # JWT sign/verify
│   │   ├── api/                 # Fetch helpers & query keys
│   │   └── r2/bucket.ts         # Cloudflare R2 (S3) wrapper
│   └── proxy.ts                 # Auth redirect proxy (Next.js 16)
└── package.json
```

---

## 15. Troubleshooting

### `DATABASE_URL is not set`

- Ensure `.env` exists in the project root (same folder as `package.json`).
- Restart `yarn dev` after editing `.env`.

### Prisma Client not found / import errors from `prisma/generated`

```bash
yarn db:generate
```

### Migration errors

- Confirm Postgres is running and `DATABASE_URL` is correct.
- Test with `yarn db:verify`.
- Prefer applying existing migrations on a **fresh** empty database for local setup.

### R2 upload failures

- Confirm `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, and `R2_BUCKET`.
- Endpoint must be `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (no bucket in path).
- Token needs Object Read & Write on that bucket.

### Images upload but do not show

- `ASSETS_BASE_URL` must be a **public** origin that can serve the same objects.
- Keys include `R2_BUCKET_PREFIX`; public URLs must match that layout.
- Open a sample object URL in the browser to verify public access.

### JWT / auth redirect loops

- `JWT_SECRET` must be set and stable across restarts.
- Clear site cookies for `localhost:3000`, then log in again.

### Port already in use

```bash
yarn dev -- -p 3001
```

---

## Quick start checklist

```bash
git clone <YOUR_REPOSITORY_URL> web
cd web
yarn install
cp .env.example .env
# Edit .env: DATABASE_URL, R2_*, ASSETS_BASE_URL, JWT_SECRET, JWT_EXPIRATION
yarn db:generate
yarn db:migrate
yarn db:verify
yarn dev
```

Then register at `/auth/registration` and use the feed at `/`.
