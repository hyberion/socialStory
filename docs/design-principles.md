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

## The user's journey (Oct 30 rework)

Parents plan before they have photos, so the app is built around a gap in the middle: plan, go gather, come back and build.

1. **Child profile (once, then adjust any time).** By interview (voice or typing) or by plain fields and toggles. Asks what helps and what's hard, never for a diagnosis: sounds (loud places, sudden noises), lights, touch, waiting, new people, crowds; how the child communicates; reading; what they can do on a screen (tap, drag, type, listen); age only as a starting suggestion. The profile sets the defaults for stories, games and reading level; the parent adjusts.
2. **Event interview.** Voice or typing. Spark asks one question at a time, starting from the matching template's steps and questions and whatever is still missing. "I don't know yet" is always a fine answer and becomes a to-do. Produces an editable **outline** (the event's steps, people, places, hard parts) and a **media to-do list** (the photo checklist).
3. **The gap.** The parent gathers what they can, over days if needed.
4. **Media step.** For each to-do: upload it (SAM cuts the person or object out of the photo), or mark "can't get" and choose: draw it from a description, use a generic drawing, leave it out of the pictures, or take the photo at the event for next time.
5. **Story.** Written from the outline and the media; edited and reviewed in the editor.
6. **Pictures, then publish.**

**After the hackathon: editing during the interview (Brad, Nov 1 testing).** Transcription is about 90% accurate and the listener keeps only what makes sense, but users should be able to fix an answer in place: show the transcript for a moment before it's sent, with "Edit" and "Say it again" (a retake), and let any earlier answer be opened and changed from the "So far" list. In hands-free mode, a short visible pause before sending ("Sending… Edit") gives the same chance.

**After the hackathon: birthdays.** An optional birthday (month and day) used only to nudge the parent ("Ben's birthday is in 3 weeks. Want to make a birthday story?"), plus a birthday template. Birthdays are a classic hard event (surprises, noise, attention), so the nudge goes to the parent, never the player.

**Not only for kids.** Players can be teens or adults; nothing in the app should assume a child or talk down.

**Showcase story.** The doctor story is kept as a fully loaded beta with every feature that exists, including ones the normal flow can't make yet (read-along narration, word help, games, calendar and clock). It doubles as the roadmap and the backbone of the demo video.

**Hackathon plan (Oct 30):** Sat child profile; Sun event interview, outline and to-do list; Mon media step, SAM, story from event plus media, deploy; Tue showcase story (narration slice, word help) and polish; Wed demo video. Narration stays in as a stretch with a guaranteed minimum: the showcase story's read-along.

## Generation pipeline

Kits are built in five gated stages, cheapest first, so mistakes get caught while they cost nothing to fix. This is Gray's criterion #9 (refine before use) built into the product.

1. **Confirm the Event.** AI turns voice notes and photos into a structured Event (people, places, steps, hard parts, comfort items). The parent corrects anything misheard.
2. **Approve the script.** Text only, already validated against Gray's criteria. Most revision happens here because text edits are free.
3. **Approve the cast and set.** A reference sheet of the child, key people and places in the chosen art style. Locks the look so every page stays consistent.
4. **Review pages and cutouts.** Page images and SAM cutouts stream in; any single page can be regenerated.
5. **Compile and publish.** Games, countdown and day-of cards are assembled from approved pieces and pushed to the player app.

Rules:

- Edits only invalidate what's downstream. Each piece tracks its inputs, so a changed photo redraws only the pages that use it.
- Gates are adjustable per principle 1: first-timers review every stage, experienced parents can choose "just build it."
- Progress is honest and staged ("Drawing the waiting room, 3 of 6"), results stream in as they finish, and parents can leave and get notified when it's ready.
- Each stage is its own background job (pg-boss in Postgres) that writes status rows the UI follows.

**Script approval options.** Stories are written at low reasoning by default: in the Oct 28 test, low passed Gray's criteria on the first try at $0.014 and 11 seconds, versus $0.033 and 24 seconds at high, with similar quality. If the parent isn't happy with a script, the approval screen offers:

- **Write it again:** same level, a fresh attempt. Quality varies run to run, so a reroll often fixes it.
- **Take more care with this one:** high reasoning, with an honest note on the extra wait (about 30 seconds instead of 10).

Parents never see "reasoning effort" or token counts. The API accepts only an allow-list of levels, never xhigh or max. A quality-versus-speed preference for teacher and therapist accounts, with cost shown, is a post-hackathon idea.

