# Convenciones generales de la API

Reglas que siguen **todos** los endpoints de la API REST de la plataforma parroquial. Los documentos de cada grupo de endpoints solo indican lo que se aparta de esta base o lo que es propio del recurso.

> Las secciones B (portal) y C (panel CMS) construyen sus mocks de MSW copiando los ejemplos de este contrato. Si el backend necesita cambiar algo de aquí, primero se actualiza este documento.

## 1. URL base y formato

| Aspecto    | Regla                                                                                                                                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prefijo    | Todas las rutas cuelgan de `/api` (ej. `GET /api/sedes/senor-de-la-exaltacion/horarios`). En desarrollo, el frontend usa `VITE_API_URL` (por defecto `/api`).                                                   |
| Versionado | Sin versión en la URL durante la v1.0. Un cambio incompatible se acuerda y se documenta antes de implementarse.                                                                                                 |
| Formato    | JSON en UTF-8 (`Content-Type: application/json; charset=utf-8`), tanto en peticiones como en respuestas. La única excepción es la subida de archivos, que usa `multipart/form-data` (ver [admin.md](admin.md)). |
| Transporte | HTTPS en producción (RNF-02).                                                                                                                                                                                   |

### Métodos

| Método                       | Uso                                                                                | Respuesta exitosa                                 |
| ---------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------- |
| `GET`                        | Leer un recurso o una lista. Nunca modifica datos.                                 | `200`                                             |
| `POST`                       | Crear un recurso.                                                                  | `201` con el recurso creado y cabecera `Location` |
| `PATCH`                      | Modificar parcialmente un recurso: solo se envían los campos que cambian.          | `200` con el recurso completo actualizado         |
| `DELETE`                     | Eliminar un recurso.                                                               | `204` sin cuerpo                                  |
| `POST /recurso/:id/<accion>` | Acciones que no son un CRUD simple (ej. `enviar-revision`, `aprobar`, `archivar`). | `200` con el recurso actualizado                  |

No se usa `PUT`. Las acciones van con verbos en infinitivo y en kebab-case.

## 2. Nombres y tipos de datos

