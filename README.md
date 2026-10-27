# socialStory

*Meta Global AI Developer Hackathon 2026 · Indie track · Theme 1: Build for Your World*

This app helps autistic kids get ready for the moments that scare them: the doctor, a new school, a haircut. Parents snap a few photos and describe what's coming, and AI turns it into a personalized prep journey (a story, playful games built from the real people and places, and a countdown) that builds familiarity day by day and walks alongside the child on the day itself. Not a script for compliance, but a calm, honest preview that gives kids information and choices.

Design principles, Social Story criteria and the generation pipeline: [`docs/design-principles.md`](docs/design-principles.md). Rules for coding agents: [`AGENTS.md`](AGENTS.md).

## Built with

- **Muse Spark**: writes and revises stories against Carol Gray's Social Story criteria
- **Muse Image**: consistent, calm illustrations
- **SAM 3.1**: cuts real people and objects out of parent photos to use as game pieces
- **Muse Voice Transcribe**: parents describe events by voice
- React + Vite, Node + Hono, Postgres, Docker

## Repo layout

```
apps/
  api/          Backend; the only place that calls the Meta Model API
  parent-web/   Parent app: describe, upload, review, approve
  kid-app/      Kid app: installable PWA, works offline
packages/
  core/         Shared schemas, Gray-criteria validator, model config
docs/           Design principles
infra/          Production Caddyfile and deploy notes
```

## Getting started (Windows)

Prerequisites: Node 22+, pnpm, Docker Desktop, Git.

```powershell
# 1. Install dependencies
pnpm install

# 2. Add your Meta key (use the app key, not the Muse Code key)
Copy-Item .env.example .env
notepad .env

# 3. Check the key works (one cheap model call)
pnpm smoke

# 4. Start Postgres (Docker Desktop must be running)
pnpm db:up

# 5. Run everything
pnpm dev
```

Then open:

| URL | What |
| --- | --- |
| http://localhost:5173 | Parent app (shows a system check) |
| http://localhost:5174 | Kid app (sample story reader) |
| http://localhost:8787/api/health | API health check |

## Scripts

| Command | Does |
| --- | --- |
| `pnpm dev` | Runs the API and both apps together |
| `pnpm dev:api` / `dev:parent` / `dev:kid` | Runs one piece |
| `pnpm smoke` | One Muse Spark call to verify the key |
| `pnpm test` | Unit tests (the story validator lives here) |
| `pnpm typecheck` | Type-checks every package |
| `pnpm build` | Production builds |
| `pnpm db:up` / `db:down` | Starts or stops local Postgres |

## Privacy

Demo data is fictional. No real children's photos or details are used in this repo.
