#!/bin/sh
set -eu

./meta-bridge/meta-bridge &
META_PID=$!

npm start &
BOT_PID=$!

cleanup() {
  kill "$META_PID" 2>/dev/null || true
  kill "$BOT_PID" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

wait "$BOT_PID"
