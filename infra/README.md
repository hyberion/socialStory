# Infrastructure

Not wired up yet. Planned production shape on one DigitalOcean droplet:

| Service | Role |
| --- | --- |
| `caddy` | Reverse proxy with automatic HTTPS; serves the two built front ends ([`Caddyfile`](Caddyfile)) |
| `api` | `apps/api` container |
| `postgres` | Database, with a nightly dump to DigitalOcean Spaces |

Photos and generated images go to DigitalOcean Spaces, not the droplet's disk.

Deploy: a GitHub Action on push to `main` SSHes into the droplet, pulls, and runs `docker compose up -d --build`. Use a separate Meta key on the server (`asd-app-prod`).
