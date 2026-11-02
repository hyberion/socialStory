# Launch checklist

What has to be in place before socialStory is reachable by anyone but us. Two stages, because they need very different things:

- **Stage A: hackathon demo.** Judges (and anyone with the link) can see it. **Test data only**: the fake Sam family, no real children, no real photos.
- **Stage B: public prototype.** Real parents, real children, real photos. Much more is required, mostly legal and safety, not code.

Status: **Have** = done. **Build** = we write it (code or config). **Get** = Brad has to obtain, sign up for, or decide it. **Check** = needs reading or advice before we rely on it.

## Stage A: hackathon demo (by Nov 4)

| Item | Why | Status |
| --- | --- | --- |
| Check the Official Rules for what judges need (live link? test login? video only?) | Decides whether a public build is required at all | **Have** (Nov 1): public repo, 3-minute video, and judges look at the live product. No live-link field on the form, so the links go in the description and README |
| A domain or subdomain for the two apps | The user app and player app each need an address | **Have**: app.newmythology.net and play.newmythology.net |
| DigitalOcean droplet with Docker | Runs everything | **Get** (Brad) account and droplet; **Build** (us) the setup |
| HTTPS | Required for the player app to install on a tablet and work offline | **Have** (Caddy does it automatically) |
| Dockerfile and compose for production | One command to deploy | **Have** (`docker-compose.prod.yml`, `infra/`): build steps and production start tested by hand; the first real Docker build is on the droplet |
| Separate production Meta key (`asd-app-prod`) | A leaked or abused demo key can't touch the dev key, and can be revoked alone | **Get** (Brad) |
| Spending protection | A public "generate" button lets strangers spend Meta credits | **Have**: `DAILY_BUDGET_USD` cap on every paid call, plus the passcode. **Check**: whether Meta's console offers a spending limit |
| Demo passcode on the user app | Keeps random visitors out of generation; judges get the code | **Have** (`DEMO_PASSCODE`; player app stays open) |
| Published demo kits | Judges see a finished story and game instantly, no waiting or cost | **Have** (doctor); haircut fixture still to write |
| Dev-only routes stay off in production | `/api/dev/*` must not exist publicly | **Have** (blocked when `NODE_ENV=production`); verify on the droplet |
| Only demo data on the server (`pnpm demo-data <ids>`), never the whole local data folder | It holds real test photos (Benjamin's) that must not go public | **Have** |
| Logs contain no story text or photos | Good habit from day one | **Check** (the request logger logs paths only; verify) |
| Three made-up demo children (Brad, Nov 1): a boy, a girl, a range of skin tones across them, and one older (11 or 12, shows age is drawn right), each with a licensed stock photo and generic comfort items ("tablet", "stuffed tiger") | Shows the pictures work for every child, not only one, and that skin tone is kept (the watercolor look once lightened Sam's brown skin; fixed Nov 1) | **Get** (Brad) stock photos; **Build** (us) the three profiles and their "All about me" stories |
| No branded characters in public demo material (video, demo kits, screenshots) | A family drawing their own child's Elmo for private use is one thing; an AI-drawn Elmo in a public, judged submission is another. Use generic toys (Sam's bunny) | **Have** for the fixtures; **check** the video before upload (Nov 1: Benjamin's "All about me" test drew a very recognizable Elmo) |

## Stage B: public prototype (real families)

### Accounts and data

| Item | Why | Status |
| --- | --- | --- |
| Sign-in (organizations with roles; see design doc "Accounts") | Real users, several adults per child | **Build** with an auth library; no passwords of our own |
| Email sending for magic links (Postmark, Resend or Amazon SES) plus SPF/DKIM on the domain | Sign-in links must arrive and not land in spam | **Get** (account) + **Build** (DNS records) |
| Player app pairing (QR or short code) | Children never log in | **Build** |
| Postgres with migrations | Stories, events, profiles currently live in files | **Build** (Postgres is running; schema not written) |
| Private photo storage (e.g. DigitalOcean Spaces, private bucket, short-lived links) | Photos off the app server, never publicly readable | **Get** (account) + **Build** |
| Nightly backups stored off the droplet, and a tested restore | A lost story is a broken promise to a child | **Build** |
| Delete everything (per child and per account), and a retention rule for uploads | Promised in the photo letter; required by privacy law | **Build** + **decide** how long we keep uploads |
| Data export for a parent | Their data, their copy | **Build** (later in stage B is fine) |

### Legal and policy (do before real families, not after)

| Item | Why | Status |
| --- | --- | --- |
| Privacy policy and terms in plain words | Required, and parents deserve to know | **Get** (draft with us, review by a lawyer) |
| COPPA review | The player app is aimed at children; US law has rules for collecting children's data, including parental consent | **Check** with a lawyer |
| Meta's terms for children's data and images | Confirm the Model API allows this use and how long Meta keeps inputs | **Check** (read current terms; record the answer in this file) |
| ElevenLabs' terms and settings for story text (Nov 1) | Read-along sends each page's words, including the child's name, to ElevenLabs. Check retention, whether they train on it, and whether zero-retention is available on our plan; say it plainly in the app, the privacy policy and the photo letter | **Check** |
| FERPA and district privacy agreements | Only when schools join | **Later** |
| Photo letter's promises verified against the above | Every line must be true | **Check** |
| Branded toys and characters in a family's own stories (Brad, Nov 1) | A child's comfort item is often a licensed character (Elmo). Brad's view: private, never sold or published, much like a family photo of the child holding the toy. Decide whether to draw it as it is or as a look-alike, and get a lawyer's view | **Check** with a lawyer; **Build** a notice in the terms and the app: "Characters, brands and products shown are the property of their respective owners." (A notice is good practice, not legal protection) |

### Safety and cost

| Item | Why | Status |
| --- | --- | --- |
| Per-account generation limits and rate limiting | Cost control and abuse prevention | **Build** |
| Invite-only or waitlist at first | Keeps growth at a size we can support | **Decide** (recommended) |
| Upload checks (file type, size, image content) | Someone will eventually upload something they shouldn't | **Build** + **Check** what Meta's own safety filters already block |
| Report a problem button (user app) | A way to flag a bad story or picture | **Build** |
| Security headers, secure session cookies, dependency updates | Standard web hygiene | **Build** |

### Running it

| Item | Why | Status |
| --- | --- | --- |
| Error tracking with personal data stripped out | Know when things break without collecting children's details | **Build** (self-hosted GlitchTip or Sentry, scrubbed) |
| Uptime monitoring | Know when it's down before a parent does | **Get** (free tier of any uptime checker) |
| No third-party analytics or trackers in the player app | Children's privacy; COPPA | **Have** (none); keep it that way |
| Minimal first-party usage counts in the user app (stories made, published) | Learn what's used without tracking anyone | **Build** |
| Picture-look counts: how many children use each look, and how often people switch away from one (Brad, Nov 1) | Decide which looks to keep, improve or add (storybook, clay, realistic are waiting) | **Build**: aggregate counts only, no names or images |
| Accessibility check (WCAG AA) of both apps | Many users and players are disabled | **Build** + review |
| Support email and a feedback channel | Parents need a human to reach | **Get** |
| What-if plan: key leaked, data exposed, server down | Know the first three steps before it happens | **Write** |

## "Child tracking"

What we track about a child, on purpose, and nothing more:

- Profile settings the user chose (reading level, sensory settings, comforts).
- Published kits and their events.
- The user's own after-event notes (the reflection: how it went, what was hard), which shape the next story.

What we never track: what the child taps, how long they look at a page, scores, streaks or anything that ranks them (principle 3). If we ever want usage data from the player app, it's a single "this story was opened" count, shown only to the child's own adults.
