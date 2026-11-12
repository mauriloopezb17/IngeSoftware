#!/bin/bash
# Inicializa la base db_portal_cms la primera vez que arranca el contenedor.
# Orden: esquema -> migraciones numeradas -> datos iniciales (si CARGAR_SEED=true).
set -euo pipefail
shopt -s nullglob

# En el contenedor los scripts están montados en /database; en CI se usa ./database.
DB_DIR="${DB_DIR:-/database}"

ejecutar() {
  echo ">> Aplicando $1"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$1"
}

ejecutar "$DB_DIR/db_portal_cms.sql"

for migracion in "$DB_DIR"/migrations/*.sql; do
  ejecutar "$migracion"
done

if [ "${CARGAR_SEED:-true}" = "true" ]; then
  ejecutar "$DB_DIR/seed/db_portal_cms_datos_iniciales.sql"
else
  echo ">> CARGAR_SEED=false: se omiten los datos iniciales"
fi

echo ">> Base $POSTGRES_DB lista"
