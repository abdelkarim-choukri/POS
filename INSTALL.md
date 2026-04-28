# Setup Guide — POS Backend Project

This guide walks through setting up the project from the zip you just downloaded.
Follow the steps in order. Each one is independent and verifiable.

---

## Step 1 — Drop the files into your repo

Assuming your repo lives at `~/POS` (adjust if it's elsewhere) and you've
unzipped the download to `~/Downloads/pos-setup/`, run from your terminal:

```bash
# Go to your repo
cd ~/POS

# Copy everything from the unzipped folder into the repo, preserving structure
# The trailing dot on the source means "contents of, not the folder itself"
cp -r ~/Downloads/pos-setup/. .

# Verify the files landed where they should
ls -la
ls -la docs/spec/
ls -la docker/
```

You should see at the repo root: `CLAUDE.md`, `INSTALL.md`, `docker-compose.yml`,
`.env.example`, `.gitignore`, `.claudeignore`, `.graphifyignore`, plus the
`docs/` and `docker/` folders.

If you have an existing `.gitignore`, the copy may have **overwritten** it —
check `git diff .gitignore` to confirm nothing important was lost. If so,
merge the two by hand.

---

## Step 2 — Add your existing reference docs (optional but recommended)

If you have the AiBao Cloud reference markdown files from earlier, drop them
into `docs/reference/` for traceability:

```bash
# Adjust the source paths to wherever you have them
cp ~/path/to/aibaocloud_user_guide.md docs/reference/
cp ~/path/to/aibaocloud_api_detailed.md docs/reference/
cp ~/path/to/aibaocloud_api_reference.md docs/reference/
```

These are excluded from Claude's automatic context (via `.claudeignore`) and
from graphify (via `.graphifyignore`), so they don't burn tokens, but they're
in the repo for reference.

If you have the original SRS Word document, copy it into the spec folder:

```bash
cp ~/path/to/POS_SRS_v1_0.docx docs/spec/
```

---

## Step 3 — Set up your environment file

```bash
cp .env.example .env
```

For local development, the defaults are fine. **Never commit the real `.env`** —
the `.gitignore` keeps it out, but double-check before the first push.

---

## Step 4 — Test Docker Postgres + Redis BEFORE starting backend

This isolates database setup from backend setup so you can pinpoint problems.

```bash
# Start only Postgres and Redis (skip backend)
docker compose up postgres redis -d

# Confirm they're healthy
docker compose ps

# You should see something like:
#   pos-postgres   Up (healthy)
#   pos-redis      Up (healthy)
```

If healthchecks fail, check logs:

```bash
docker compose logs postgres
docker compose logs redis
```

Once they're healthy, test the Postgres connection from your host:

```bash
# Connect to Postgres inside the container and run a smoke query
docker exec -it pos-postgres psql -U pos -d pos_dev -c "SELECT version();"

# Should print the Postgres version string. If yes, you're good.
```

Test Redis:

```bash
docker exec -it pos-redis redis-cli PING
# Should print: PONG
```

---

## Step 5 — Bring up the full stack

The backend will fail to compile if `terminal.service.ts` still has the
duplicated `KdsService` imports — that's expected, it's Phase 0 work. But the
container should at least START and try to compile, then fail with a clear
TypeScript error.

```bash
# Bring everything up. Use --build the first time to build the image.
docker compose up --build

# Watch the logs in this terminal. You'll see Postgres, Redis, and the
# backend starting up.
```

Press `Ctrl+C` to stop. To run in the background:

```bash
docker compose up -d
docker compose logs -f backend    # follow backend logs
```

---

## Step 6 — Install graphify (does NOT build the graph yet)

```bash
# Install graphify CLI globally on your machine. uv is recommended.
# If you don't have uv: https://docs.astral.sh/uv/getting-started/installation/
uv tool install graphifyy

# Or with pipx if you prefer:
# pipx install graphifyy

# Verify
graphify --version
```

Now register graphify with Claude Code (this configures the always-on hook
so when you DO build a graph later, Claude Code uses it automatically):

```bash
# From the repo root
cd ~/POS

# Register the /graphify skill
graphify install

# Install the always-on hook for Claude Code
graphify claude install
```

The `graphify claude install` step appended a section to your `CLAUDE.md`.
**Open `CLAUDE.md` and confirm the "graphify" section reads sensibly** —
the version we shipped already has language saying "no graph has been built
yet, skip until later." If `graphify claude install` overwrote that with its
own default text, paste this back in:

```markdown
## graphify (knowledge graph)

A graphify knowledge graph MAY exist at `graphify-out/GRAPH_REPORT.md`.

- If it exists: read it before searching files for architectural questions.
- If it does NOT exist: skip — no graph has been built yet. The repo is
  currently small enough that direct file reading is faster than building
  a graph. The graph will be built once the codebase reaches ~50+ files of
  meaningful code (around end of Phase 6 in the implementation plan).
```

**Do NOT run `/graphify .` yet.** Wait until end of Phase 6 in the implementation
plan. Until then, the always-on hook is a no-op (it only fires if a graph
exists), and you save the extraction tokens.

---

## Step 7 — Commit and push

```bash
# Make sure you didn't accidentally stage .env or anything secret
git status

# Stage the new files
git add CLAUDE.md INSTALL.md \
        docker/ docker-compose.yml .env.example \
        .claudeignore .graphifyignore .gitignore \
        docs/

# Commit
git commit -m "Add specs, Docker dev setup, Claude/graphify config"

# Push so your teammate can pull
git push
```

---

## Step 8 — Send your teammate the onboarding instructions

Tell your teammate: clone the repo, then run:

```bash
git clone <repo-url>
cd <repo-name>
cp .env.example .env
docker compose up
```

That's it. They get a working backend on `http://localhost:3000` with no Node,
Postgres, or Redis to install on their machine. Their dashboard and terminal
work happens in `apps/dashboard-web/` and `apps/terminal-app/` natively
(via `pnpm install && pnpm dev`), and connects to the backend at
`http://localhost:3000`.

---

## What to do next (Phase 0)

Open Claude Code in your repo (`cd ~/POS && claude`) and use this prompt:

```
We are starting Phase 0 (repo hygiene) per CLAUDE.md.

Scope (do not exceed):
1. Fix the duplicated KdsService imports in
   apps/backend/src/modules/terminal/terminal.service.ts
2. Scaffold the packages/shared workspace:
   - packages/shared/package.json (name: "@pos/shared")
   - packages/shared/tsconfig.json
   - packages/shared/src/index.ts (placeholder export)
   - Update root pnpm-workspace.yaml if it doesn't already include packages/*
3. Add a /api/health endpoint to apps/backend that returns:
   { "status": "ok", "db": <ping result>, "redis": <ping result> }
4. Verify the backend container starts and compiles successfully.

Out of scope: any TVA work, any new entities, any spec extension features.

Plan first, then implement. Show me the plan before writing code.
```

Once Phase 0 is green, move to Phase 5 (TVA Foundation) using the prompt
template in CLAUDE.md.

---

## Quick reference — common Docker commands

```bash
# Start everything in background
docker compose up -d

# Stop everything (preserves data)
docker compose down

# Stop everything AND wipe data (full reset)
docker compose down -v

# Rebuild backend image after Dockerfile or package.json changes
docker compose up --build backend

# Tail backend logs
docker compose logs -f backend

# Open a shell inside the backend container
docker exec -it pos-backend sh

# Open psql inside the database
docker exec -it pos-postgres psql -U pos -d pos_dev

# Run a one-off command (e.g. TypeORM migration) inside backend
docker compose exec backend pnpm run migration:run
```
