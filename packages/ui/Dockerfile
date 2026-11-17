# Build from the repo root, passing the root as a named context:
#   docker build --build-context root=. -f packages/ui/Dockerfile packages/ui
FROM --platform=$BUILDPLATFORM oven/bun:1.4.4-alpine AS build

WORKDIR /repo

COPY --from=root package.json bun.lock ./
# the root package depends on @example/orm, so its manifest has to exist for the
# frozen install to match the lockfile, even though ui itself does not use it
COPY --from=root packages/orm/package.json packages/orm/
COPY package.json ./packages/ui/package.json

RUN bun install --frozen-lockfile --filter '@example/ui'

COPY --from=root tsconfig.base.json ./

WORKDIR /repo/packages/ui

COPY . .

RUN bunx vite build

FROM caddy:2-alpine AS runtime

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/packages/ui/dist /srv

EXPOSE 5173

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
