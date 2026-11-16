#!/usr/bin/env bash
# Creates (or updates) the app's PostgreSQL role + database on docker-commons and writes the credentials into
# docker/.envs/app.env. Safe to re-run. Secrets go to psql on stdin, never on a command line, never printed.
set -euo pipefail
cd "$(dirname "$0")"

envf=.envs/app.env
get() { grep -E "^$1=" "$2" 2>/dev/null | tail -1 | cut -d= -f2- | sed 's/[[:space:]]*#.*$//' || true; }
set_kv() {
  local tmp; tmp=$(mktemp)
  if grep -qE "^$1=" "$3"; then
    awk -v k="$1" -v v="$2" 'BEGIN{FS=OFS="="} $1==k{print k "=" v; next} {print}' "$3" >"$tmp"
  else
    cat "$3" >"$tmp"; printf '%s=%s\n' "$1" "$2" >>"$tmp"
  fi
  cat "$tmp" >"$3"; rm -f "$tmp"
}
new_secret() { head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n'; }

test -f "$envf" || { echo "  $envf is missing: run make env first" >&2; exit 1; }
container=$(get COMMONS_PG_CONTAINER .env); container=${container:-common-postgres}
[ "$(docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null)" = "true" ] || { echo "  $container is not running" >&2; exit 1; }

name=$(get DB_NAME "$envf"); name=${name:-food}
[[ $name =~ ^[a-z_][a-z0-9_]{0,62}$ ]] || { echo "  DB_NAME must be lower-case letters, digits, _" >&2; exit 1; }
pw=$(get DB_PASSWORD "$envf"); [ -n "$pw" ] || pw=$(new_secret)

docker exec -i "$container" sh -c 'psql -q -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres' <<SQL
\set name '$name'
\set pw '$pw'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'name', :'pw') WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'name') \gexec
SELECT format('ALTER ROLE %I WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L', :'name', :'pw') \gexec
SELECT format('CREATE DATABASE %I OWNER %I ENCODING %L TEMPLATE template0', :'name', :'name', 'UTF8') WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'name') \gexec
SQL

set_kv DB_HOST "$container" "$envf"
set_kv DB_NAME "$name" "$envf"
set_kv DB_USER "$name" "$envf"
set_kv DB_PASSWORD "$pw" "$envf"
echo "  database \"$name\" ready on $container; app.env updated (password not shown)"