- **Claves JSON en camelCase y en español**: `fechaPublicacion`, `textoAlternativo`, `porPagina`. La API traduce desde los nombres snake_case de la base de datos (`fecha_publicacion` → `fechaPublicacion`).
- **Identificadores**: enteros (`"id": 12`). Las referencias en el cuerpo de una petición terminan en `Id` (`"categoriaId": 2`, `"imagenPortadaId": 31`).
- **Relaciones en las respuestas**: se devuelven como objeto embebido con lo mínimo para mostrarlas (`"categoria": { "id": 1, "nombre": "Sacramentos", "slug": "sacramentos" }`), no solo el id.
- **Campos vacíos**: un campo sin valor se envía como `null`, no se omite. Las listas vacías se envían como `[]`.
- **Enumeraciones fijas** (estados, tipos y roles que el código conoce): códigos en MAYÚSCULAS_CON_GUION_BAJO, como `"EN_REVISION"`, `"NOTA_DE_PRENSA"` o `"SECRETARIA"`. Junto al código se puede incluir `nombre` con el texto para mostrar.
- **Catálogos editables** (categorías, categorías de eventos, tipos de horario, redes sociales): objetos `{ "id", "nombre", ... }`.
- **Slugs**: minúsculas, sin acentos y con guiones (`primeras-comuniones-42-ninos`). La API los genera a partir del título si no se envían. Son únicos dentro de cada sede; si se repite uno se responde `409 CONFLICTO`.
- **Íconos** (`servicio.icono`, `grupoPastoral.icono` y `icono` de los bloques `tarjetas`): nombre del ícono de [lucide-react](https://lucide.dev/icons/) en kebab-case (`droplet`, `book-open`, `heart-handshake`, `clock-3`). El frontend lo convierte al componente. Un nombre desconocido muestra un ícono genérico. **Excepción:** el `icono` de las redes sociales (`facebook`, `instagram`, `youtube`…) no es de lucide, sino un identificador de la red que el portal traduce a su ícono de marca.
- **Documentos JSONB con esquema propio** (contenido BlockNote de las publicaciones, contenido de los bloques de página y de los servicios) se transmiten **tal como se guardan**, sin traducir sus claves. Su formato está en [contenido.md](contenido.md).

### Fechas y horas

| Tipo                            | Formato                                     | Ejemplo                       |
| ------------------------------- | ------------------------------------------- | ----------------------------- |
| Fecha y hora (`timestamptz`)    | ISO 8601 **con zona horaria**               | `"2026-11-14T11:00:00-04:00"` |
| Solo fecha (`date`)             | `YYYY-MM-DD`                                | `"2026-10-25"`                |
| Solo hora (`time`), en horarios | `HH:mm`, 24 horas                           | `"19:30"`                     |
| Día de la semana                | Entero de 1 (lunes) a 7 (domingo), ISO 8601 | `6`                           |

- La API **responde** las fechas con la zona de Bolivia (`-04:00`, `America/La_Paz`), así el portal puede mostrarlas sin conversiones.
- La API **acepta** cualquier zona (`Z`, `-04:00`, etc.) y rechaza con `400 VALIDACION` una fecha y hora sin zona (`"2026-11-14T11:00:00"`), porque sería ambigua.

## 3. Respuestas exitosas

Toda respuesta con cuerpo va envuelta en `datos`.

**Un recurso:**

```json
{
  "datos": {
    "id": 1,
    "nombre": "Santa Misa"
  }
}
```

**Una lista sin paginar** (catálogos y listas cortas, como horarios o grupos):

```json
{
  "datos": [
    { "id": 1, "nombre": "Liturgia", "colorHex": "#E2AD11" },
    { "id": 2, "nombre": "Solemnidad", "colorHex": "#9E1B22" }
  ]
}
```

**Una lista paginada:**

```json
{
  "datos": [
    { "id": 7, "titulo": "Primeras comuniones: 42 niños recibieron a Jesús" },
    { "id": 6, "titulo": "Encuentro de monaguillos de la Vicaría Sur" }
  ],
  "paginacion": {
    "pagina": 1,
    "porPagina": 2,
    "total": 5,
    "totalPaginas": 3
  }
}
```

Excepción: `GET /api/salud` responde sin envoltorio, porque lo consultan monitores externos (ver [publico.md](publico.md)).

## 4. Paginación, orden y filtros

| Parámetro (query) | Tipo        | Por defecto       | Regla                                                                                                                 |
| ----------------- | ----------- | ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pagina`          | entero ≥ 1  | `1`               | Una página fuera de rango devuelve `"datos": []` con la `paginacion` real, no un 404.                                 |
| `porPagina`       | entero 1–50 | `10`              | Un valor mayor a 50 es `400 VALIDACION`.                                                                              |
| `orden`           | texto       | según el endpoint | Nombre del campo; con `-` delante es descendente (`orden=-fechaPublicacion`). Cada endpoint indica qué campos acepta. |

- Los filtros son parámetros de query con el nombre del campo (`tipo=AVISO`, `categoria=sacramentos`). Para varios valores se separan con comas (`tipo=NOTICIA,NOTA_DE_PRENSA`).
- Un parámetro desconocido se ignora. Un valor inválido en un parámetro conocido es `400 VALIDACION`.
- `totalPaginas` es `0` cuando `total` es `0`.

## 5. Errores

Todo error usa el mismo formato, que el cliente HTTP del frontend (`frontend/src/services/clienteHttp.js`) ya interpreta:

```json
{
  "error": {
    "codigo": "VALIDACION",
    "mensaje": "Los datos enviados no son válidos.",
    "detalles": [
      { "campo": "titulo", "mensaje": "El título es obligatorio." },
      {
        "campo": "fechaExpiracion",
        "mensaje": "Debe ser posterior a la fecha de publicación."
      }
    ]
  }
}
```

- `codigo`: constante de la tabla siguiente. El frontend decide por el código, nunca por el texto.
- `mensaje`: texto en español, apto para mostrarlo al usuario.
- `detalles`: lista de `{ "campo", "mensaje" }`. Se usa sobre todo en `VALIDACION`; en los demás casos es `[]`. `campo` usa la ruta del dato en camelCase: `titulo`, `contenido.bloques.0.type` o `query.porPagina` cuando el error está en un parámetro de query o de ruta.
- En producción nunca se envían trazas (stack) ni mensajes internos de la base de datos.

### Tabla de códigos

| Código                     | HTTP | Cuándo se usa                                                                                                                                                  |
| -------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VALIDACION`               | 400  | El cuerpo, la query o los parámetros de ruta no cumplen el esquema. También el JSON mal formado y los bloques que no cumplen `tipo_bloque.esquema_validacion`. |
| `NO_AUTENTICADO`           | 401  | No hay sesión, la cookie expiró o es inválida, o las credenciales del login son incorrectas.                                                                   |
| `SIN_PERMISO`              | 403  | Hay sesión pero el rol no puede hacer la acción, o el recurso pertenece a otra sede.                                                                           |
| `NO_ENCONTRADO`            | 404  | El recurso, la sede (slug) o la ruta no existen. En el portal también un contenido que no está publicado o vigente.                                            |
| `CONFLICTO`                | 409  | Choca con una restricción de unicidad (slug, correo, boletín del mismo periodo) o con el estado actual (ej. aprobar algo que no está «En revisión»).           |
| `ARCHIVO_DEMASIADO_GRANDE` | 413  | El archivo supera el límite de su tipo (RNF-05) o el cuerpo JSON supera el límite.                                                                             |
| `TIPO_NO_PERMITIDO`        | 415  | El tipo real del archivo (detectado por su contenido, no por la extensión) no está permitido, o el `Content-Type` de la petición no es el esperado.            |
| `DEMASIADAS_SOLICITUDES`   | 429  | Se superó el límite de peticiones (ej. intentos de login). Incluye la cabecera `Retry-After` en segundos.                                                      |
| `ERROR_INTERNO`            | 500  | Error no previsto. Se registra en el log con el id de la petición.                                                                                             |

## 6. Sedes (RF-13)

La plataforma sirve a varias sedes: Parroquia Señor de la Exaltación, Parroquia de la Resurrección y sus capillas.

- **Portal público**: el contenido de cada sede cuelga de `/api/sedes/:sede/...`, donde `:sede` es el **slug** de la sede (`senor-de-la-exaltacion`, `resurreccion`, `capilla-san-pablo-de-la-cruz`). Un slug inexistente o de una sede inactiva responde `404 NO_ENCONTRADO`.
- **Catálogos globales**, que no pertenecen a una sede (categorías, categorías de eventos, tipos de horario), cuelgan directamente de `/api` (ej. `GET /api/categorias`).
- **Panel CMS**: todo cuelga de `/api/admin/...`. Los recursos se identifican por `id` y las listas aceptan el filtro `sede` (slug). Un usuario con sede asignada solo ve y modifica su sede (ver [autenticacion.md](autenticacion.md)).

## 7. Objeto imagen estándar

Toda imagen se devuelve con la misma forma, venga de `archivo_multimedia` o de una URL fija:

```json
{
  "id": 31,
  "url": "https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/10/primeras-comuniones.webp",
  "textoAlternativo": "Niños de primera comunión frente al altar",
  "ancho": 1600,
  "alto": 1067
}
```

| Campo              | Tipo            | Nota                                                                                                                                                                                   |
| ------------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | entero o `null` | Id en `archivo_multimedia`. Es `null` cuando la imagen no es un archivo subido (ej. `sede.url_imagen_portada`).                                                                        |
| `url`              | texto           | **Absoluta** (`CDN_PUBLIC_URL`) para los archivos subidos desde el CMS. **Relativa** (`/media/seed/<archivo>`) para las imágenes del seed, que el portal sirve desde su propio origen. |
| `textoAlternativo` | texto o `null`  | Obligatorio para publicar en el portal. Si falta, el portal usa el título del recurso.                                                                                                 |
| `ancho`, `alto`    | entero o `null` | Dimensiones en píxeles. Sirven para reservar el espacio y evitar saltos de diseño.                                                                                                     |

Un recurso sin imagen devuelve `"imagen": null`, nunca un objeto vacío.

## 8. Autenticación, caché y límites

- **Sesión**: el panel CMS se autentica con un JWT en una cookie httpOnly. El frontend no lee el token; solo envía `credentials: 'include'`. Detalles en [autenticacion.md](autenticacion.md).
- **CORS**: solo se acepta el origen configurado en `CORS_ORIGEN`, con `credentials: true`.
- **Caché (ADR-02)**: las lecturas públicas se guardan en Redis (cache-aside) y se invalidan en cuanto el CMS modifica el recurso. El contrato no cambia por la caché.
- **Límite del cuerpo JSON**: 1 MB. Los archivos tienen sus propios límites (ver [admin.md](admin.md)).
- **Límite de peticiones**: el login tiene un límite estricto (ver [autenticacion.md](autenticacion.md)). Un exceso responde `429 DEMASIADAS_SOLICITUDES`.
- **Id de petición**: cada respuesta incluye la cabecera `X-Request-Id`. Si el usuario reporta un error, ese id permite encontrarlo en los logs.
