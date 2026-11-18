FROM --platform=$BUILDPLATFORM oven/bun:1.4.4-alpine AS build

WORKDIR /repo

COPY --from=root package.json bun.lock ./
COPY --from=root packages/orm/package.json packages/orm/
COPY package.json ./packages/ui/package.json

RUN bun install --frozen-lockfile --filter '@example/ui'

COPY --from=root tsconfig.base.json ./

WORKDIR /repo/packages/ui

COPY . .

ARG API_PORT
ARG UI_PORT

RUN bunx vite build

FROM caddy:2-alpine AS runtime

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/packages/ui/dist /srv

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
