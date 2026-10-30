# User guide notes

Running reference for the eventual user instructions (users are parents, caregivers and teachers; players are the children): every setting, what it means and what it does. Not the guide itself yet; the "In plain words" column is draft wording for it.

**Rule:** any commit that adds or changes something a user can set or will notice also updates this file.

The "In plain words" text is written the way users will read it: "you" and "your child," not "user" and "player."

Status: **Built** = in the code now. **Planned** = decided, not built yet. **Idea** = not decided.

## Player profile

One profile per player (child). Every setting can be changed at any time; nothing is locked in at setup. Defined in `packages/core/src/profile.ts`.

| Setting | Options | Default | In plain words | Status |
| --- | --- | --- | --- | --- |
| Name | Free text | (required) | The name your child is called in their stories. A nickname is fine. | Built |
| What your child looks like | Free text | None | A short description for the pictures: hair, skin tone, favorite clothes ("short curly brown hair, green t-shirt"). Keeps your child looking the same in every picture. Without it, the artist guesses. | Built (pictures) |
| Reading level | Listener, Early reader, Reader, Fluent reader | Early reader | How much text each page has. **Listener** (not reading yet): one very short sentence a page, meant to be read aloud. **Early reader:** up to 3 sentences, 9 words each. **Reader:** up to 4 sentences, 15 words each. **Fluent reader:** up to 6 sentences, 22 words each, in a grown-up tone for older kids and teens. The app checks every story against these limits and rewrites pages that run well over; a word or two over is only a note. | Built |
| Detail level | Essentials, Standard, More detail, Full picture | Standard | How much *information* the story gives, separate from how many words. **Essentials:** just the steps and the choices. **Standard:** plus how things look, sound and feel. **More detail:** plus why things happen (only reasons you gave) and what other people are doing. **Full picture:** plus honest what-ifs ("sometimes the doctor is running late") with a choice for each, and a more grown-up tone. Mix freely: a strong reader can have Essentials, an early reader can have More detail. | Built (stories) |
| Story voice | First person ("I"), Third person (child's name) | First person | Whether the story is told as your child ("I go to the doctor") or about them ("Sam goes to the doctor"). Some children connect more with one than the other. | Built (stories) |
| Picture style | Real photos, Mixed, Illustrated | Mixed (will become Illustrated) | **Illustrated:** soft, calm drawings in muted colors, with no text in the pictures. **Real photos:** your own pictures. **Mixed:** drawings with real faces and objects from your photos placed in. | Illustrated built (test command); others planned |
| Sound | On, Off | On | Off means the app never makes a sound. | Built (player app) |
| Reading speed | 0.5x to 1.5x | 0.9x | How fast the read-aloud voice speaks. Slightly slow by default. | Built (player app) |
| Reduce motion | On, Off | On | Keeps movement on screen to a minimum. | Planned |
| Review steps | Every stage, Script and final, Final only | Every stage | How much you check before your child sees a new story. Start with every stage; once you trust the results, you can review less. | Planned |
| Comfort items | List, each with a name, what it looks like, and an optional photo | None | Things that reliably help your child (a stuffed animal, headphones, a blanket). Stories offer these as choices during hard moments, and they appear in the pictures. **Add a photo of the real one** so it looks right in every picture, not like a generic toy. | Built (stories, pictures) |
| Ways in | Read, Listen, Interact; pick any, ranked | Read, then Listen | How your child takes in a story best. **Read:** words first. **Listen:** the story is read aloud first. **Interact:** gentle games made from the story (matching words to pictures, dragging the right word in, filling in a blank if your child types). Most children are a mix, so you can pick more than one and choose which comes first. | Planned (after the hackathon) |
| Place tour | On, Off | On when you've added place photos | A walk-through of the place with no people in it: "This is the building. This is the waiting room." Lets your child get to know the place on its own first. Uses your own photos where you have them. | Planned (after the hackathon) |
| Interests | List | None | Things your child loves. These only shape word choice. **They never add things to the event**, so the story won't promise trains that won't be there. | Built (stories) |

## Your settings (the user)

| Setting | Options | Default | In plain words | Status |
| --- | --- | --- | --- | --- |
| Where you live | Country, and which side of the road cars drive on | US (drive on the right) | So pictures match your child's world: in the US the driver sits on the left; in the UK, Australia or Japan, on the right. | Built (pictures) |

Pictures never show the inside of a car or bus. Travel is shown from outside: walking to the car, standing beside it, or the car on the road or parked at the place. (AI pictures of car interiors kept getting the seats wrong, and a wrong picture is worse than none.) The story's words can still say "we drive."

## Event details

Everything the parent tells us about something coming up. Defined in `packages/core/src/event.ts`.

| Field | In plain words | Why it matters | Status |
| --- | --- | --- | --- |
| Title and type | "Visit to Dr. Patel", doctor | Names the story. | Built |
| Date and time | When it happens. | Shown in the story; will drive the countdown. | Built |
| Why it's happening | In words your child understands: "to help my body stay healthy." | Answers the "why" every Social Story needs. | Built |
| Coming with your child | Who goes along (Dad, Grandma, a teacher), and what they look like. | The story names them ("Dad and I drive..."). **If you leave this empty, the story talks only about your child** and won't guess. | Built |
| People they'll meet | Name, role, photo, what they look like, and up to 3 friendly true facts ("has a fish tank"). | Makes the person familiar before the day. The "looks like" line keeps them consistent in every picture. | Built (photos planned) |
| Places | Name, photos, and what it's like: noisy, bright, smells like soap. | Sensory notes let the story describe it honestly. | Built (photos planned) |
| Getting there | How your child travels (car, bus, train, walking), what you call it ("the blue car") and what it looks like. | Your car gets its own reference drawing, so it's the same car on every page. Pictures show it from outside only. | Built |
| Steps | What happens, in order, from leaving home to coming back. | Each step becomes a page. | Built |
| "This step will happen no matter what" | A checkbox on a step (the shot, the haircut). | The story says so honestly, then offers your child real choices around it. It won't pretend a fixed thing is optional. | Built (stories) |
| Hard parts | What you expect to be tough: waiting, the shot, clippers. | The story describes these plainly and gives your child at least one option they control. | Built (stories) |
| Comfort items for this event | Extra comforts just for this event. | Added to the child's usual comfort items. | Built |

**Key promise to explain to parents:** the story only states facts you gave it. If something is missing, it leaves it out rather than guessing. The more detail you give, the richer the story.

## Starting from a template

Instead of a blank form, the user can start from a common event and edit it. Defined in `packages/core/src/templates.ts`. **Status:** templates built; the picker screen comes with the event screen.

| Template | The usual steps it starts with |
| --- | --- |
| Doctor visit | Go there, check in at the front desk, waiting room, nurse calls your name and walks you to an exam room, height and weight, wait for the doctor, doctor says hello, listens to your heart and looks in your ears, go home. Can add: temperature and blood-pressure cuff; a shot. |
| Haircut | Go there, wait your turn, big chair that goes up and down, cape, scissors, brushing off little hairs, mirror, pay and go home. Can add: water spray; clippers. |
| First day at a new school | Go there, teacher says hello, cubby or hook, morning routine, lunch in the cafeteria, go home. Can add: recess; the bell. |
| Meeting a new baby | Go there, wash hands, the baby is small and may be sleeping, the baby may cry, the grown-ups may be busy and tired, say goodbye. Can add: holding the baby while sitting down, with help. |

In plain words for the guide: **A template is a starting point, not a promise.** Every step is yours to keep, change or remove. Steps that only sometimes happen (like a shot) are left out until you add them, because the story should never tell your child about something that won't happen. People start out named by role ("the nurse"); give them real names if you know them. Each template also asks a few questions ("Is there a shot planned?") that turn it into your child's event.

## Photo checklist

When a user adds an event, the app suggests which photos to take, so they don't forget a useful one, don't have to think up the list, and don't feel they must photograph everything. Built in `packages/core/src/photos.ts`; preview with `pnpm photo-list doctor`. **Status:** built (logic and preview command); the upload screen is planned.

- **Built from the event, no AI:** the entrance of the first place, each person your child will meet, your child's comfort items, inside each place where steps happen, plus common extras for the event type (doctor, dentist, haircut, school, travel, therapy).
- **Two tiers:** "Most helpful" (never more than 5) and "Nice to have." Photos already added drop off the list.
- **Every item says why it helps,** and some say how to take it.
- **Tips shown once:** every photo is optional and 3 to 5 is plenty; shoot from your child's eye height; calm everyday shots are fine; avoid other people's faces and ask before photographing staff.
- **Never suggests photographing the hard part itself** (no needle close-ups).

**Photo letter:** a short note you can print or show on your phone when asking to take pictures: what the photos are for, that only you and the app use them, and that they're never posted or shared. Draft in [`photo-letter.md`](photo-letter.md). **Status:** draft text written; in-app version planned (after the hackathon).

## Fixing pictures

| Option | In plain words | Status |
| --- | --- | --- |
| Keep | This picture is good. | Planned |
| Redraw | Try a fresh version of this picture. | Planned |
| Fix this | Describe what's wrong ("make Sam face forward") and only that part changes. | Planned |
| Earlier versions | Every version is saved, so you can go back if a change makes it worse. | Planned |

If you change a page's words, its picture is marked "may not match anymore" so you can redraw it or keep it.

## The cast sheet (pictures)

Before drawing any pages, the app draws one portrait of each person (your child, whoever comes along, the people they'll meet) and one drawing of each comfort item. If you added a photo of a comfort item, its drawing is made from that photo. Every page is then drawn to match those portraits, so everyone looks the same throughout. **Planned:** you approve or redraw the cast sheet before pages are drawn.

Pictures can only show people you listed. If the story writer tries to put anyone else in a picture, the app rejects it automatically.

Cost note (for us, not the guide): $0.01 per picture, so about $0.10 for a cast plus a 7-page story.

## Reviewing a story

| Option | In plain words | Status |
| --- | --- | --- |
| Approve | Your child can now see this story. Nothing reaches your child before you approve it. Each page gets its own checkmark; approved pages are locked. | Planned |
| Edit | Change any word yourself, right on the page. You can also change what the picture shows and who's in it. | Built |
| Reorder | Drag a sentence (⠿) to a new spot, even onto another page. Move whole pages with ↑ ↓. Add or delete sentences and pages. Instant, and free. **Pictures stay with their pages** when pages move; a deleted page's picture is kept in history, never thrown away. | Built |
| Rewrite this page | Rewrites just one page, with an optional note like "mention the fish more." Takes a few seconds; your other pages aren't touched. The note guides the writer but can't add facts the event doesn't have. | Built |
| Write it again | A whole new story. Each attempt comes out a little different, so this often fixes it. Takes about 10 seconds. Replaces your edits, but the current version is kept in history; pictures stay until you redraw them. | Built |
| Take more care with this one | Same as Write it again, but the writer spends more time on it. Takes about 30 seconds instead of 10. | Built |

| Reading estimate | The editor shows the child's reading level and detail level, and a rough reading-grade estimate ("reads at about grade 1"). **It's a rough guide, not a setting:** short stories make any reading formula shaky, and it measures how hard the words are, not whether your child understands them. You know your child better than a formula. | Built |
| Story check while you edit | Gentle notes appear as you type when something breaks a Social Story guideline ("must", too many choices compared with describing, a picture list that doesn't match its description). **They warn, never block:** you have the final say. | Built |
| "This picture may not match" | Appears when you change what a page's picture shows, or who's in it, after the picture was drawn. Changing only the words doesn't trigger it. **Keep it** if it still fits. (Redraw comes with the picture editor.) | Built (Keep); Redraw planned |
| Sentence kinds | Each sentence is labeled: **What happens**, **Feelings**, **It's okay**, or **A choice**. The check uses these to keep choices to about one for every two of the others. | Built |
| Publish | Sends the approved story and pictures to your child's app as one locked copy. Later edits or redraws don't change what your child sees until you publish again. If a page has no picture yet, or its picture was drawn before you changed the words, you'll get a warning, but you can still publish: you have the final say. | Built: the **Publish to the shelf** button (saves first), or `pnpm publish-kit` |

Behind the scenes (worth one sentence in the guide): every story is checked against the Social Story guidelines before you see it, and fixed automatically if it breaks one.

## What your child sees

Things users should know about the player app, so nothing surprises them.

| Behavior | Status |
| --- | --- |
| A shelf of their stories, as big picture covers. The soonest event comes first. | Built |
| A home button on every page goes back to the shelf. | Built |
| If nothing is published yet (or the app can't reach the server and has nothing saved), your child sees "Your stories will be here soon," never an error. | Built |
| Uses the reading speed and sound settings that were set when you published. | Built |
| The first page shows who the visit is with (Dr. Patel, on her own), next to a calendar with the day circled, a clock showing the time, and the date and time written out ("Tuesday, November 3, 10:00 in the morning"). The calendar and clock are drawn by the app, not the AI, so they're always exactly right. The read-aloud voice says the date and time too. | Built |
| Same layout on every page; buttons never move. | Built |
| Nothing plays on its own. The read-aloud voice only speaks when your child taps the speaker. | Built |
| No scores, streaks, timers or "you missed a day." | Built |
| The last page loops back to the start, so your child can read it again as often as they like. | Built |
| Can be added to a tablet's home screen and works without internet: stories it has opened once are saved on the device. | Built; needs deployment to try on a tablet |
| Countdown to the day ("2 sleeps until Dr. Patel"). | Planned |
| Day-of mode: step-by-step cards to use during the event itself. | Planned |
| **Who's who?** A game on the shelf under each story: your child sees a portrait from the cast sheet, taps a name, and the app shows who it is ("Dr. Patel is the doctor.") plus any friendly facts you added. Any tap shows the answer the same calm way; nothing is ever marked wrong, counted or timed. Appears once at least two portraits are drawn. | Built |
| **Read-along:** a real recorded voice (you choose from a few calm voices) reads each page, highlighting each word as it's spoken. Recorded once when you publish, so it sounds exactly the same every time and works offline. You can listen before publishing. | Planned (hackathon stretch) |
| **Word help:** your child taps a word to see a short, kid-sized meaning and how to say it ("doctor: a person whose job is to help keep my body healthy. DOK-ter"), and can hear it said slowly. You choose which words get help in the editor. | Planned (hackathon) |
| Games built from your own photos. | Planned |
| Games built from the story's words (match, drag the word, fill in the blank). Never scored or timed; a miss just shows the answer. | Planned (after the hackathon) |
| A tour of the place with no people in it. | Planned (after the hackathon) |

## Privacy (the guide needs a plain section on this)

- Stories and pictures are made by Meta's AI models. What you enter and upload is sent to Meta to make them.
- We use Meta's standard service, **not** the discounted mode that lets Meta train its models on what you send.
- Pictures are made only from what you enter. The picture maker's web and image search are turned off, so it never looks up the real people or places you name online, and Meta isn't asked to keep the conversation.
- Never required: your child's real name (a nickname works), last names, addresses or medical details beyond what the story needs.
- **Open:** how long uploads are kept, and how a parent deletes everything. Decide before any real families use it.

## Open questions for the guide

- Who is the guide for first: parents, teachers, therapists? (Probably parents; teacher and therapist notes later.)
- Format: a short in-app tour, a help page, or both?
- Should we suggest starting settings by age? (Careful with principle 1: suggestions only, never assumptions.)
