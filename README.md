# Pathya (পথ্য) — food that fits your body

Diet, meal-timing and lifestyle guidance for **asthma, diabetes, fatty liver, migraine, thyroid and insomnia**,
Bangladesh first, English / বাংলা. Rust API + React, macOS-style liquid-glass UI.

- Product: [PRODUCT.md](PRODUCT.md) · Plans: [aidlc-docs/](aidlc-docs/aidlc-state.md) · AI rules: [CLAUDE.md](CLAUDE.md)

## Run

Needs Docker and docker-commons (`common-postgres`, optional `common-redis-1`) on the `common-net` network.

```bash
make up            # env files + database + build + start → http://127.0.0.1:8100
make s3            # private MinIO bucket + scoped user (docker-commons)
make dev           # same + Vite hot reload → http://127.0.0.1:5180
make admin-token   # token for http://127.0.0.1:8100/admin
make help          # everything else (migrate, seed, fresh, logs, about, check)
```

## Accounts

Sign up at `/register`. Make the first super admin from the console, then manage everyone in `/admin`:

```bash
docker compose -f docker/docker-compose.yml exec app food user:role you@example.com super_admin
```

Password-reset links go to the app log (`MAIL_DRIVER=log`) until an SMTP driver is set. Tiers, limits and prices are
edited in Admin → Tiers and limits; medicines (brands) are imported there as CSV.

## Switch drivers (Laravel-style, `docker/.envs/app.env`, then restart)

| Concern | Variable | Values |
|---|---|---|
| Cache | `CACHE_DRIVER` | `memory` (default) · `redis` (`REDIS_URL`) · `null` |
| Log | `LOG_CHANNEL` / `LOG_FORMAT` / `LOG_LEVEL` | `stdout` · `file` · `stack` / `json` · `pretty` / EnvFilter |
| Storage | `STORAGE_DISK` | `s3` (MinIO via `make s3`, any S3 via `S3_*`) · `local` |
| Database | `DB_*` or `DB_URL` | PostgreSQL |
| Boot | `DB_AUTO_MIGRATE`, `DB_AUTO_SEED` | `true` / `false` |

## Layout

```
codes/backend    Rust: bootstrap · config · routes · app/{contracts,enums,dtos,exceptions,http,models,
                 repositories,services,providers,support} · database/{migrations,seeders}
codes/frontend   React: lib (api, router, prefs, i18n) · lang (en, bn) · components · pages (lazy) · styles
docker/          Dockerfile, compose (+ dev overlay), env examples, commons-db.sh
aidlc-docs/      requirements, design, roadmap, unit plans
```

## API

`GET /api/v1/bootstrap?lang=bn` · `GET /api/v1/conditions/{slug}` · `GET /api/v1/foods?q=` ·
`POST /api/v1/plan` `{country, age, gender, conditions[]}` · admin under `/api/v1/admin/*` (Bearer token).
Full table: [application-design.md](aidlc-docs/inception/application-design.md).

> Guidance is general and educational, not medical advice. The app says so on every guidance screen.
