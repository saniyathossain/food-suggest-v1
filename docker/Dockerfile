# syntax=docker/dockerfile:1.7
# One image: the Rust API serving the built React app. Build context is the repository root.

ARG NODE_IMAGE=node:24-alpine
ARG RUST_IMAGE=rust:1-slim-bookworm
ARG RUNTIME_IMAGE=debian:bookworm-slim

# ---------------------------------------------------------------- web assets
FROM ${NODE_IMAGE} AS web
# Same npm as the developer machines (the lockfile format follows npm's major); bump with package.json's engines.
ARG NPM_VERSION=11.6.2
RUN npm install -g npm@${NPM_VERSION} --no-audit --no-fund
WORKDIR /web
COPY codes/frontend/package.json codes/frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY codes/frontend/ ./
RUN npx tsc -p tsconfig.json --noEmit && npx vite build

# ---------------------------------------------------------------- api build
FROM ${RUST_IMAGE} AS api
WORKDIR /src
COPY codes/backend/ ./
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/src/target \
    cargo build --release --locked && cp target/release/food /usr/local/bin/food

# ---------------------------------------------------------------- development (cargo watch-free: rebuild on restart)
FROM ${RUST_IMAGE} AS dev
WORKDIR /app
ENV CARGO_TARGET_DIR=/target
CMD ["cargo", "run", "--", "serve"]

# ---------------------------------------------------------------- runtime
FROM ${RUNTIME_IMAGE} AS runtime
ARG VERSION=dev
ENV APP_VERSION=${VERSION} APP_ENV=production WEB_ROOT=/app/public LANG=C.UTF-8
RUN groupadd --gid 10001 food \
 && useradd --uid 10001 --gid food --no-create-home --shell /usr/sbin/nologin food \
 && mkdir -p /app/storage/app /app/storage/logs \
 && chown -R food:food /app/storage
WORKDIR /app
COPY --from=api /usr/local/bin/food /usr/local/bin/food
COPY --from=web /web/dist /app/public
COPY codes/backend/database/assets /app/assets
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/food"]
CMD ["serve"]