## Review and edit pass

The user gets full control of every word and every picture before anything is assembled. AI drafts; the user decides.

**Story (stage 2)**

- Every sentence is editable in place, down to the word.
- Drag to reorder sentences within a page or move them between pages; drag to reorder pages; add or delete sentences and pages. Reordering is free (no AI).
- "Rewrite this page" with an optional note ("mention the fish more") rewrites one page, not the whole story. "Write it again" and "Take more care" still apply to the whole story.
- The checker runs live and shows gentle notes when an edit breaks a rule ("must", the 2:1 ratio, pages out of step order). Open question: warn only, or block?
- Changing a page's words, or moving a sentence onto it, marks its picture "may not match anymore," with Redraw or Keep.

**Pictures (stage 4) and cast sheet (stage 3)**

- Per picture: Keep, Redraw (fresh attempt), or Fix this with a note ("make Sam face forward"), using Muse Image editing so only the requested change happens.
- Every version is kept, so the user can flip back. Open question: one new picture per redraw, or two side by side to choose from?
- The same controls apply to cast portraits; a fixed portrait carries into every later page.

**Approval**

- Each page gets a checkmark. Approved pages are locked, so later redraws never touch them. Publish when everything is checked.

## Ways in: formats, games and the place tour (after the hackathon)

Principle 1 applied to format: the same approved story can reach the player in whichever way works for them, and the user picks, per player, which ways they get and which comes first. The goal is as many routes to familiarity as possible, with both the new situation and the new place.

- **Read:** the text-first reader (built).
- **Listen:** narration first; pages can turn with the voice. Uses the existing sound and reading-speed settings.
- **Interact:** the story stays the anchor, and games are made from it as a second layer: match the word to the picture, drag the right word into the sentence, fill in the blank (typed, for players who type), plus the photo-cutout games. Same rules as everything else on the player side: no scores, no timers, no wrong-answer buzzers; a miss just shows the answer calmly.
- **Place tour:** a separate walk-through of the place with no people and no hard parts. "This is the building. This is the door. This is the waiting room. This is the room where Dr. Patel works." Built from the user's own place photos first (the most accurate pictures we will ever have), with drawn versions for missing rooms. Lets the player get used to the place on its own before adding people and what happens there.

Format preferences are a ranked, multi-select list (most players are a mix), and every format is made from the same approved, published kit, so nothing reaches the player that the user didn't approve.

## Photo letter

A short "why I'm taking pictures" note the user can print or show on their phone to staff and other adults at the place. It explains what the photos are for, who sees them and what we will never do with them, so asking permission is easier for the user. Draft text: [`photo-letter.md`](photo-letter.md). Rule: the letter's promises must match what the app actually does; if the app's data handling changes, the letter changes with it.

## Accounts (after the hackathon)

One model covers every case: everything belongs to an **organization**, and adults have roles in it.

| Situation | Organization | Adults (roles) | Players |
| --- | --- | --- | --- |
| Family | The household | Parent (owner); invited co-parent, grandparent, sitter | One profile per child |
| Teacher | Their class (an org of one) | Teacher (owner) | Imported from CSV |
| School | The school | Admin, teachers, aides | Bulk import, each assigned to one or more teachers |

- Players never get passwords. The player app is paired once by an adult (QR or short code); shared classroom tablets show a pick-your-picture screen.
- Several adults per child, with per-org roles (approve and publish, or view only).
- The same child in a family and a school is two separate profiles. Sharing between them needs explicit parent consent, never name matching.
- Students and stories belong to the org, so a teacher leaving means reassignment, not data loss.
- Sign-in through an auth library: magic-link email and Google. No stored passwords. Schools later: Google for Education or Clever sign-in, and Clever or ClassLink rostering instead of CSV.
- CSV import collects the minimum: first name or nickname, optional reading level, teacher email, optional school ID (so re-imports update instead of duplicate). No birthdays, last names or diagnoses.
- Before any school pilot: COPPA (under-13 data), FERPA (school records), district student-data privacy agreements, and school photo consent (ties to the photo letter). Worth a lawyer's hour.
- Database tables carry an organization id from the start, even while there's only one family.

## Read-along narration and word help

Meta has no text-to-speech model (Muse Voice Transcribe is speech to text only), so narration comes from ElevenLabs.

