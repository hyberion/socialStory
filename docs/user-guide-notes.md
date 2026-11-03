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
| Reading level | Listener, Early reader, Reader, Fluent reader | Early reader | How much text each page has. **Listener** (not reading yet): one very short sentence a page, meant to be read aloud. **Early reader:** up to 3 sentences, 9 words each. **Reader:** up to 4 sentences, 15 words each. **Fluent reader:** up to 6 sentences, 22 words each, in a grown-up tone for older kids, teens and adults. The app checks every story against these limits and rewrites pages that run well over; a word or two over is only a note. | Built |
| Detail level | Essentials, Standard, More detail, Full picture | Standard | How much *information* the story gives, separate from how many words. **Essentials:** just the steps and the choices. **Standard:** plus how things look, sound and feel. **More detail:** plus why things happen (only reasons you gave) and what other people are doing. **Full picture:** plus honest what-ifs ("sometimes the doctor is running late") with a choice for each, and a more grown-up tone. Mix freely: a strong reader can have Essentials, an early reader can have More detail. | Built (stories) |
| Story voice | First person ("I"), Third person (child's name) | First person | Whether the story is told as your child ("I go to the doctor") or about them ("Sam goes to the doctor"). Some children connect more with one than the other. | Built (stories) |
| Picture look | Soft watercolor, Simple and clear, 3D animated look, Graphic novel, High contrast | Soft watercolor | How the pictures are drawn, chosen by sample image. **Simple and clear** is for children who find busy pictures overwhelming; **Graphic novel** for teens and adults (nothing childish); **High contrast** for low vision. Every look keeps calm faces, plain backgrounds, no words in pictures, nothing frightening, and draws each person's skin tone and features exactly as described. One look per child so stories match; changing it redraws their people and comfort items. | Built |
| Picture style | Real photos, Mixed, Illustrated | Mixed (will become Illustrated) | **Illustrated:** soft, calm drawings in muted colors, with no text in the pictures. **Real photos:** your own pictures. **Mixed:** drawings with real faces and objects from your photos placed in. | Illustrated built (test command); others planned |
| Sound | On, Off | On | Off means the app never makes a sound. | Built (player app) |
| Reading speed | 0.5x to 1.5x | 0.9x | How fast the read-aloud voice speaks. Slightly slow by default. | Built (player app) |
| Reduce motion | On, Off | On | Keeps movement on screen to a minimum. | Planned |
| Review steps | Every stage, Script and final, Final only | Every stage | How much you check before your child sees a new story. Start with every stage; once you trust the results, you can review less. | Planned |
| Comfort items | List, each with a name, what it looks like, and an optional photo | None | Things that reliably help your child (a stuffed animal, headphones, a blanket). Stories offer these as choices during hard moments, and they appear in the pictures. **Add a photo of the real one** so it looks right in every picture, not like a generic toy. | Built (stories, pictures) |
| Ways in | Read, Listen, Interact; pick any, ranked | Read, then Listen | How your child takes in a story best. **Read:** words first. **Listen:** the story is read aloud first. **Interact:** gentle games made from the story (matching words to pictures, dragging the right word in, filling in a blank if your child types). Most children are a mix, so you can pick more than one and choose which comes first. | Planned (after the hackathon) |
| Place tour | On, Off | On when you've added place photos | A walk-through of the place with no people in it: "This is the building. This is the waiting room." Lets your child get to know the place on its own first. Uses your own photos where you have them. | Planned (after the hackathon) |
| Age | Birth month and year, or just an age; optional | None | Month and year keep the age current on their own; we never need the exact day (a full birthdate is more identifying than the app needs). Only used to *suggest* starting settings ("Many 11-year-olds start with Reader"). Never applied on its own, never a lock. Works for teens and adults too. | Built |
| What's hard | Loud places, sudden noises, bright lights, being touched, waiting, new people, crowds, strong smells, changes in plans, being away from family, plus your own words | None | When one of these will happen at an event, the story describes it honestly and offers your child a choice. It never adds one the event doesn't include. **We don't ask for a diagnosis:** what's hard and what helps tells the app more, and keeps sensitive health details out of the app. | Built |
| What helps | Your own words, one per line | None | Used as the choices stories offer ("knowing what comes next", "deep breaths with Dad"). | Built |
| How your child communicates | Full sentences, short phrases, single words, AAC, mostly nonspeaking | Not set | If your child doesn't use many spoken words, stories never offer choices that need talking ("I can tell the doctor") and offer things your child can show instead (pointing, a card, a hand squeeze). | Built |
| On a screen, can… | Tap, drag, type | Tap | Decides which games are offered. | Built (saved; games use it next) |
| Ways in | Reading, listening, games; in your order | Reading, then listening | Which way the story is offered first. | Saved; the player uses it once narration lands |
| Interests | List | None | Things your child loves. These only shape word choice. **They never add things to the event**, so the story won't promise trains that won't be there. | Built (stories) |

### Setting up a child

Two ways, same result: **talk it through** (an interview) or **fill in a form.**

- **One question per screen,** about 12 in all: name, looks, age (optional), reading, how your child communicates, what's hard, what helps, comfort items, favorite things, what they can do on a screen, how they take in stories best, and "anything else." Answer one question with lots of detail and the app skips the questions you already covered.
- **Talk or type.** Tap **🎤 Talk**, speak, then **Stop and send**: your answer goes straight in. Typed answers send with Enter. "I don't know" and "Skip" are always there; **Previous question** brings back your last answer to change; **Stop here and review** ends it whenever you like.
- **Questions are read aloud** by a recorded voice (turn it off with "Read questions aloud"). The recordings say "your child"; the screen shows your child's name. **Nothing about your child is sent to the voice service:** the questions were recorded once, ahead of time.
- **Hands-free** (optional): after each question is read, the microphone opens by itself, and your answer is sent when you stop talking. No tapping. Best in a quiet room.
- **Nothing is saved until you check it.** The interview ends on the same form, filled in, for you to correct and save.
- **We never ask for a diagnosis, and never store one.** If you mention one, the app records only what you describe your child doing, needing or finding hard. (There's a safety net in the code too, not just an instruction to the AI.)
- **"Anything else"** is kept as a short note on the profile. The story writer reads it as background only; it never becomes a fact in a story.
- The microphone works on the computer running the app (or any https address once it's online); browsers block microphones on plain http addresses.

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
| Places | Name, photos, and what it's like: noisy, bright, smells like soap. | Sensory notes let the story describe it honestly. **Photos of a place** make its drawings look like the real room: a page set in the waiting room is drawn from your waiting-room photo (any people, signs and writing in it are left out), and the arrival page is drawn outside the front entrance, from your entrance photo. | Built |
| Getting there | How your child travels (car, bus, train, walking), what you call it ("the blue car") and what it looks like. | Your car gets its own reference drawing, so it's the same car on every page. Pictures show it from outside only. | Built |
| Steps | What happens, in order, from leaving home to coming back. | Each step becomes a page. | Built |
| "This step will happen no matter what" | A checkbox on a step (the shot, the haircut). | The story says so honestly, then offers your child real choices around it. It won't pretend a fixed thing is optional. | Built (stories) |
| Hard parts | What you expect to be tough: waiting, the shot, clippers. | The story describes these plainly and gives your child at least one option they control. | Built (stories) |
| Comfort items for this event | Extra comforts just for this event. | Added to the child's usual comfort items. | Built |

**Key promise to explain to parents:** the story only states facts you gave it. If something is missing, it leaves it out rather than guessing. The more detail you give, the richer the story.

## Your child's first story: "All about me"

Right after you add a child, the app offers to make their first story: a short, happy **"All about [name]"** story, made only from the profile (what your child looks like, what they love, what helps, their comfort items) plus how the app works ("I can tap the arrow to see the next page"). No hard things, no events, no date. You can also make it later from the child's profile. **Status:** built.

Why it comes first, in plain words for the guide: your child gets to know the drawn character as *me* before that character turns up at the doctor or a new school; they learn the app on a story with nothing worrying in it; and you get a first look at the pictures to fix anything that doesn't look like your child. Like every story, it reaches your child only when you publish it. Its outline shows only what fits a story about who your child is: the steps (their looks, what they love, what helps) and "anything else true about your child". There is no date, no other people, no places, no getting there and nothing hard, and the story and pictures ignore those even if they were filled in earlier.

## Making a new story

Plan first, gather photos later. **Status:** built.

1. **New story:** pick the child, then what's coming up (doctor visit, haircut, first day at a new school, meeting a new baby, or something else).
2. **Talk it through** (or **Skip to the outline**). The same one-question-per-screen interview as the child profile: when it is, who's going, why, the template's own questions ("Is there a shot planned?"), getting there, what the place is like, anything different from the usual steps (the usual steps are shown on that card), what'll be hardest, and anything else. "Tuesday at 10" is understood. Answers that cover several questions skip the others.
3. **The outline:** the whole plan, every part editable. Steps in order (move, add, delete; "will happen no matter what"; where; who's there), the people going and the people your child will meet (names, looks, a friendly fact), places and what they're like, getting there, hard parts, anything else. Renaming someone (e.g. "the nurse" to "Nurse Kim") renames them in the steps too.
4. **Save it.** You get the **photo to-do list** for this event, most helpful first, every photo optional. Take it with you: **Print or save as PDF** (just the checklist, with boxes to tick), **Email it to me** (opens your mail app with the list filled in), **Copy the list**, or **Share** on a phone. The list always stays with the event: from the home screen ("Outline and photo list" next to the story) or from the story editor.
5. **Add photos** right on the list, whenever you have them: **📷 Add photo** (on a phone it offers the camera). Photos of **people and comfort items** go through **SAM 3.1**, which cuts out just the person or the bunny from the background; you see the cutout, and that's what their drawings are made from, so they look like the real thing. If SAM can't find them clearly, the whole photo is used (a closer, plainer photo cuts out better). **Comfort-item photos are saved on your child's profile**, so Bear only needs photographing once for every story. **Photos of places** (the entrance, the waiting room, the exam room) are used to draw the pages set there, so the drawn rooms look like the real ones; people, signs and writing in them are left out of the drawings. Photos are straightened and shrunk, and stay in the app's private data folder. **Remove** takes one back off.
6. **Can't get one?** Choose for each: **Draw it from my description** (the usual), **Use a simple, generic drawing** (the role, like "a doctor", without the description), **Leave it out of the pictures** (that person or thing never appears), or **I'll take it at the event** (drawn from the description for now; a reminder for next time).
7. **Write the story now**, or come back once you have photos. Saved outlines wait on the home screen ("Outline, story not written yet"). Writing takes about 10 seconds and opens the story editor.

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

**Photo letter:** a short note to print, or show on your phone at the front desk, when asking to take pictures. Open it with **📄 Letter to show staff** on the photo list. It's filled in from the outline (your child's name, the day, the people and places you'd like to photograph) and explains what the photos are for: only your child's story, never posted, shared or used for ads, and sent to an AI service to make the drawings. It asks for staff photos only "if you're comfortable," suggests a name badge or website photo instead, never asks to photograph other people, and says it's fine to say no. **Phone view** makes the text big enough to read across a counter. **Status:** built. Two promises from the original draft wait until they're true: deleting photos any time (needs the delete feature) and that the AI service doesn't train on them (needs a check of Meta's terms).

## Fixing pictures

| Option | In plain words | Status |
| --- | --- | --- |
| Keep | This picture is good. | Planned |
| Redraw | Try a fresh version of this picture. | Planned |
| Fix this | Describe what's wrong ("make Sam face forward") and only that part changes. | Planned |
| Earlier versions | Every version is saved, so you can go back if a change makes it worse. | Planned |

If you change a page's words, its picture is marked "may not match anymore" so you can redraw it or keep it.

## The cast sheet (pictures)

Before drawing any pages, the app draws one portrait of each person (your child, whoever comes along, the people they'll meet) and one drawing of each comfort item. If you added a photo of a comfort item, its drawing is made from that photo. If you added a **photo of your child** (on their profile, under "Photo of …"), SAM 3.1 cuts them out of it and their portrait is drawn from that cutout, so the pictures look like them. It's only used to draw them, stays in the app, and **Remove photo** deletes it. Every page is then drawn to match those portraits, so everyone looks the same throughout. **Planned:** you approve or redraw the cast sheet before pages are drawn.

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
| **Read-along:** a real recorded voice reads the page when your child taps 🔈, and the word being read gets a soft, steady highlight (no flashing or movement). Tap ■ to stop. It never starts on its own. It pauses briefly between sentences, and on the first page it says the day and time in words ("Tuesday, November third. Ten o'clock in the morning."). Recorded once (`pnpm narrate`, for now), so it sounds exactly the same every time and works offline once opened. A page whose words you change afterwards goes back to the device's own voice until it's recorded again. Turning sound off in the sensory settings hides it. Choosing from a few voices and listening before publishing are planned. | Built (one voice; recorded with a command) |
| **Word help:** your child taps any word to see it big, in a card over the middle of the screen (no scrolling to find it), with **🔈 Say it**, which plays just that word in the same voice. Words that may be new at your child's reading level (picked by Spark, at most 3 a page) have a quiet dotted underline, and their card also shows a short, literal meaning ("A nurse is a person who helps the doctor and helps you."). Choosing which words get help, and sounding words out, are planned. | Built |
| Games built from your own photos. | Planned |
| Games built from the story's words (match, drag the word, fill in the blank). Never scored or timed; a miss just shows the answer. | Planned (after the hackathon) |
| A tour of the place with no people in it. | Planned (after the hackathon) |

## The public demo

The demo at app.newmythology.net asks for a **passcode** once (judges get it with the submission). The player app at play.newmythology.net needs no code: it only shows finished, published stories. The demo also has a **daily spending limit**: once it's reached, the app says so plainly and can't make anything new until the next day, while finished stories keep working.

## Privacy (the guide needs a plain section on this)

- **Read-along recordings:** to record a page, its words (which include your child's name) are sent to ElevenLabs, the voice service. Interview questions are different: they were recorded ahead of time and say "your child". Word help is picked by Meta's Spark from the same words the story was written from.
- Stories and pictures are made by Meta's AI models. What you enter and upload is sent to Meta to make them.
- We use Meta's standard service, **not** the discounted mode that lets Meta train its models on what you send.
- When you talk instead of typing, your voice goes to Meta's transcription service (Muse Voice Transcribe) to be turned into text, through our server. We don't save the recording; only the text you send becomes part of the profile or event.
- Pictures are made only from what you enter. The picture maker's web and image search are turned off, so it never looks up the real people or places you name online, and Meta isn't asked to keep the conversation.
- Never required: your child's real name (a nickname works), last names, addresses or medical details beyond what the story needs.
- **Open:** how long uploads are kept, and how a parent deletes everything. Decide before any real families use it.

## Open questions for the guide

- Who is the guide for first: parents, teachers, therapists? (Probably parents; teacher and therapist notes later.)
- Format: a short in-app tour, a help page, or both?
- Should we suggest starting settings by age? (Careful with principle 1: suggestions only, never assumptions.)
