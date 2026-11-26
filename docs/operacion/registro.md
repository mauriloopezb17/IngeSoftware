# Registro estructurado de consultas y persistencia opcional en archivo

La API utiliza `pino` y `pino-http` para emitir logs estructurados en JSON con un identificador único por petición (`reqId` / cabecera `X-Request-Id`).

## Cómo se identifica una consulta

El middleware `registrarConsulta` (montado una sola vez en `backend/src/app.js`) escucha el evento `finish` de la respuesta y emite un registro estructurado cuando aplica una de estas dos reglas:

1. **Exportación (`tipo: "exportacion"`):** cualquier ruta que monte el middleware `marcarConsulta('exportacion')`.
2. **Listado (`tipo: "listado"`):** automáticamente cualquier petición `GET` cuya consulta validada (`req.validado.query`) incluya el parámetro `pagina` (es decir, que use el esquema común `paginacion`), así como los `400` en `GET` que incluyan `pagina` o `porPagina` en `req.query`.

Las peticiones que no son listados ni exportaciones (por ejemplo `/api/salud`, detalle individual o mutaciones) no emiten el evento `consulta`.

## Campos de cada línea `consulta`

| Campo | Tipo | Descripción |
|---|---|---|
| `evento` | `string` | Siempre `"consulta"`. |
| `tipo` | `"listado" \| "exportacion"` | Tipo de consulta registrada. |
| `ruta` | `string` | Patrón de ruta de Express (p. ej. `/api/admin/eventos` o `/api/sedes/:sede/eventos`), sin valores concretos de IDs ni query string. |
| `filtros` | `object` | Filtros enviados explícitamente por el cliente en la query (sin valores por defecto que no envió), ya saneados por Zod cuando pasó la validación. |
| `usuario` | `{ id, rol } \| "anonimo"` | Usuario autenticado del panel o `"anonimo"` en endpoints públicos. |
| `estado` | `number` | Código de estado HTTP de la respuesta (`200`, `400`, `500`, etc.). |
| `duracionMs` | `number` | Tiempo total de atención en milisegundos calculado con `process.hrtime.bigint()`. |
| `sede` | `string \| number` *(opcional)* | Slug o identificador de la sede cuando está disponible en la petición o sesión. |
| `reqId` | `string` | Identificador de correlación de la petición (`X-Request-Id`). |

Los niveles aplicados por estado HTTP son:
- `2xx` / `3xx`: `info` (`level: 30`)
- `4xx`: `warn` (`level: 40`)
- `5xx`: `error` (`level: 50`, incluyendo la causa interna en `err`, nunca expuesta en la respuesta HTTP).

## Activar la persistencia en archivo (`LOG_ARCHIVO`)

Por defecto los logs salen únicamente por la salida estándar. Para persistir además cada línea JSON en un archivo local (sin rotación automática integrada; se recomienda delegar rotación al sistema o `logrotate`):

1. Define `LOG_ARCHIVO` en `backend/.env` o en las variables del entorno:
   ```env
   LOG_ARCHIVO=logs/api.log
   ```
2. La API creará automáticamente la carpeta padre si no existe y escribirá JSON puro en ese archivo mediante `pino.multistream` / `pino.destination`.
3. Para desactivarlo, deja la variable vacía (`LOG_ARCHIVO=`) o sin definir.

## Consultas útiles de diagnóstico

Con `jq` sobre el archivo de log:

- **Listar todas las consultas registradas:**
  ```bash
  jq 'select(.evento == "consulta")' logs/api.log
  ```
- **Buscar consultas lentas (más de 300 ms):**
  ```bash
  jq 'select(.evento == "consulta" and .duracionMs > 300)' logs/api.log
  ```
- **Ver todos los errores `500` de consultas con su causa y `reqId`:**
  ```bash
  jq 'select(.evento == "consulta" and .estado >= 500) | {time, reqId, ruta, filtros, usuario, duracionMs, err}' logs/api.log
  ```
- **Ver peticiones de un `reqId` específico:**
  ```bash
  jq 'select(.reqId == "REEMPLAZAR-REQ-ID")' logs/api.log
  ```
