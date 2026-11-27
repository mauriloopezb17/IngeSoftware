# Instalación local, desde cero

Guía para levantar el portal y el panel en una computadora nueva (Windows, macOS o Linux). Toma unos 15 minutos;
la mayor parte es la descarga de dependencias.

## 1. Requisitos

| Programa       | Versión          | Para qué                                           |
| -------------- | ---------------- | -------------------------------------------------- |
| Git            | cualquiera       | Clonar el repositorio.                             |
| Node.js        | **22 o superior** | API (`backend/`) y portal + panel (`frontend/`).   |
| Docker Desktop | cualquiera       | PostgreSQL 16 y Redis 7, sin instalarlos a mano.   |

Comprueba que están instalados (Docker Desktop debe estar **abierto**):

```bash
git --version
node --version     # v22.x o superior
docker --version
```

## 2. Clonar el repositorio

```bash
git clone https://github.com/mauriloopezb17/IngeSoftware.git
cd IngeSoftware
```

## 3. Base de datos y Redis (con los datos iniciales)

La primera vez que arranca, el contenedor de PostgreSQL crea la base `db_portal_cms` y ejecuta, en orden:

1. `database/db_portal_cms.sql` (esquema),
2. `database/migrations/*.sql` (todas las migraciones, 001 en adelante),
3. `database/seed/db_portal_cms_datos_iniciales.sql` (la parroquia, horarios, sacramentos, grupos, usuarios de desarrollo…),
4. **opcional:** `database/seed/db_portal_cms_datos_demo.sql` (agenda llena, más noticias, páginas de grupos y sacramentos,
   un Coordinador de grupo). Solo para demostraciones: **nunca en producción**.

Para cargar también los datos de demostración, crea un archivo `.env` en la **raíz** del repositorio con esta línea
(sin él, se cargan solo los datos iniciales):

```
CARGAR_DEMO=true
```

Después levanta los contenedores:

```bash
docker compose up -d
docker compose ps          # espera a que postgres y redis digan "healthy" (unos 20 segundos)
docker logs parroquia-postgres 2>&1 | grep "lista"   # debe mostrar: >> Base db_portal_cms lista
```

> Los scripts se ejecutan **solo la primera vez** (cuando el volumen de datos está vacío). Ver la sección 7 para cargar
> la demo en una base que ya existe o para empezar de cero.

## 4. API (backend)

```bash
cd backend
cp .env.example .env       # en PowerShell: Copy-Item .env.example .env
```

Edita `backend/.env` y reemplaza `JWT_SECRET` por un secreto propio. Para generarlo:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

El resto de valores ya coincide con `docker-compose.yml`. Las variables `OCI_S3_*` y `CDN_PUBLIC_URL` pueden quedar vacías:
el sitio funciona igual, pero **subir o borrar archivos** desde el panel responde 503 hasta configurarlas.

```bash
npm install
npm run dev                # API en http://localhost:3000
```

Comprueba en otra terminal: `curl http://localhost:3000/api/salud` → `"estado": "ok"`.

## 5. Portal y panel (frontend)

En **otra terminal**, desde la raíz del repositorio:

```bash
cd frontend
cp .env.example .env       # en PowerShell: Copy-Item .env.example .env
npm install
npm run dev                # http://localhost:5173
```

- Portal público: <http://localhost:5173>
- Panel de gestión: <http://localhost:5173/admin/login>

Vite reenvía `/api` a `http://localhost:3000`, así que la API del paso 4 debe estar corriendo.

## 6. Usuarios de desarrollo

Todos con la contraseña **`Parroquia2026!`** (solo para desarrollo y pruebas):

| Correo                       | Rol                  | Viene en                          |
| ---------------------------- | -------------------- | --------------------------------- |
| `admin@parroquia.test`       | Administrador        | datos iniciales                   |
| `parroco@parroquia.test`     | Párroco              | datos iniciales                   |
| `secretaria@parroquia.test`  | Secretaría           | datos iniciales                   |
| `marketing@parroquia.test`   | Marketing            | datos iniciales                   |
| `coordinador@parroquia.test` | Coordinador de grupo (Pastoral Juvenil) | datos de demostración |

## 7. Volver a cargar los datos

**Cargar la demo en una base que ya existe** (no duplica nada si se ejecuta dos veces). El repositorio está montado en el
contenedor en `/database`, así que el comando es igual en cualquier terminal:

```bash
docker exec parroquia-postgres psql -v ON_ERROR_STOP=1 -U parroquia -d db_portal_cms -f /database/seed/db_portal_cms_datos_demo.sql
```

> En **Git Bash** antepón `MSYS_NO_PATHCONV=1 ` al comando; si no, Git Bash convierte `/database/...` en una ruta de Windows.

**Empezar de cero** (borra **todos** los datos de la base local y vuelve a ejecutar el paso 3):

```bash
docker compose down -v
docker compose up -d
```

Si la API ya estaba corriendo, el portal puede mostrar datos viejos de la caché de Redis durante unos minutos; para verlos
al instante, reinicia Redis: `docker compose restart redis`.

## 8. Pruebas (opcional)

```bash
cd backend  && npm run lint && npm test      # requiere los contenedores del paso 3
cd frontend && npm run lint && npm test
cd frontend && npx playwright install chromium && npm run test:e2e   # e2e contra la API real
```

## Problemas comunes

| Síntoma | Causa y solución |
| --- | --- |
| `port is already allocated` al levantar Docker | Ya hay un PostgreSQL o Redis en 5432/6379. En el `.env` de la raíz agrega `POSTGRES_PORT=5433` (o `REDIS_PORT=6380`) y actualiza `DATABASE_URL` / `REDIS_URL` en `backend/.env`. |
| La API no arranca y menciona `JWT_SECRET` | El secreto debe tener al menos 32 caracteres (paso 4). |
| El portal carga pero sin datos, o el panel no inicia sesión | La API no está corriendo o no llega a la base: revisa la terminal de `npm run dev` del backend y `docker compose ps`. |
| No aparecen los datos de demostración | La base ya existía cuando agregaste `CARGAR_DEMO=true`: usa el comando de la sección 7. |
| Vitest falla con "failed to find the runner" en Windows | Ejecuta los comandos desde la ruta con las mayúsculas reales de la carpeta (por ejemplo `D:\Proyectos\...`, no `d:\proyectos\...`). |
