#!/usr/bin/env bash
# Creates codes/backend/database/migrations/NNNN_<name>.sql and registers it in src/database/migrator.rs.
set -euo pipefail
cd "$(dirname "$0")/../codes/backend"
name=${1:-}
[[ $name =~ ^[a-z0-9_]{3,60}$ ]] || { echo "  NAME must be lower-case letters, digits and _ (e.g. add_recipes)" >&2; exit 1; }
last=$(ls database/migrations | sed -n 's/^\([0-9]\{4\}\)_.*/\1/p' | sort | tail -1)
next=$(printf '%04d' $((10#${last:-0} + 1)))
file="database/migrations/${next}_${name}.sql"
printf -- '-- %s. Append-only: never edit a migration once applied.\n' "$name" > "$file"
python3 - "$next" "$name" <<'PY'
import sys, re
number, name = sys.argv[1], sys.argv[2]
path = 'src/database/migrator.rs'
source = open(path).read()
entry = f'    ("{number}_{name}", include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/database/migrations/{number}_{name}.sql"))),\n'
source = source.replace('];\n', entry + '];\n', 1)
open(path, 'w').write(source)
PY
echo "  created $file and registered it"
