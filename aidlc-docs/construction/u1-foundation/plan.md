# U1 Foundation — plan & verification

## Built
- [x] Cargo crate `food-api` (lib + `food` binary), Laravel-shaped folders, contracts/enums/DTOs/exceptions.
- [x] Drivers from env: CACHE_DRIVER memory|redis|null, LOG_CHANNEL stdout|file|stack, LOG_FORMAT json|pretty,
      STORAGE_DISK local; redis outage falls back to memory.
- [x] Migration 0001 (9 tables, CHECK constraints mirroring enums, updated_at triggers).
- [x] JSON seeder via ORM (`database/seeders/bangladesh.json`).
- [x] Catalog snapshot cache + public endpoints + plan merge + admin endpoints.
- [x] React app: menubar, dock (one icon per condition, dynamic), wallpaper, home + widgets, condition, plan,
      food lookup, admin; EN/BN; light/dark/auto; print stylesheet.
- [x] Docker: runtime image (non-root, read-only), dev overlay with Vite, commons-db script, Makefile.

## Media (U1.1)
- [x] License-free covers (Pexels License: free use, no attribution required) for 6 conditions + 6 meal slots.
- [x] `media` table (migration 0003): directory, variants, status pending/stored/failed, source URL, license, alt.
      Conditions and meal slots reference `media_id`; 0003 converts the 0002 `image_url` columns.
- [x] `StorageDisk` S3 driver (rust-s3) → docker-commons MinIO, private bucket `food-media`, user `food` limited to
      it by policy `food-media-rw` (`make s3`). `STORAGE_DISK=local` still works.
- [x] Import: allowlisted hosts (images.pexels.com, images.unsplash.com) → WebP 32/480/960/1600 px variants via the
      source CDN → `media/<uuid>/<w>.webp`. Runs in background after boot and via `food media:import`.
- [x] `GET /media/{id}?w=` streams the nearest variant, `immutable` 1-year cache; while pending, 307 to the source.
- [x] Web: `<Photo>` — gradient → 32 px blurred preview (only near viewport) → responsive WebP fades/sharpens in.
- [x] Admin: media library grid, import by URL, tap to set condition cover.

### docker-commons changes
- MinIO enabled: `.env` COMPOSE_FILE += `docker-compose.override.minio.yml`; ports 127.0.0.1:9000/9001.
- `minio/minio` left Docker Hub → `MINIO_IMAGE=pgsty/minio:RELEASE.2026-08-04T00-00-00Z`,
  `MINIO_CLIENT_IMAGE=pgsty/mc:RELEASE.2026-11-09T00-00-00Z`; `.envs/minio.env` gained MINIO_ROOT_USER/PASSWORD
  (same values as the old ACCESS/SECRET keys). Backups: `*.bak*` beside each edited file.

## Verification
See the end of `README.md` → "Verified". Not yet: automated tests, Lighthouse run, screen-reader pass.
