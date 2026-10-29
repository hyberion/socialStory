# Agent guide for socialStory

Read this before changing code. Muse Code, Claude Code and other coding agents load this file automatically.

## What this is

A tool that helps autistic kids (players) prepare for new or hard moments (a doctor visit, a new school, a haircut). Users (parents, caregivers, teachers) describe the event and add photos; AI builds a personalized prep journey: a story, games built from real people and places, a countdown, and a day-of guide.

Full design principles: [`docs/design-principles.md`](docs/design-principles.md).

## Words we use

| Term | Means | In code | In text the AI reads | On screen |
| --- | --- | --- | --- | --- |
| **User** | The adult: parent, caregiver, teacher, therapist | `user` | (not mentioned) | "you" |
| **Player** | The child the story is for | `player`, `PlayerProfile`, cast id `"player"` | "the child" | "your child" |

Keep these layers separate. Prompt text keeps saying "the child" because that is how the model should think about its reader. On-screen copy says "your child" because that is warmer for a parent than "your player." Data that describes a real relationship stays as it is (Dad's role is "parent").

## Non-negotiable product rules

These override any feature request. If a change would break one, stop and flag it.

1. **The system adapts to the player, never the reverse.** Reading level, art style, pacing, sensory settings and difficulty are always user-adjustable. Never hard-code a single "right" level.
2. **Orientation, not simply obedience.** Generated content informs and offers choices. It never scripts compliance ("you must sit still"). Be honest about what's fixed, and offer real choices around it.
3. **Dignity, no pressure.** The player app has no streaks, scores, penalties, timers that judge, or engagement tricks. The player can stop, skip or replay anything.
4. **Sensory-safe player UI.** Muted colors, no flashing, no autoplaying or surprise sounds, the same layout every time.
5. **The user approves before the player sees anything.** Nothing generated reaches the player app without passing the approval gates.
6. **Literal, true language.** No idioms, no promises the world can break ("it won't hurt").

## Repo layout

| Path | What it is |
| --- | --- |
| `packages/core` | Shared types and logic: Event schema, story schema, Gray-criteria validator, model task config. Imported by every app. |
| `apps/api` | Node + Hono backend. The only place that calls the Meta Model API. |
| `apps/user-web` | User web app (React + Vite): input, uploads, review and approval. |
| `apps/player-app` | Player app (React + Vite, installable PWA, works offline). |
| `infra/` | Production Caddyfile and deploy notes. |
| `docs/` | Design principles and decisions. |

## Engineering rules

- **Secrets:** the Meta key lives only in `.env` (git-ignored) and is read only by `apps/api`. Never import it into a front-end app, never log it, never commit it.
- **Meta Model API:** base URL `https://api.meta.ai/v1`, via the `openai` npm SDK. The SDK does not read `MODEL_API_KEY` on its own; always pass `apiKey` explicitly (see `apps/api/src/meta.ts`).
- **Pick models and reasoning effort through `packages/core/src/models.ts`**, never inline. Reasoning tokens are billed as output. Story writing defaults to **low** on purpose (Oct 28 test: same pass rate as high at 40% of the cost and half the wait); the validator, revise loop and user approval are the quality net. Don't raise defaults without a measured comparison (`pnpm compare-effort`). Users can request a higher-effort rewrite per story from an allow-list (`low`, `medium`, `high`); never expose `xhigh` or `max`.
- **Never use contributor-mode models** (`*-contributor`). They let Meta train on prompts and responses, which would include families' details.
- **Schemas first:** any data that crosses an app boundary is defined as a zod schema in `packages/core` and validated at the boundary.
- **Generation is staged and gated** (confirm Event, approve script, approve cast and set, review pages, compile). Each stage is its own background job with honest progress messages. Edits invalidate only downstream pieces.
- **Test data only:** never use real children's photos or details in fixtures, demos or commits.
- **User-facing changes update the guide notes.** If a change adds or alters anything a user can set or will notice (a setting, an option, a default, a player-app behavior, what data is sent where), update [`docs/user-guide-notes.md`](docs/user-guide-notes.md) in the same commit.
- Keep changes small and typed. Run `pnpm typecheck` and `pnpm test` before committing.
