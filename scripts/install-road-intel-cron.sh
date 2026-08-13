#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/deploy/apps/rampart-portal}"
LOG_DIR="${LOG_DIR:-/home/deploy/logs}"
NPM_BIN="${NPM_BIN:-/usr/bin/npm}"
CRON_TZ_VALUE="${CRON_TZ_VALUE:-America/Denver}"
CRON_SCHEDULE="${CRON_SCHEDULE:-0 5-20 * * *}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.local}"
RUN_NPM_CI="${RUN_NPM_CI:-true}"
RUN_BUILD="${RUN_BUILD:-false}"
RUN_TEST_CALL="${RUN_TEST_CALL:-true}"
ROAD_INTELLIGENCE_PROJECT_SLUG_VALUE="${ROAD_INTELLIGENCE_PROJECT_SLUG_VALUE:-3245-rampart-range-road}"
ROAD_INTELLIGENCE_REFRESH_MODE_VALUE="${ROAD_INTELLIGENCE_REFRESH_MODE_VALUE:-all}"
CRON_MARKER_BEGIN="# BEGIN rampart-road-intelligence-refresh"
CRON_MARKER_END="# END rampart-road-intelligence-refresh"

echo "Using app directory: $APP_DIR"

if [[ ! -d "$APP_DIR" ]]; then
  echo "App directory does not exist: $APP_DIR" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Expected env file not found: $ENV_FILE" >&2
  echo "Create it first with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." >&2
  exit 1
fi

mkdir -p "$LOG_DIR"

cd "$APP_DIR"

if [[ "$RUN_NPM_CI" == "true" ]]; then
  echo "Running npm ci..."
  "$NPM_BIN" ci
fi

if [[ "$RUN_BUILD" == "true" ]]; then
  echo "Running npm run build..."
  "$NPM_BIN" run build
fi

python3 - "$ENV_FILE" "$ROAD_INTELLIGENCE_PROJECT_SLUG_VALUE" "$ROAD_INTELLIGENCE_REFRESH_MODE_VALUE" <<'PY'
import pathlib
import sys

env_path = pathlib.Path(sys.argv[1])
project_slug = sys.argv[2]
refresh_mode = sys.argv[3]
text = env_path.read_text(encoding="utf-8")
lines = text.splitlines()

required = {
    "ROAD_INTELLIGENCE_PROJECT_SLUG": project_slug,
    "ROAD_INTELLIGENCE_REFRESH_MODE": refresh_mode,
}

existing_keys = set()
for line in lines:
    stripped = line.strip()
    if not stripped or stripped.startswith("#") or "=" not in stripped:
        continue
    existing_keys.add(stripped.split("=", 1)[0].strip())

for key, value in required.items():
    if key not in existing_keys:
        lines.append(f"{key}={value}")

env_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
PY

CRON_COMMAND="cd $APP_DIR && $NPM_BIN run road-intel-refresh >> $LOG_DIR/road-intelligence-refresh.log 2>&1"
CRON_BLOCK=$(cat <<EOF
$CRON_MARKER_BEGIN
CRON_TZ=$CRON_TZ_VALUE
$CRON_SCHEDULE $CRON_COMMAND
$CRON_MARKER_END
EOF
)

TMP_CRON_FILE="$(mktemp)"
if crontab -l >/dev/null 2>&1; then
  crontab -l | awk -v begin="$CRON_MARKER_BEGIN" -v end="$CRON_MARKER_END" '
    $0 == begin { skip=1; next }
    $0 == end { skip=0; next }
    skip != 1 { print }
  ' > "$TMP_CRON_FILE"
else
  : > "$TMP_CRON_FILE"
fi

printf '%s\n' "$CRON_BLOCK" >> "$TMP_CRON_FILE"
crontab "$TMP_CRON_FILE"
rm -f "$TMP_CRON_FILE"

echo "Cron installed:"
echo "$CRON_BLOCK"

if [[ "$RUN_TEST_CALL" == "true" ]]; then
  echo "Running one road intelligence refresh test..."
  "$NPM_BIN" run road-intel-refresh
fi

echo "Done."
