#!/usr/bin/env bash
# Serve the WMC-3 presentation locally.
# Usage: ./scripts/serve-presentation.sh [PORT]

cd "$(dirname "$0")/.."
PORT="${1:-9000}"

echo "Serving EmberExchange WMC-3 presentation at http://localhost:${PORT}/presentation.html"
python3 -m http.server "${PORT}" --directory .
