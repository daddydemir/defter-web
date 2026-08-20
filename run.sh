#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "Hata: Docker bulunamadı. Önce Docker'ı kurun." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Hata: 'docker compose' (v2) bulunamadı." >&2
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
fi

echo "Building ve başlatılıyor (defter-web)…"
docker compose up --build -d

WEB_PORT="${WEB_PORT:-35804}"

echo
echo "✓ defter-web çalışıyor:"
echo "    Web : http://localhost:${WEB_PORT}"
echo
echo "  Canlı loglar : docker compose logs -f"
echo "  Durdur       : docker compose down"
echo "  Yeniden başlat: $0"
echo
echo "Not: Frontend, /api isteklerini 'api:4000' adresine proxy'ler."
echo "     Tam yığın için defter-api deposunu aynı docker ağında çalıştırın"