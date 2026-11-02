# Deploying the demo

One DigitalOcean droplet runs everything with Docker:

| Service | Role |
| --- | --- |
| `web` | Caddy: HTTPS certificates (automatic), serves the two built front ends, passes `/api` to the API ([`Caddyfile`](Caddyfile), [`web.Dockerfile`](web.Dockerfile)) |
| `api` | `apps/api`, not reachable from the internet except through Caddy |

Data is plain files in `~/socialStory/data` on the droplet. It's a copy of **only** the demo stories, packed with `pnpm demo-data`. Files from your own machine never go up wholesale.

Two safety settings are on for the public demo:

- **Passcode** (`DEMO_PASSCODE`): the user app asks for it once. Without it, nothing that costs money or shows a family's data works. The player app (published stories) stays open to anyone with the link.
- **Daily spending cap** (`DAILY_BUDGET_USD`): the server estimates what each AI call costs, and stops making new things for the day once the total reaches the cap. Finished stories keep working.

## Tonight, step by step

Commands marked **PC** run in PowerShell on your computer. **Droplet** ones run in the SSH session.

### 1. Make the droplet

DigitalOcean → Create → Droplets:

- **Image:** Ubuntu 24.04 (LTS).
- **Size:** Basic, Regular, **2 GB / 1 CPU** (about $12/month). 1 GB runs out of memory while building.
- **Region:** New York.
- **Authentication:** SSH key. If you don't have one in DigitalOcean yet, run `ssh-keygen -t ed25519` (**PC**), press Enter through the questions, then paste the contents of `C:\Users\<you>\.ssh\id_ed25519.pub` into DigitalOcean.

Copy the droplet's IP address when it's ready.

### 2. Point the names at it

At your DNS provider for `newmythology.net`, add two **A records** to the droplet's IP:

- `app` → IP
- `play` → IP

Do this first. Caddy can only get the HTTPS certificates once these names point at the droplet.

### 3. Set up the droplet (Droplet)

```
ssh root@<IP>
curl -fsSL https://get.docker.com | sh
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
```

### 4. Get the code onto it (Droplet)

The repo is private until Wednesday, so the droplet gets its own read-only key:

```
ssh-keygen -t ed25519 -f ~/.ssh/github -N ""
cat ~/.ssh/github.pub
```

GitHub → socialStory → Settings → Deploy keys → Add deploy key. Paste that line, leave **write access off**, and save. Then:

```
printf "Host github.com\n  IdentityFile ~/.ssh/github\n" >> ~/.ssh/config
git clone git@github.com:hyberion/socialStory.git
cd socialStory
```

Type `yes` if it asks about github.com's fingerprint.

### 5. The settings file (Droplet)

```
nano .env
```

Paste these, fill in the values, then save with Ctrl+O, Enter, Ctrl+X:

```
MODEL_API_KEY=<the new production Meta key>
DEMO_PASSCODE=<a passcode for the judges, 8+ characters>
DAILY_BUDGET_USD=10
USER_HOST=app.newmythology.net
PLAY_HOST=play.newmythology.net
```

The ElevenLabs key isn't needed on the server: read-alongs are recorded on your PC and copied up with the stories.

```
chmod 600 .env
```

### 6. Pack the demo stories (PC, in the repo)

```
pnpm demo-data doctor
```

Read the list it prints. Only what you see there goes up. Then copy it:

```
scp -r demo-data root@<IP>:~/socialStory/data
```

### 7. Start it (Droplet)

```
chown -R 1000:1000 data
docker compose -f docker-compose.prod.yml up -d --build
```

The first build takes a few minutes. Then:

```
docker compose -f docker-compose.prod.yml logs -f
```

Look for `API listening` and Caddy saying it obtained certificates. Press Ctrl+C to stop watching; the apps keep running.

### 8. Check it

- https://play.newmythology.net: the doctor story, no passcode.
- https://app.newmythology.net: asks for the passcode, then shows the app.
- On a tablet: open play.newmythology.net and use "Add to Home Screen".

## Later updates

- **New code (Droplet):** `cd ~/socialStory && git pull && docker compose -f docker-compose.prod.yml up -d --build`
- **New or updated demo stories (PC, then Droplet):** `pnpm demo-data doctor <other ids>`, then `scp -r demo-data/* root@<IP>:~/socialStory/data/`, then `chown -R 1000:1000 ~/socialStory/data` on the droplet. No restart needed.
- **Today's spend (Droplet):** `cat ~/socialStory/data/spend/$(date -u +%F).json`
