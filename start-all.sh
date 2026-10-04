#!/bin/sh
set -eu

PERSISTENT_DATA_DIR="${PERSISTENT_DATA_DIR:-./data}"
mkdir -p "$PERSISTENT_DATA_DIR"
export WA_PHONE="${WA_PHONE:-393309297172}"
export WA_DB_PATH="${WA_DB_PATH:-file:${PERSISTENT_DATA_DIR}/wametaai.db?_foreign_keys=on}"

if [ ! -x ./meta-bridge/meta-bridge ]; then
  echo "ERROR: falta ./meta-bridge/meta-bridge; el despliegue debe ejecutar la fase de build de Nixpacks." >&2
  exit 1
fi

./meta-bridge/meta-bridge &
META_PID=$!

npm run start:bot &
BOT_PID=$!

cleanup() {
  kill "$META_PID" 2>/dev/null || true
  kill "$BOT_PID" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

wait "$BOT_PID"
