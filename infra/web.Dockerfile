# The two front ends, built and served by Caddy (which also handles HTTPS).
# Build from the repo root:  docker build -f infra/web.Dockerfile .
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY apps/user-web/package.json apps/user-web/
COPY apps/player-app/package.json apps/player-app/
RUN pnpm install --frozen-lockfile --filter @socialstory/user-web... --filter @socialstory/player-app...
COPY packages/core packages/core
COPY apps/user-web apps/user-web
COPY apps/player-app apps/player-app
RUN pnpm --filter @socialstory/user-web build && pnpm --filter @socialstory/player-app build

FROM caddy:2-alpine
COPY infra/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/user-web/dist /srv/user-web
COPY --from=build /repo/apps/player-app/dist /srv/player-app
