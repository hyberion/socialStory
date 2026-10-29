# Parent guide notes

Running reference for the eventual parent, caregiver and teacher instructions: every setting, what it means and what it does. Not the guide itself yet; the "In plain words" column is draft wording for it.

**Rule:** any commit that adds or changes something a parent can set or will notice also updates this file.

Status: **Built** = in the code now. **Planned** = decided, not built yet. **Idea** = not decided.

## Child profile

One profile per child. Every setting can be changed at any time; nothing is locked in at setup. Defined in `packages/core/src/profile.ts`.

| Setting | Options | Default | In plain words | Status |
| --- | --- | --- | --- | --- |
| Name | Free text | (required) | The name your child is called in their stories. A nickname is fine. | Built |
| Reading level | Pre-verbal, Early reader, Reader | Early reader | How much text each page has. **Pre-verbal:** about one short line per page, meant to be read aloud. **Early reader:** 1 to 3 short sentences. **Reader:** up to 4 sentences with more detail. Pick what your child understands today; you can change it whenever they grow. | Built (stories) |
| Story voice | First person ("I"), Third person (child's name) | First person | Whether the story is told as your child ("I go to the doctor") or about them ("Sam goes to the doctor"). Some children connect more with one than the other. | Built (stories) |
| Picture style | Real photos, Mixed, Illustrated | Mixed | **Real photos:** your own pictures. **Illustrated:** soft drawings. **Mixed:** drawings with real faces and objects from your photos placed in. | Planned |
| Sound | On, Off | On | Off means the app never makes a sound. | Built (kid app) |
| Reading speed | 0.5x to 1.5x | 0.9x | How fast the read-aloud voice speaks. Slightly slow by default. | Built (kid app) |
| Reduce motion | On, Off | On | Keeps movement on screen to a minimum. | Planned |
| Review steps | Every stage, Script and final, Final only | Every stage | How much you check before your child sees a new story. Start with every stage; once you trust the results, you can review less. | Planned |
| Comfort items | List | None | Things that reliably help your child (a stuffed animal, headphones, a song). Stories offer these as choices during hard moments. | Built (stories) |
| Interests | List | None | Things your child loves. These only shape word choice. **They never add things to the event**, so the story won't promise trains that won't be there. | Built (stories) |

## Event details

Everything the parent tells us about something coming up. Defined in `packages/core/src/event.ts`.

| Field | In plain words | Why it matters | Status |
| --- | --- | --- | --- |
| Title and type | "Visit to Dr. Patel", doctor | Names the story. | Built |
| Date and time | When it happens. | Shown in the story; will drive the countdown. | Built |
| Why it's happening | In words your child understands: "to help my body stay healthy." | Answers the "why" every Social Story needs. | Built |
| Coming with your child | Who goes along: Dad, Grandma, a teacher. | The story names them ("Dad and I drive..."). **If you leave this empty, the story talks only about your child** and won't guess. | Built |
| People they'll meet | Name, role, photo, and up to 3 friendly true facts ("has a fish tank"). | Makes the person familiar before the day. | Built (photos planned) |
| Places | Name, photos, and what it's like: noisy, bright, smells like soap. | Sensory notes let the story describe it honestly. | Built (photos planned) |
| Steps | What happens, in order, from leaving home to coming back. | Each step becomes a page. | Built |
| "This step will happen no matter what" | A checkbox on a step (the shot, the haircut). | The story says so honestly, then offers your child real choices around it. It won't pretend a fixed thing is optional. | Built (stories) |
| Hard parts | What you expect to be tough: waiting, the shot, clippers. | The story describes these plainly and gives your child at least one option they control. | Built (stories) |
| Comfort items for this event | Extra comforts just for this event. | Added to the child's usual comfort items. | Built |

**Key promise to explain to parents:** the story only states facts you gave it. If something is missing, it leaves it out rather than guessing. The more detail you give, the richer the story.

## Reviewing a story

| Option | In plain words | Status |
| --- | --- | --- |
| Approve | Your child can now see this story. Nothing reaches your child before you approve it. | Planned |
| Edit | Change any words yourself. | Planned |
| Write it again | A fresh version. Each attempt comes out a little different, so this often fixes it. Takes about 10 seconds. | Planned |
| Take more care with this one | The writer spends more time on it. Takes about 30 seconds instead of 10. | Planned |

Behind the scenes (worth one sentence in the guide): every story is checked against the Social Story guidelines before you see it, and fixed automatically if it breaks one.

## What your child sees

Things parents should know about the kid app, so nothing surprises them.

| Behavior | Status |
| --- | --- |
| Same layout on every page; buttons never move. | Built |
| Nothing plays on its own. The read-aloud voice only speaks when your child taps the speaker. | Built |
| No scores, streaks, timers or "you missed a day." | Built |
| The last page loops back to the start, so your child can read it again as often as they like. | Built |
| Can be added to a tablet's home screen and works without internet (after setup). | Planned (needs deployment) |
| Countdown to the day ("2 sleeps until Dr. Patel"). | Planned |
| Day-of mode: step-by-step cards to use during the event itself. | Planned |
| Games built from your own photos. | Planned |

## Privacy (the guide needs a plain section on this)

- Stories and pictures are made by Meta's AI models. What you enter and upload is sent to Meta to make them.
- We use Meta's standard service, **not** the discounted mode that lets Meta train its models on what you send.
- Never required: your child's real name (a nickname works), last names, addresses or medical details beyond what the story needs.
- **Open:** how long uploads are kept, and how a parent deletes everything. Decide before any real families use it.

## Open questions for the guide

- Who is the guide for first: parents, teachers, therapists? (Probably parents; teacher and therapist notes later.)
- Format: a short in-app tour, a help page, or both?
- Should we suggest starting settings by age? (Careful with principle 1: suggestions only, never assumptions.)
