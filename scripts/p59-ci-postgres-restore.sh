#!/usr/bin/env bash
set -euo pipefail
# CI-only PostgreSQL logical backup/restore drill. This is NOT a Production backup.
if [[ "${CI:-}" != "true" || "${DATABASE_URL:-}" != "postgresql://postgres:postgres@127.0.0.1:5432/stayhub_p26_ci" || "${P26_E2E_BASE:-}" != "http://127.0.0.1:3000" ]]; then
  echo "REFUSED: isolated localhost PostgreSQL only" >&2
  exit 1
fi
for program in docker psql createdb dropdb; do
  command -v "$program" >/dev/null || { echo "Missing PostgreSQL client tool: $program" >&2; exit 1; }
done
export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGPASSWORD=postgres
source_db=stayhub_p26_ci
restore_db=stayhub_p59_restore_ci
workdir="$(mktemp -d)"
cleanup() {
  dropdb --if-exists "$restore_db" >/dev/null 2>&1 || true
  rm -rf "$workdir"
}
trap cleanup EXIT
# Never connect to Railway/Neon, never create or drop any non-CI database.
docker run --rm --network host -e PGPASSWORD=postgres -v "$workdir:/work" postgres:16 \
  pg_dump -h 127.0.0.1 -U postgres --format=custom --no-owner --no-privileges --file=/work/isolated.pgdump "$source_db"
test -s "$workdir/isolated.pgdump"
createdb -T template0 "$restore_db"
docker run --rm --network host -e PGPASSWORD=postgres -v "$workdir:/work:ro" postgres:16 \
  pg_restore -h 127.0.0.1 -U postgres --exit-on-error --no-owner --no-privileges --dbname="$restore_db" /work/isolated.pgdump
sql="SELECT
(SELECT count(*) FROM stayhub.schema_migrations),
(SELECT count(*) FROM stayhub.properties),
(SELECT count(*) FROM stayhub.units),
(SELECT count(*) FROM stayhub.billing_bills),
(SELECT count(*) FROM stayhub.billing_payments),
(SELECT coalesce(sum(total),0) FROM stayhub.billing_bills),
(SELECT coalesce(sum(amount),0) FROM stayhub.billing_payments),
(SELECT md5(string_agg(filename || ':' || checksum, ',' ORDER BY filename)) FROM stayhub.schema_migrations);"
original="$(psql -X -v ON_ERROR_STOP=1 -A -t -F '|' -d "$source_db" -c "$sql")"
restored="$(psql -X -v ON_ERROR_STOP=1 -A -t -F '|' -d "$restore_db" -c "$sql")"
if [[ "$original" != "$restored" ]]; then
  echo "FAIL: isolated PostgreSQL restore has mismatched schema ledger, record counts or financial aggregates" >&2
  exit 1
fi
IFS='|' read -r migrations properties units bills payments rest <<< "$restored"
if [[ "$migrations" != "16" || "$properties" -lt 1 || "$units" -lt 1 || "$bills" -lt 1 || "$payments" -lt 1 ]]; then
  echo "FAIL: restored fixture is missing expected migrations or business records" >&2
  exit 1
fi
echo "PASS P5.9 isolated PostgreSQL custom-format pg_dump / pg_restore into independent database"
echo "PASS restored migration ledger 16/16, property/room/bill/payment counts and monetary aggregates match"
echo "NOTE: This proves the CI restore mechanism, not a verified Railway Production backup or PITR policy."
