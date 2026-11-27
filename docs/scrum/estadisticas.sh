#!/usr/bin/env bash
# Estadísticas de commits y pull requests por integrante y por sprint (rama main de origin).
# Uso (desde la raíz del repositorio):  bash docs/scrum/estadisticas.sh
# Versión para Linux/macOS/Git Bash de estadisticas.ps1. Solo usa git: el autor de cada PR se
# APROXIMA con el autor del último commit de su rama (falla cuando otro integrante fusionó main
# dentro de esa rama). Para el autor real y las revisiones, usar estadisticas.ps1 con GitHub CLI.
set -euo pipefail

git fetch --quiet origin main
rama=origin/main

normalizar() {
  case "$1" in
    "Mauricio Lopez") echo "Mauricio López" ;;
    "SamielTrujillo" | "Samiel Trujillo") echo "Samiel Trujillo" ;;
    "Ian Coaquira Uriarte") echo "Ian Coaquira" ;;
    *) echo "$1" ;;
  esac
}

sprint() {
  local nombre="$1" desde="$2" hasta="$3"
  echo
  echo "== $nombre ($desde a $hasta, fin excluido) =="
  echo "Commits por integrante:"
  git log "$rama" --no-merges --since="${desde}T00:00:00-04:00" --until="${hasta}T00:00:00-04:00" --format='%an' |
    while read -r autor; do normalizar "$autor"; done | sort | uniq -c | sort -rn
  echo "PRs fusionados por integrante (aproximado):"
  git log "$rama" --first-parent --merges --since="${desde}T00:00:00-04:00" --until="${hasta}T00:00:00-04:00" \
    --format='%H %s' | grep 'Merge pull request #' | while read -r hash _; do
      normalizar "$(git log -1 --format='%an' "${hash}^2")"
    done | sort | uniq -c | sort -rn
}

sprint "Sprint 1" 2026-09-23 2026-10-27
sprint "Sprint 2" 2026-10-27 2026-11-14
sprint "Sprint 3" 2026-11-14 2026-11-28
