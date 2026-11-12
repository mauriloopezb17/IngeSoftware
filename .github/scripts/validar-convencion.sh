#!/usr/bin/env bash
# Valida las convenciones del repositorio para un pull request:
#   - nombre de rama: feature/, fix/, chore/, docs/ o test/ + nombre en minúsculas
#   - mensajes de commit: "[tipo] descripción" (se ignoran los merge commits)
#
# Uso: validar-convencion.sh <rama> <commit-base> <commit-cabeza>
set -euo pipefail

rama="${1:?Falta el nombre de la rama}"
base="${2:?Falta el commit base}"
cabeza="${3:?Falta el commit de cabeza}"

errores=0

patron_rama='^(feature|fix|chore|docs|test)/[a-z0-9][a-z0-9._-]*$'
patron_commit='^\[(feat|fix|refactor|chore|docs|test|perf|style)\] [^[:space:]]'
largo_maximo=100

if ! [[ "$rama" =~ $patron_rama ]]; then
  echo "::error::La rama '$rama' no cumple la convención. Use feature/, fix/, chore/, docs/ o test/ seguido de un nombre en minúsculas (ej. feature/api-base)."
  errores=$((errores + 1))
fi

while IFS=$'\t' read -r sha asunto; do
  [ -z "$sha" ] && continue

  if ! [[ "$asunto" =~ $patron_commit ]]; then
    echo "::error::El commit $sha no cumple el formato '[tipo] descripción': \"$asunto\" (tipos: feat, fix, refactor, chore, docs, test, perf, style)."
    errores=$((errores + 1))
  elif [ "${#asunto}" -gt "$largo_maximo" ]; then
    echo "::error::El commit $sha supera los $largo_maximo caracteres (${#asunto}): \"$asunto\"."
    errores=$((errores + 1))
  fi
done < <(git log --no-merges --format='%h%x09%s' "$base..$cabeza")

if [ "$errores" -gt 0 ]; then
  echo "Se encontraron $errores problema(s) de convención."
  exit 1
fi

echo "Rama y commits cumplen las convenciones."
