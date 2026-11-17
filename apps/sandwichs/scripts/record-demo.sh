#!/usr/bin/env bash
# Plays the whole customer + admin flow on a fresh empty database, in a phone viewport, and films
# the scenes as narrated videos: one .data/demo/NN-scene-title.mp4 per scene.
# Usage: npm run demo                → films every scene
#        npm run demo -- 9           → films only scene 9 (numbers are printed as the flow runs)
#        npm run demo -- qr livre    → films the scenes whose title contains one of the words
# The flow always runs in full (later scenes need the data of earlier ones); only filming is chosen.
# Needs Google Chrome and ffmpeg; Playwright may ask once for `npx playwright-core install ffmpeg`.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="$PWD/.data/demo"
PORT="${DEMO_PORT:-3100}"
DB_DIR="$PWD/.data/demo-db"
LOG="$PWD/.data/demo-server.log"

rm -rf "$OUT" "$DB_DIR"
mkdir -p "$OUT"

PGLITE_DATA_DIR="$DB_DIR" PORT="$PORT" npm run dev >"$LOG" 2>&1 &
SERVER=$!
# npm spawns next as a grandchild, so stop whatever listens on the port as well.
trap 'kill $SERVER 2>/dev/null; lsof -ti tcp:$PORT | xargs kill 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  curl -sf -o /dev/null "http://localhost:$PORT/" && break
  sleep 1
done
# Warm up the admin route so compilation doesn't show in the video.
curl -sf -o /dev/null "http://localhost:$PORT/admin/login" || true

SCENES="$*" BASE_URL="http://localhost:$PORT" RECORD_DIR="$OUT" node e2e/smoke.mjs
