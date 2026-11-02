# socialStory

*Meta Global AI Developer Hackathon 2026 · Indie track · Theme 1: Build for Your World*

This app helps autistic kids get ready for the moments that scare them: the doctor, a new school, a haircut. Parents snap a few photos and describe what's coming, and AI turns it into a personalized prep journey (a story, playful games built from the real people and places, and a countdown) that builds familiarity day by day and walks alongside the child on the day itself. Not a script for compliance, but a calm, honest preview that gives kids information and choices.

Design principles, Social Story criteria and the generation pipeline: [`docs/design-principles.md`](docs/design-principles.md). Every user-facing setting and what it does: [`docs/user-guide-notes.md`](docs/user-guide-notes.md). Rules for coding agents: [`AGENTS.md`](AGENTS.md).

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
  user-web/     User app (parents, caregivers, teachers): describe, upload, review, approve
  player-app/   Player app (the child): installable PWA, works offline
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
| http://localhost:5173 | User app (review, edit and publish stories) |
| http://localhost:5174 | Player app (story shelf; shows published stories) |
| http://localhost:8787/api/health | API health check |

## Scripts

| Command | Does |
| --- | --- |
| `pnpm dev` | Runs the API and both apps together |
| `pnpm dev:api` / `dev:user` / `dev:player` | Runs one piece |
| `pnpm smoke` | One Muse Spark call to verify the key |
| `pnpm write-story [event]` | Writes and validates a story (`--effort` to override) |
| `pnpm compare-effort [event]` | Same story at several reasoning levels, with costs |
| `pnpm draw-story [event]` | Illustrates a written story and builds a contact sheet. Replaced images move to `history/<date-time>/`. `--pages 2,5` redraws only those pages; `--new-cast` redraws the portraits |
| `pnpm publish-kit [event]` | Publishes the written story and its pictures to the player app as a locked copy. Warns about missing or out-of-date pictures |
| `pnpm style-test` | Draws the same scene in all 8 illustration looks (cast sheet + page each, ~$0.24) and builds a comparison sheet. `--looks clay,graphic` for some; `--redo` to draw again |
| `pnpm demo-data <id> [id ...]` | Packs only these stories (and the profile and photos they use) into `demo-data/` for the server. See [`infra/README.md`](infra/README.md) |
| `pnpm narrate [event]` | Records the read-along for a written story with ElevenLabs (word timings included) and asks Spark for word help. Only pages whose words changed are recorded again; `--redo` for all. Then `pnpm publish-kit [event]` |
| `pnpm voice-questions` | Records the interview questions with ElevenLabs (once; commit the MP3s). With no voice set, lists your voices |
| `pnpm photo-list [event]` | Shows the photo checklist for an event (free) |
| `pnpm test` | Unit tests (the story validator lives here) |
| `pnpm typecheck` | Type-checks every package |
| `pnpm build` | Production builds |
| `pnpm db:up` / `db:down` | Starts or stops local Postgres |

## Privacy

Demo data is fictional. No real children's photos or details are used in this repo.
