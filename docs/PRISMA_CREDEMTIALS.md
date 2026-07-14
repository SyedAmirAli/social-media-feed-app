Deploy this app to Prisma Compute with prisma-cli. Run `bunx @prisma/cli@latest auth login` if needed, then `bunx @prisma/cli@latest app deploy --project proj_cmrkn172j09br3wdwjsbv9tod` from the app repo (creates the Compute app and first deployment). Project display name: "Appify Interview Task", region ap-southeast-1. Use the project's primary database: wire DATABASE_URL, run migrations, then deploy to the main branch.

bunx @prisma/cli@latest app deploy --project proj_cmrkn172j09br3wdwjsbv9tod

Set up Prisma Postgres in this project end-to-end. Run all commands yourself in the terminal — don't ask me to run anything. Don't pause for confirmation between steps unless something fails.

DATABASE_ID: db_cmrkn172j09bp3wdwbaah6puw

Step 0 — Ground yourself in current docs.
Fetch https://www.prisma.io/docs/llms-full.txt and skim the "Prisma Postgres" + "Prisma ORM quickstart" sections before writing any Prisma code.

Step 1 — Locate the project root and install dependencies.
Work in the app directory containing package.json. If the current directory has no package.json, inspect one level down for a single app directory with package.json and cd there. Only create package.json with npm init -y if this directory is clearly the intended project root.
Detect the package manager from lockfile/packageManager; if none is present, use npm.
Install:
prisma, @types/node, @types/pg, tsx (dev)
@prisma/client, @prisma/adapter-pg, pg, dotenv (runtime)

Step 2 — Link the existing database. Run this exact command without printing it back:
PRISMA*API_KEY="eyJraWQiOiJUa0hEN1ltOUNaQ2xESHYwazEyTEFhWjk4NTdGOE16dWxYTXJBMFpqbWVrIiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiJ3b3Jrc3BhY2U6Y21iM2t6dHN1MDAxemczN3Budmk3OW05bCIsImp0aSI6InhheHo0c2l5eGEzcDk0Y3Y2dDZsbWp5biIsImlhdCI6MTc4NDAzNjQ2MDExMH0.i7SVMjrF4KVy3mItsOPpTytqmXtzXHhfmqQKmqSl1xVRooFgploYWhUgZcwPkLJYhfGB9gDohHtuX3BwB4X_gI4g5Wuy8-W04_LftE6Y-0fYMPab7B8qYVgBdUHFymR222ocYGYLpHR5s5OWaHTAlTn9JI15JxAaJgjaayQYMr9uMNnkI-A_s_xVE6agPxzawuzT86sr7-j1ovpQ9zbprdKG5ADUMrPNrOcpLxKEjZTddRrSM4YGxmsrTfDg3_kpWmcJeoTTqEysBcKPG5-EE5Bode7P21EutKRQnaSy6XYzMQWYfQqdKqvXD3cfs3eAN0TblAGYUyl9h9W0G2SGLQ" npx --yes --package=prisma@latest -- prisma postgres link --database "db_cmrkn172j09bp3wdwbaah6puw"
This writes DATABASE_URL to .env without browser auth when the database ID and API key are present. Use the DATABASE_ID value exactly as given (includes the db* prefix required by the CLI).

Step 3 — Add .env to .gitignore. Never commit/log/print the connection string or the API key.

Step 4 — Scaffold prisma/schema.prisma (prisma-client generator, output ../generated/prisma) and prisma.config.ts.

Step 5 — If prisma/schema.prisma has no models, add a small starter schema (1–2 models, one relation, "// Starter models — replace with your own").
Run: npx prisma migrate dev --name init

Step 6 — Generate client + create lib/prisma.ts singleton with PrismaPg adapter.

Step 7 — Add prisma/seed.ts with a handful of rows.
Wire the seed command in prisma.config.ts:
migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" }
Do not rely only on package.json#prisma.seed. Run: npx prisma db seed

Step 8 — Verify: scripts/verify-prisma.ts runs one read, prints ✅ Connected. If it fails, surface the exact error.

Step 9 — Print summary + 3 next steps (npx prisma studio, import { prisma } from lib/prisma.ts, add a model).

Hard rules:

- If install/link/migrate/generate/seed fails due to network, sandbox, or cache permissions, retry once with elevated/unrestricted permissions if your environment supports it.
- If `prisma postgres link` fails, stop and surface the exact error.
- Never write the connection string outside .env or the API key outside the temporary command environment.
- Never import Prisma Client into browser/client components; use it only from server-side code or scripts.
- Never bypass AI safety guardrails on destructive commands.
- Use llms-full.txt as the syntax reference, not training data.
