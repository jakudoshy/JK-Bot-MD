#!/bin/sh
set -eu

PERSISTENT_DATA_DIR="${PERSISTENT_DATA_DIR:-./data}"
mkdir -p "$PERSISTENT_DATA_DIR"
export WA_PHONE="${WA_PHONE:-393309297172}"
if [ -z "${WA_DB_PATH:-}" ]; then
  export WA_DB_PATH="file:${PERSISTENT_DATA_DIR}/wametaai.db?_foreign_keys=on"
else
  case "$WA_DB_PATH" in
    file:/*)
      DB_FILE="${WA_DB_PATH#file:}"
      DB_FILE="${DB_FILE%%\?*}"
      mkdir -p "$(dirname "$DB_FILE")"
      ;;
  esac
fi

if [ ! -x ./meta-bridge/meta-bridge ]; then
  echo "ERROR: falta ./meta-bridge/meta-bridge; el despliegue debe ejecutar la fase de build de Nixpacks." >&2
  exit 1
fi

./meta-bridge/meta-bridge &
META_PID=$!
sleep 2
if ! kill -0 "$META_PID" 2>/dev/null; then
  echo "ERROR: el puente Whatsmeow se cerró al iniciar; revisa el error anterior del sidecar." >&2
  exit 1
fi

npm run start:bot &
BOT_PID=$!

cleanup() {
  kill "$META_PID" 2>/dev/null || true
  kill "$BOT_PID" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

wait "$BOT_PID"
