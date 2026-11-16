#!/usr/bin/env bash
# Creates docker/.env and docker/.envs/app.env from the examples (never overwrites), with a fresh ADMIN_TOKEN and APP_KEY.
# An existing app.env without APP_KEY gets one appended (it encrypts payment-gateway secrets; keep it, or they cannot be read).
set -euo pipefail
cd "$(dirname "$0")"
[ -f .env ] || cp .env.example .env
if [ ! -f .envs/app.env ]; then
  umask 077
  token=$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')
  sed "s/^ADMIN_TOKEN=.*/ADMIN_TOKEN=$token/" .envs/app.env.example | sed 's/[[:space:]]*#.*$//' >.envs/app.env
  echo "  wrote docker/.envs/app.env (admin token: make admin-token)"
fi
if ! grep -q '^APP_KEY=.\+' .envs/app.env; then
  umask 077
  key=$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')
  sed -i.bak '/^APP_KEY=/d' .envs/app.env && rm -f .envs/app.env.bak
  printf '\nAPP_KEY=%s\n' "$key" >>.envs/app.env
  echo "  added APP_KEY to docker/.envs/app.env"
fi
