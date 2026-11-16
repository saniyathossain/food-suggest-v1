#!/usr/bin/env bash
# Creates the private bucket + a dedicated MinIO user limited to that bucket on docker-commons, and points
# docker/.envs/app.env at it (STORAGE_DISK=s3). Safe to re-run. Secrets travel by env/stdin, never printed.
set -euo pipefail
cd "$(dirname "$0")"

envf=.envs/app.env
get() { grep -E "^$1=" "$2" 2>/dev/null | tail -1 | cut -d= -f2- || true; }
set_kv() {
  local tmp; tmp=$(mktemp)
  if grep -qE "^$1=" "$3"; then
    awk -v k="$1" -v v="$2" 'BEGIN{FS=OFS="="} $1==k{print k "=" v; next} {print}' "$3" >"$tmp"
  else
    cat "$3" >"$tmp"; printf '%s=%s\n' "$1" "$2" >>"$tmp"
  fi
  cat "$tmp" >"$3"; rm -f "$tmp"
}

test -f "$envf" || { echo "  $envf is missing: run make env first" >&2; exit 1; }
container=$(get COMMONS_MINIO_CONTAINER .env); container=${container:-common-minio-1}
[ "$(docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null)" = "true" ] || { echo "  $container is not running (docker-commons: docker compose up -d minio)" >&2; exit 1; }
mc_image=$(get MC_IMAGE .env); mc_image=${mc_image:-pgsty/mc:RELEASE.2026-11-09T00-00-00Z}

bucket=$(get S3_BUCKET "$envf"); bucket=${bucket:-food-media}
user=$(get S3_ACCESS_KEY "$envf"); user=${user:-food}
secret=$(get S3_SECRET_KEY "$envf"); [ -n "$secret" ] || secret=$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')
root_user=$(docker exec "$container" printenv MINIO_ROOT_USER)
root_pass=$(docker exec "$container" printenv MINIO_ROOT_PASSWORD)

policy=$(cat <<JSON
{"Version":"2012-10-17","Statement":[
 {"Effect":"Allow","Action":["s3:GetBucketLocation","s3:ListBucket"],"Resource":["arn:aws:s3:::$bucket"]},
 {"Effect":"Allow","Action":["s3:GetObject","s3:PutObject","s3:DeleteObject"],"Resource":["arn:aws:s3:::$bucket/*"]}]}
JSON
)

docker run --rm -i --network common-net --entrypoint sh \
  -e ROOT_USER="$root_user" -e ROOT_PASS="$root_pass" -e APP_USER="$user" -e APP_SECRET="$secret" \
  -e BUCKET="$bucket" -e POLICY="$policy" "$mc_image" -s <<'SH' >/dev/null
set -e
mc alias set commons http://common-minio:9000 "$ROOT_USER" "$ROOT_PASS"
mc mb --ignore-existing "commons/$BUCKET"
mc anonymous set none "commons/$BUCKET"
printf '%s' "$POLICY" > /tmp/policy.json
mc admin policy create commons "$BUCKET-rw" /tmp/policy.json
mc admin user add commons "$APP_USER" "$APP_SECRET"
mc admin policy attach commons "$BUCKET-rw" --user "$APP_USER" || true
SH

set_kv STORAGE_DISK s3 "$envf"
set_kv S3_ENDPOINT http://common-minio:9000 "$envf"
set_kv S3_REGION us-east-1 "$envf"
set_kv S3_BUCKET "$bucket" "$envf"
set_kv S3_ACCESS_KEY "$user" "$envf"
set_kv S3_SECRET_KEY "$secret" "$envf"
set_kv S3_PATH_STYLE true "$envf"
echo "  bucket \"$bucket\" (private) + user \"$user\" ready on $container; app.env uses STORAGE_DISK=s3 (secret not shown)"
