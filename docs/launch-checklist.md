# Launch checklist

What has to be in place before socialStory is reachable by anyone but us. Two stages, because they need very different things:

- **Stage A: hackathon demo.** Judges (and anyone with the link) can see it. **Test data only**: the fake Sam family, no real children, no real photos.
- **Stage B: public prototype.** Real parents, real children, real photos. Much more is required, mostly legal and safety, not code.

Status: **Have** = done. **Build** = we write it (code or config). **Get** = Brad has to obtain, sign up for, or decide it. **Check** = needs reading or advice before we rely on it.

## Stage A: hackathon demo (by Nov 4)

| Item | Why | Status |
| --- | --- | --- |
| Check the Official Rules for what judges need (live link? test login? video only?) | Decides whether a public build is required at all | **Get** (Brad) |
| A domain or subdomain for the two apps | The user app and player app each need an address | **Get** (Brad): pick one; Caddy config is ready for any name |
| DigitalOcean droplet with Docker | Runs everything | **Get** (Brad) account and droplet; **Build** (us) the setup |
| HTTPS | Required for the player app to install on a tablet and work offline | **Have** (Caddy does it automatically) |
| Dockerfile and compose for production | One command to deploy | **Build**: exists, never tested on a real Docker host |
| Separate production Meta key (`asd-app-prod`) | A leaked or abused demo key can't touch the dev key, and can be revoked alone | **Get** (Brad) |
| Spending protection | A public "generate" button lets strangers spend Meta credits | **Build**: daily budget cap on the server, plus generation behind a demo passcode. **Check**: whether Meta's console offers a spending limit |
| Demo passcode on the user app | Keeps random visitors out of generation; judges get the code | **Build** (small) |
| Published demo kits | Judges see a finished story and game instantly, no waiting or cost | **Have** (doctor); haircut fixture still to write |
| Dev-only routes stay off in production | `/api/dev/*` must not exist publicly | **Have** (blocked when `NODE_ENV=production`); verify on the droplet |
| Logs contain no story text or photos | Good habit from day one | **Check** (the request logger logs paths only; verify) |

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
| FERPA and district privacy agreements | Only when schools join | **Later** |
| Photo letter's promises verified against the above | Every line must be true | **Check** |

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
