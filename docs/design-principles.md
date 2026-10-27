# ASD Prep App — Design Principles

Oct 19, 2026 · @Brad

**The pitch:** This app helps autistic kids get ready for the moments that scare them: the doctor, a new school, a haircut. Parents snap a few photos and describe what's coming, and AI turns it into a personalized prep journey (a story, playful games built from the real people and places, and a countdown) that builds familiarity day by day and walks alongside the child on the day itself. Not a script for compliance, but a calm, honest preview that gives kids information and choices.

## Guiding principles

These three rules override everything else in this doc.

1. **The system adapts to the child, never the reverse.** Every autistic person has different abilities and needs. The parent is the expert interpreter of their child, and when parent goals and child needs pull apart, the child's needs set the approach. Adaptation is ongoing, not a setup wizard: reading level, art style, pacing, sensory settings and difficulty stay adjustable, and the feedback loop keeps them current.
2. **Orientation, not simply obedience.** The goal is curiosity, safe exploration and gentle, supportive orientation. Be honest about what's fixed, and give the child real choices around it. Example: "The doctor will give you a shot. You can hold Bear or squeeze Dad's hand. You can look away or watch."
3. **Dignity, no pressure.** The child can stop, skip or replay anything without penalty. No streaks, no "you missed a day," no scores that judge, no engagement tricks. A tool meant to reduce anxiety must never add any.

What this means in practice:

- Stories describe what will happen and how it will look, sound and feel, rather than how the child must behave.
- Every event includes coping options the child controls: a break, headphones, a comfort item.
- No promises the world can break ("it won't hurt"). Literal, true statements only.

## Social Story criteria (Carol Gray, 10.x)

Every generated story must pass all ten. Most existing AI tools ignore them, so enforcing them is a differentiator.

| # | Criterion | Rule | How the generator enforces it |
| --- | --- | --- | --- |
| 1 | Goal | Share accurate, reassuring information rather than dictating behavior | Prompt framing; reject stories built around "must" or "have to" |
| 2 | Two-step discovery | Gather information to understand the child's perspective; at least 50% of stories applaud what the child already does well | Parent input step; library mix includes "you did it" stories after events |
| 3 | Three parts + title | Clear title, introduction, detailed body, summarizing conclusion | Structured output schema with required sections |
| 4 | Format | Layout and visuals tailored to the child's comprehension | Driven by the profile level (pre-verbal, early reader, reader) |
| 5 | Voice | Patient, supportive, objective tone | Also covers perspective (first or third person, never second), tense, and literal accuracy |
| 6 | Six WH questions | Answer who, what, when, where, why, how | Schema fields; validator flags any missing |
| 7 | Sentence types | Descriptive sentences plus gentle coaching | Model tags each sentence by type |
| 8 | Formula | Descriptive sentences outnumber coaching, typically 2:1 or more | Validator counts tagged sentences; regenerate if the ratio fails |
| 9 | Nine to refine | Structured review and edit before use | Parent approval screen with edit-in-place |
| 10 | Implementation | Consistent guidance for introducing, reading, practicing | The prep arc: countdown, daily replay, games, day-of mode |

Note on #5: Gray's voice factors are more specific than tone. Perspective, tense and literal accuracy matter most for an AI generator, because that's where models drift.

## Concept

Stories are easy now; getting a kid ready isn't. The product is a preparation arc for a real event, not a story generator.

**Two users, two apps.** The parent side is a web app for input, uploads and approval. The kid side is a separate, portable app (PWA for the hackathon) with no settings or menus, and the same layout every time.

**The core object is an Event** (doctor visit, new school, haircut). Each Event holds:

- People: name, photo, one or two friendly facts
- Places: outside, entrance, the room where it happens
- Steps: the sequence from leaving home to coming back
- Hard parts: what the parent knows will be tough
- Comfort items: what helps

**The loop:**

1. Parent enters the Event by voice or form, plus photos.
2. The app generates a kit: an illustrated, narrated story; two or three games built from real objects cut out with SAM; a countdown.
3. The prep arc runs over the days before, with daily replay and games that build familiarity.
4. Day-of mode walks through first/then steps live.
5. Afterward, the parent logs how it went, and the next prep arc leans into what was hard.

**Models:** Muse Spark (story and game logic), Muse Image (scenes), SAM 3.1 (real objects as game pieces), Muse Voice Transcribe (parent dictation).

## Generation pipeline

Kits are built in five gated stages, cheapest first, so mistakes get caught while they cost nothing to fix. This is Gray's criterion #9 (refine before use) built into the product.

1. **Confirm the Event.** AI turns voice notes and photos into a structured Event (people, places, steps, hard parts, comfort items). The parent corrects anything misheard.
2. **Approve the script.** Text only, already validated against Gray's criteria. Most revision happens here because text edits are free.
3. **Approve the cast and set.** A reference sheet of the child, key people and places in the chosen art style. Locks the look so every page stays consistent.
4. **Review pages and cutouts.** Page images and SAM cutouts stream in; any single page can be regenerated.
5. **Compile and publish.** Games, countdown and day-of cards are assembled from approved pieces and pushed to the kid app.

Rules:

- Edits only invalidate what's downstream. Each piece tracks its inputs, so a changed photo redraws only the pages that use it.
- Gates are adjustable per principle 1: first-timers review every stage, experienced parents can choose "just build it."
- Progress is honest and staged ("Drawing the waiting room, 3 of 6"), results stream in as they finish, and parents can leave and get notified when it's ready.
- Each stage is its own background job (pg-boss in Postgres) that writes status rows the UI follows.

## Decisions and open questions

Decided:

- Indie track, Theme 1 (Build for Your World). Build window Oct 26 to Nov 4, 9 PM ET.
- Child level is parent-set and adjustable across the full range.
- Art style is a dial: real photos, hybrid, soft illustration.
- Parent side is web; kid side is a separate portable app (PWA for the proof of concept).
- Stack: React front ends, Postgres, Docker, GitHub for code and deploys, a VPS (DigitalOcean droplet or Hostinger). Backend is TypeScript (Node + Hono) so the Event schema and validator are shared with the apps.
- Cost and business model are out of scope for now.
- Code gets written inside the hackathon window (Oct 26 noon to Nov 4, 9 PM ET).

Open:

- [ ] Prep arc mechanics: what day 7 out, day 1 out, and day-of each look like
- [ ] Can Muse Image hold a consistent style and character across pages?
- [ ] Sensory style guide: palette, type, pacing, sound rules
- [ ] Talk to two or three parents, OTs or teachers about what they use now
- [ ] Demo video script
- [ ] Name
