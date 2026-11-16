# Pathya (food-suggest) — every command runs through Docker. `make help` lists them.
SHELL := /bin/bash
COMPOSE := docker compose -f docker/docker-compose.yml
DEV := $(COMPOSE) -f docker/docker-compose.dev.yml

.PHONY: help env db s3 media types types-check routes make-migration migrate-status cache-clear up dev down logs build migrate seed fresh about admin-token check web-build

help: ## List commands
	@grep -E '^[a-z-]+:.*## ' Makefile | awk 'BEGIN{FS=":.*## "}{printf "  %-12s %s\n", $$1, $$2}'

env: ## Create docker/.env and docker/.envs/app.env from examples
	@docker/env.sh

db: env ## Create role + database on docker-commons (common-postgres)
	@docker/commons-db.sh

s3: env ## Create private bucket + scoped user on docker-commons MinIO
	@docker/commons-s3.sh

media: ## Copy pending media-library images into storage
	$(COMPOSE) run --rm app media:import

build: ## Build the app image
	$(COMPOSE) build app

up: db s3 ## Build and start (http://127.0.0.1:8100)
	$(COMPOSE) up -d --build app

dev: db s3 ## Start app + Vite hot reload (http://127.0.0.1:5180)
	$(DEV) up -d --build

down: ## Stop everything
	$(DEV) down

logs: ## Follow app logs
	$(COMPOSE) logs -f app

migrate: ## Apply pending migrations
	$(COMPOSE) run --rm app migrate

seed: ## Re-seed catalog content (overwrites admin edits)
	$(COMPOSE) run --rm app seed --force

fresh: ## Drop schema, migrate, seed (local only)
	$(COMPOSE) run --rm app fresh

about: ## Show active drivers
	$(COMPOSE) run --rm app about

admin-token: ## Print the admin token for /admin
	@grep -E '^ADMIN_TOKEN=' docker/.envs/app.env | cut -d= -f2-

types: ## Generate TypeScript types from the Rust enums + DTOs (ts-rs) into codes/frontend/src/generated
	docker run --rm -e TS_RS_EXPORT_DIR=/frontend/src/generated -v "$$PWD/codes/backend":/app -v "$$PWD/codes/frontend/src/generated":/frontend/src/generated -v food-cargo:/usr/local/cargo/registry -v food-target:/app/target -w /app rust:1-slim cargo test --quiet export_bindings

types-check: types ## Fail when generated types differ from the committed ones
	git diff --exit-code -- codes/frontend/src/generated

routes: ## List HTTP routes
	$(COMPOSE) run --rm app route:list

migrate-status: ## Show applied / pending migrations
	$(COMPOSE) run --rm app migrate:status

cache-clear: ## Forget the catalog snapshot
	$(COMPOSE) run --rm app cache:clear

make-migration: ## New SQL migration: make make-migration NAME=add_recipes
	@docker/make-migration.sh "$(NAME)"

check: ## Typecheck web + cargo check (in Docker)
	@# an effect must return nothing or a cleanup function: `useEffect(() => call(), …)` leaks call's value (scrollIntoView
	@# returns a Promise in current Chrome) and React crashes calling it on unmount; write `useEffect(() => { call(); }, …)`
	@! grep -rnE 'use(Layout)?Effect\(\(\) => [^{(]' codes/frontend/src --include='*.ts' --include='*.tsx' | grep -vE '=> (stop|\(\) =>)' || (echo 'expression-bodied useEffect found (see above): use a block body'; exit 1)
	cd codes/frontend && npx tsc -p tsconfig.json --noEmit
	docker run --rm -v "$$PWD/codes/backend":/app -v food-cargo:/usr/local/cargo/registry -v food-target:/app/target -w /app rust:1-slim cargo check --locked
