#!/bin/bash
cd "$(dirname "$0")" || exit 1

PIDS="$(lsof -ti tcp:45217 2>/dev/null || true)"

if [ -z "$PIDS" ]; then
  echo "Aether läuft gerade nicht."
else
  echo "$PIDS" | xargs kill 2>/dev/null || true
  sleep 0.4
  STILL="$(lsof -ti tcp:45217 2>/dev/null || true)"
  if [ -n "$STILL" ]; then
    echo "$STILL" | xargs kill -9 2>/dev/null || true
  fi
  echo "Aether wurde gestoppt."
fi

echo ""
read -r -p "Taste drücken zum Schließen… "
