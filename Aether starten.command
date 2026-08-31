#!/bin/bash
cd "$(dirname "$0")" || exit 1

export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"

if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js / npm wurde nicht gefunden."
  echo "Bitte Node von https://nodejs.org installieren und danach erneut doppelklicken."
  echo ""
  read -r -p "Taste drücken zum Schließen… "
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Erste Einrichtung: Pakete werden installiert…"
  npm install || {
    echo "Installation fehlgeschlagen."
    read -r -p "Taste drücken zum Schließen… "
    exit 1
  }
fi

echo "Aether startet unter http://127.0.0.1:45217"
echo "Dieses Fenster offen lassen. Stoppen: „Aether stoppen.command“ oder Ctrl+C."
echo ""

(sleep 2 && open "http://127.0.0.1:45217") &

npm run dev
echo ""
read -r -p "Taste drücken zum Schließen… "