- **Voices:** a curated set of 4 to 6 calm voices, each with a preview. The user picks per child.
- **Consistency comes from recording once, not prompting:** at publish time each sentence is rendered with a fixed voice, fixed settings (high stability, the child's reading speed) and one house style ("calm, warm, unhurried"). The user can listen before publishing; the child hears the identical recording on every replay, offline too. Only changed sentences re-render. Expressive performance tags are a later option for teachers, because more expression also means more take-to-take variation.
- **Read-along:** the word being spoken is highlighted, using the character timings ElevenLabs returns with the audio.
- **Fallback:** the device's own voice, only when there's no recording (it sounds different on every device).

**Word help:** tap a word (no hover; tablets can't) for a card with the word, a child-sized literal definition in the story's voice ("doctor: a person whose job is to help keep my body healthy"), a children's-dictionary respelling (DOK-ter, loud part in capitals), and a say-it-slowly button. Tapping a person's name also shows their portrait. Spark suggests the words likely to be new at the child's reading level; the editor's "Word help" list lets the user add, edit or remove them. Definitions follow the story rules: literal, true, never circular. Tappable words get a subtle dotted underline the user can turn off.

**Hackathon priority (Oct 30):** voice input (Muse Voice Transcribe, real-time only: audio streams over a live connection, push-to-talk) and read-along narration are both goals. If time runs short, narration is cut first, because voice input is what the hackathon rules reward. Word help is scheduled alongside the SAM feature.

## 📌 Before the full build: localization (Spanish first)

Pinned Nov 1. Decide the shape before the post-hackathon build, because it touches every layer and is far cheaper designed in than retrofitted.

- **Two languages per family, not one.** The parent's app language and the child's story language are separate settings (bilingual families: a parent may plan in English for a child who hears stories in Spanish, or the reverse).
- **Screens:** every user-app and player-app string moves into translation files; no text hard-coded in components. Dates and times formatted per language ("martes, 3 de noviembre, 10:00 de la mañana").
- **Stories:** Spark writes in the child's language. The checker has English-only parts to rework: banned phrases ("must", "have to" need Spanish equivalents), the second-person check, word and sentence counting, and the reading estimate (Flesch-Kincaid is English; Spanish needs Fernández-Huerta or Szigriszt-Pazos). Gray's criteria themselves carry over.
- **Interviews:** each question bank gets a Spanish version with its own recordings; Muse Voice Transcribe takes a language setting (Spanish is supported); the listener records answers in the language given.
- **Voices:** ElevenLabs' multilingual model; pick a Spanish voice with the same calm, unhurried read. Narration recordings per language.
- **Templates:** translated, and checked for local differences (a school day, a doctor visit and a haircut don't run the same everywhere); region settings already cover which side of the road cars drive on.
- **Pictures stay text-free,** so they work in any language as they are.
- **Review by native speakers** (ideally a parent and a professional who use Social Stories in Spanish) before any Spanish story reaches a child.

## Decisions and open questions

Decided:

- Indie track, Theme 1 (Build for Your World). Build window Oct 26 to Nov 4, 9 PM ET.
- Child level is parent-set and adjustable across the full range.
- Art style is a dial: real photos, hybrid, soft illustration.
- Parent side is web; kid side is a separate portable app (PWA for the proof of concept).
- Stack: React front ends, Postgres, Docker, GitHub for code and deploys, a VPS (DigitalOcean droplet or Hostinger). Backend is TypeScript (Node + Hono) so the Event schema and validator are shared with the apps.
- Cost and business model are out of scope for now.
- Code gets written inside the hackathon window (Oct 26 noon to Nov 4, 9 PM ET).
- Story checker warns, never blocks: the user has the final say.
- Redraw shows two options side by side.
- After the hackathon: accounts built on organizations with roles (family, solo teacher, school). Reading-level check: exact counts against our own level rules plus open readability scores now; Lexile as an optional licensed add-on for schools.
- After the hackathon: per-player format preferences (read, listen, interact), story-based games, a people-free place tour, and the photo letter.

Open:

- [ ] Prep arc mechanics: what day 7 out, day 1 out, and day-of each look like
- [ ] Can Muse Image hold a consistent style and character across pages?
- [ ] Sensory style guide: palette, type, pacing, sound rules
- [ ] Talk to two or three parents, OTs or teachers about what they use now
- [ ] Demo video script
- [ ] Name
