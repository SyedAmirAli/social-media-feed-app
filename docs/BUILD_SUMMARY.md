# Build Summary

Brief documentation of what was built, the tech stack, and the main design decisions.

For full setup steps, see the root [README.md](../README.md).

---

## What was built

A social **feed web app** converted from the provided HTML/CSS into **Next.js (App Router)** without changing the visual design.

### Auth

- Registration and login (email + password, optional “remember me”)
- Passwords hashed with bcrypt (`Hash` helper)
- JWT session stored in an **httpOnly** cookie (`Authorization`)
- Feed (`/`) protected via Next.js **proxy** — guests redirected to login
- Auth cookies work on **both HTTP and HTTPS** (`secure` follows the request protocol)

### Feed & posts

- Newest-first feed of **public posts from everyone** + **own private posts**
- Create text and/or image posts with **Public / Private** visibility
- Image uploads stored on **Cloudflare R2** (S3-compatible), served via `ASSETS_BASE_URL`
- **Load more** pagination (`limit` / `offset`) with TanStack Query infinite queries
- Delete own posts (confirm dialog)

### Reactions & comments

- Post / comment / reply reactions (multiple reaction types, toggle via upsert)
- Hover reaction picker; reactors list modal (“who reacted”)
- Nested comments: top-level comment + replies with @mention styling
- Optimistic UI updates through a shared posts cache helper

### Profile

- Header profile menu, settings modal (name / avatar / password updates)
- Shared layout: desktop nav, mobile header, sidebars, theme wrapper

### Tooling / DX

- Prisma schema + migrations; seed users/posts/comments/reactions
- `.env.example` + setup README for new developers
- TypeScript pinned to **5.9.x** (Next.js 16.2 does not support TS 7 builds yet)

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript ~5.9 |
| Package manager | Yarn 1 |
| Database | PostgreSQL |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Auth | JWT (`jose`) in httpOnly cookie |
| Client data | TanStack Query v5 (SSR prefetch + hydration) |
| File storage | Cloudflare R2 (`@aws-sdk/client-s3`) |
| Validation | Zod |
| UI / design | Provided HTML/CSS assets + `globals.css` overrides |

---

## Design & architecture decisions

### 1. Keep the given design, add React behavior

UI markup/class names follow the provided theme. Logic lives in React components; only small CSS additions for app-specific behavior (modals, load more, auto-growing textareas, reaction picker).

### 2. Next.js App Router + route handlers as the API

One codebase for UI and backend (`src/app/api/*`). Auth, posts, comments, and reacts are JSON route handlers with Zod validation and Prisma access.

### 3. Prisma driver adapter (not the classic `PrismaClient` alone)

Prisma 7 is configured with `PrismaPg` and `DATABASE_URL`. Client is generated into `prisma/generated/` (gitignored) and wrapped in a singleton (`src/lib/prisma.ts`).

### 4. JWT in httpOnly cookie (not localStorage)

Reduces XSS token theft. Cookie `secure` is **protocol-aware** (HTTPS → secure; HTTP → not), so local HTTP and production HTTPS both work. `sameSite: "lax"` for normal navigation.

### 5. Feed visibility in one query

`OR: [PUBLIC, PRIVATE owned by current user]` keeps a single paginated feed instead of merging two lists on the client.

### 6. Pagination via limit/offset + infinite query

API supports `limit`/`offset`. The home page prefetches the first page; the client uses `useInfiniteQuery` and a **Load more** button. Optimistic updates patch both finite and infinite cache shapes.

### 7. Optimistic mutations for social actions

Likes, comments, and replies update the TanStack cache immediately, then reconcile or roll back from the API. Improves perceived performance without waiting on every round-trip.

### 8. R2 with a project prefix

All objects live under `R2_BUCKET_PREFIX` (e.g. `appifylab/...`). The DB stores the **full key**; `asset()` builds the public URL from `ASSETS_BASE_URL` + that key.

### 9. Component structure

Large screens were split for maintainability:

- Header → `header/DesktopNav`, `NotificationDropdown`, `ProfileMenu`, mobile pieces
- Post card → `PostDetails`, `CommentItem`, `ReactionPicker`, shared reaction helpers

### 10. TypeScript 5.9 (not 7)

TypeScript 7’s native package layout breaks Next.js 16.2’s typecheck (`lib/typescript.js` missing). Pinned to `~5.9.3` so `yarn build` works.

### 11. Seed uses the same `Hash` class as registration

Demo users share the production hashing path. Seed is idempotent (upsert users; create sample posts/reactions only when missing).

---

## How to run

```bash
yarn install
cp .env.example .env   # fill DATABASE_URL, R2_*, ASSETS_BASE_URL, JWT_SECRET
yarn db:generate
yarn db:migrate
yarn db:seed           # optional — alice@example.com / password123
yarn dev               # http://localhost:3000
```

Details, env reference, and R2/Postgres setup: **[README.md](../README.md)**.

---

## Out of scope / future ideas

- Real-time notifications and chat (UI placeholders only)
- Cursor-based pagination for very large feeds
- Direct browser → R2 uploads (today uploads go through API routes)
- Full TypeScript 7 once Next.js enables the CLI typecheck path stably
