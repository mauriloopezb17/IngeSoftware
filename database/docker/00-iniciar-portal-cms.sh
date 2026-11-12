#!/bin/bash
# Inicializa la base db_portal_cms la primera vez que arranca el contenedor.
# Orden: esquema -> migraciones numeradas -> datos iniciales (si CARGAR_SEED=true).
set -euo pipefail
shopt -s nullglob

ejecutar() {
  echo ">> Aplicando $1"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$1"
}

ejecutar /database/db_portal_cms.sql

for migracion in /database/migrations/*.sql; do
  ejecutar "$migracion"
done

if [ "${CARGAR_SEED:-true}" = "true" ]; then
  ejecutar /database/seed/db_portal_cms_datos_iniciales.sql
else
  echo ">> CARGAR_SEED=false: se omiten los datos iniciales"
fi

echo ">> Base $POSTGRES_DB lista"
