#!/bin/bash
cd "$(dirname "$0")" || exit 1

export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"

echo "Aether wird aktualisiert…"
echo ""

if ! command -v git >/dev/null 2>&1; then
  echo "Git wurde nicht gefunden. Bitte die Xcode-Kommandozeilenwerkzeuge installieren."
  echo ""
  read -r -p "Taste drücken zum Schließen… "
  exit 1
fi

if ! git pull; then
  echo ""
  echo "Update fehlgeschlagen. Oft hilft einmal im Terminal:"
  echo "  origin auth login"
  echo "Danach diese Datei erneut doppelklicken."
  echo ""
  read -r -p "Taste drücken zum Schließen… "
  exit 1
fi

if command -v npm >/dev/null 2>&1; then
  echo ""
  echo "Pakete werden geprüft…"
  npm install || {
    echo "npm install ist fehlgeschlagen. Aether starten trotzdem versuchen."
  }
else
  echo "npm nicht gefunden. Node.js von https://nodejs.org installieren, falls Aether nicht startet."
fi

echo ""
echo "Fertig. Als Nächstes „Aether starten.command“ doppelklicken."
echo ""
read -r -p "Taste drücken zum Schließen… "
