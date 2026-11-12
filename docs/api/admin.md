# Endpoints de administración del CMS

Endpoints del panel CMS (`frontend/src/admin/`), todos bajo `/api/admin/...`. Siguen las [convenciones generales](convenciones.md) y exigen sesión ([autenticacion.md](autenticacion.md)).

## Reglas comunes

- **Sesión y permisos**: sin sesión, `401 NO_AUTENTICADO`. Sin el permiso de la [matriz](autenticacion.md#7-matriz-de-permisos), `403 SIN_PERMISO`. Todos los roles pueden hacer `GET` sobre los recursos de su sede, salvo usuarios y bitácora.
- **Sede**: las listas aceptan `sede` (slug). Para los roles que no son Administrador, la sede se fuerza a la propia. Al crear, el Administrador indica `sedeId` en el cuerpo; para los demás roles ese campo se ignora y se usa su sede. Un recurso de otra sede responde `403 SIN_PERMISO`.
- **Lecturas por id**: `GET /api/admin/<recurso>/:id`. Si el id no existe, `404 NO_ENCONTRADO`.
- **`PATCH`**: solo los campos enviados cambian; `null` borra un campo opcional. Responde `200` con el objeto completo.
- **`DELETE`**: responde `204`. Si otro registro depende del recurso, responde `409 CONFLICTO` y el `mensaje` dice qué lo usa.
- **Reordenar**: los recursos con `orden` (servicios, grupos, videos y bloques) tienen `POST .../reordenar` con `{ "ids": [...] }`, que recibe **todos** los ids en el nuevo orden. Responde `200` con la lista ordenada. Si faltan o sobran ids, `400 VALIDACION`.
- **Bitácora**: todo `POST`, `PATCH` y `DELETE` exitoso queda registrado en `bitacora_cambio` con el usuario, la IP y los datos antes y después ([sección 13](#13-bitácora)).
- **Caché**: toda modificación invalida en Redis las lecturas públicas afectadas (ADR-02).
- **Referencias**: un `...Id` del cuerpo que no existe o que es de otra sede responde `400 VALIDACION`, con `detalles` en ese campo.

## Índice

1. [Catálogos](#1-catálogos)
2. [Multimedia](#2-multimedia)
3. [Publicaciones](#3-publicaciones)
4. [Eventos](#4-eventos)
5. [Horarios](#5-horarios)
6. [Servicios y preguntas frecuentes](#6-servicios-y-preguntas-frecuentes)
7. [Grupos pastorales](#7-grupos-pastorales)
8. [Videos](#8-videos)
9. [Sedes y redes sociales](#9-sedes-y-redes-sociales)
10. [Proclamas](#10-proclamas)
11. [Boletines](#11-boletines)
12. [Páginas y bloques](#12-páginas-y-bloques)
13. [Bitácora](#13-bitácora)
14. [Usuarios](#14-usuarios)

---

## 1. Catálogos

### `GET /api/admin/catalogos`

Todos los catálogos en una sola respuesta, para llenar los selectores de los formularios. Lo pueden consultar todos los roles. Los catálogos se cargan por seed; en la v1.0 no se editan desde el panel.

**Respuesta `200`:**

```json
{
  "datos": {
    "roles": [
      { "id": 1, "codigo": "ADMINISTRADOR", "nombre": "Administrador" },
      { "id": 2, "codigo": "PARROCO", "nombre": "Párroco" },
      { "id": 3, "codigo": "SECRETARIA", "nombre": "Secretaría" },
      { "id": 4, "codigo": "MARKETING", "nombre": "Marketing" }
    ],
    "tiposSede": [
      { "id": 1, "codigo": "PARROQUIA", "nombre": "Parroquia" },
      { "id": 2, "codigo": "CAPILLA", "nombre": "Capilla" }
    ],
    "estadosPublicacion": [
      { "id": 1, "codigo": "BORRADOR", "nombre": "Borrador" },
      { "id": 4, "codigo": "EN_REVISION", "nombre": "En revisión" },
      { "id": 2, "codigo": "PUBLICADO", "nombre": "Publicado" },
      { "id": 3, "codigo": "ARCHIVADO", "nombre": "Archivado" }
    ],
    "tiposPublicacion": [
      { "id": 1, "codigo": "NOTICIA", "nombre": "Noticia" },
      { "id": 2, "codigo": "AVISO", "nombre": "Aviso" },
      { "id": 3, "codigo": "NOTA_DE_PRENSA", "nombre": "Nota de prensa" }
    ],
    "categorias": [
      { "id": 1, "nombre": "Sacramentos", "slug": "sacramentos" },
      { "id": 2, "nombre": "Comunidad", "slug": "comunidad" },
      { "id": 3, "nombre": "Pasionistas", "slug": "pasionistas" },
      { "id": 4, "nombre": "Pastoral Familiar", "slug": "pastoral-familiar" }
    ],
    "categoriasEvento": [
      { "id": 1, "nombre": "Liturgia", "colorHex": "#E2AD11" },
      { "id": 2, "nombre": "Solemnidad", "colorHex": "#9E1B22" },
      { "id": 3, "nombre": "Catequesis", "colorHex": "#B5532F" },
      { "id": 4, "nombre": "Comunidad", "colorHex": "#3E9C97" }
    ],
    "tiposHorario": [
      { "id": 1, "nombre": "Santa Misa" },
      { "id": 2, "nombre": "Confesiones" },
      { "id": 3, "nombre": "Adoración" },
      { "id": 4, "nombre": "Secretaría" }
    ],
    "redesSociales": [
      { "id": 1, "nombre": "Facebook", "icono": "facebook" },
      { "id": 2, "nombre": "Instagram", "icono": "instagram" },
      { "id": 3, "nombre": "YouTube", "icono": "youtube" },
      { "id": 4, "nombre": "TikTok", "icono": "tiktok" },
      { "id": 5, "nombre": "WhatsApp", "icono": "chat" }
    ],
    "tiposBloque": [
      {
        "id": 4,
        "codigo": "cita",
        "nombre": "Cita destacada",
        "esquemaValidacion": {
          "type": "object",
          "required": ["texto"],
          "properties": {
            "texto": { "type": "string" },
            "autor": { "type": "string" }
          }
        }
      }
    ]
  }
}
```

- `codigo` de roles, tipos de sede, estados y tipos de publicación es la enumeración de la API (ver [convenciones.md](convenciones.md#2-nombres-y-tipos-de-datos)). La traducción a los nombres de la base la hace la API.
- `estadosPublicacion` va en el orden del flujo, no por `id`.
- `tiposBloque` trae los 6 tipos del seed con su `esquemaValidacion` completo, para que el panel arme el formulario de cada bloque. En el ejemplo se muestra solo uno; los demás están en [contenido.md](contenido.md).

---

## 2. Multimedia

Archivos guardados en Oracle Cloud Object Storage (compatible con S3, bucket público). Su URL pública es `CDN_PUBLIC_URL` + la clave del objeto.

### Objeto archivo multimedia (vista del panel)

```json
{
  "id": 8,
  "url": "https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/11/4b1e9c2a-7d3f-4e8a-9c61-2f0d8a5b3e17.webp",
  "nombreOriginal": "primeras comuniones 2026.webp",
  "tipoMime": "image/webp",
  "tamanoBytes": 412870,
  "ancho": 1600,
  "alto": 1067,
  "textoAlternativo": "Niños de primera comunión frente al altar",
  "sede": {
    "id": 1,
    "nombre": "Parroquia Señor de la Exaltación",
    "slug": "senor-de-la-exaltacion"
  },
  "subidoPor": { "id": 4, "nombreCompleto": "Marketing (desarrollo)" },
  "fechaSubida": "2026-11-12T09:12:44-04:00",
  "enUso": true
}
```

`enUso` indica si alguna publicación, evento, grupo o boletín lo referencia. Un archivo en uso no se puede eliminar.

### Tipos y límites (RNF-05)

| Clase     | Tipos permitidos                        | Tamaño máximo |
| --------- | --------------------------------------- | ------------- |
| Imagen    | `image/jpeg`, `image/png`, `image/webp` | 30 MB         |
| Video     | `video/mp4`, `video/webm`               | 2 GB          |
| Documento | `application/pdf`                       | 50 MB         |

- El tipo se detecta **por el contenido del archivo** (firma binaria), no por la extensión ni por el `Content-Type` que manda el navegador. Si no coincide con la tabla, `415 TIPO_NO_PERMITIDO`.
- No se aceptan SVG ni GIF: un SVG puede contener scripts.
- De las imágenes, la API lee el ancho y el alto y **elimina los metadatos EXIF** (incluida la ubicación GPS) antes de guardarlas. Los videos y PDF se guardan tal cual.
- Clave del objeto: `sedes/<slug-de-la-sede>/<año>/<mes>/<uuid>.<ext>`. El nombre original solo se guarda en la base.
- Capacidad total: 50 GB. Al llegar al 90 %, la subida responde `409 CONFLICTO` con el mensaje «El almacenamiento está casi lleno».

### `POST /api/admin/multimedia`

Sube un archivo. Permiso: `multimedia.subir`. **`Content-Type: multipart/form-data`.**

| Campo del formulario | Tipo    | Regla                                                                                        |
| -------------------- | ------- | -------------------------------------------------------------------------------------------- |
| `archivo`            | archivo | Obligatorio. Uno solo.                                                                       |
| `textoAlternativo`   | texto   | Hasta 255 caracteres. Recomendado para imágenes: es necesario para publicarlas en el portal. |
| `sedeId`             | entero  | Solo lo usa el Administrador. Por defecto, su sede.                                          |

```js
// Ejemplo desde el panel con clienteHttp
const formulario = new FormData();
formulario.append("archivo", archivoSeleccionado);
formulario.append(
  "textoAlternativo",
  "Niños de primera comunión frente al altar",
);
await clienteHttp.post("/admin/multimedia", formulario);
```

**Respuesta `201`:** el objeto archivo multimedia, con `"enUso": false`, y la cabecera `Location: /api/admin/multimedia/8`.

**Errores:**

| Código                         | Cuándo                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `400 VALIDACION`               | Falta `archivo`, se envió más de uno o `textoAlternativo` es demasiado largo.                                      |
| `413 ARCHIVO_DEMASIADO_GRANDE` | El archivo supera el límite de su clase. El `mensaje` indica el límite («Las imágenes pueden pesar hasta 30 MB.»). |
| `415 TIPO_NO_PERMITIDO`        | Tipo real no permitido, o la petición no es `multipart/form-data`.                                                 |
| `409 CONFLICTO`                | Almacenamiento casi lleno.                                                                                         |

> Un video de hasta 2 GB tarda en subir. `fetch` no informa el avance de la subida; para mostrar una barra de progreso, el panel puede usar `XMLHttpRequest` con `upload.onprogress` solo en este endpoint.

### `GET /api/admin/multimedia`

Biblioteca multimedia. Paginada.

| Parámetro             | Descripción                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| `sede`                | Slug de la sede.                                                            |
| `clase`               | `IMAGEN`, `VIDEO` o `DOCUMENTO`.                                            |
| `buscar`              | Busca en el nombre original y en el texto alternativo.                      |
| `enUso`               | `true` / `false`.                                                           |
| `pagina`, `porPagina` | Paginación estándar.                                                        |
| `orden`               | `fechaSubida`, `-fechaSubida` (por defecto), `tamanoBytes`, `-tamanoBytes`. |

**Respuesta `200`:** `{ "datos": [ <archivo multimedia>, ... ], "paginacion": { ... } }`.

### `PATCH /api/admin/multimedia/:id`

Solo se puede cambiar `textoAlternativo`. Permiso: `multimedia.subir`.

```json
{
  "textoAlternativo": "Niños de primera comunión con sus catequistas frente al altar"
}
```

### `DELETE /api/admin/multimedia/:id`

Borra el archivo de la base y del bucket. Permiso: `multimedia.eliminar`. Fuera del Administrador, cada usuario solo puede borrar lo que subió. Si el archivo está en uso, responde `409 CONFLICTO`:

```json
{
  "error": {
    "codigo": "CONFLICTO",
    "mensaje": "El archivo está en uso y no se puede eliminar.",
    "detalles": [
      {
        "campo": "id",
        "mensaje": "Usado como portada de la publicación «Primeras comuniones: 42 niños recibieron a Jesús»."
      }
    ]
  }
}
```

---

## 3. Publicaciones

Avisos, noticias y notas de prensa. Las transiciones de estado, quién puede hacer cada una y cómo afectan las fechas están en [estados-publicacion.md](estados-publicacion.md). Aquí se listan los endpoints.

### Objeto publicación (vista del panel)

Todos los campos del [detalle público](publico.md#get-apisedessedepublicacionesslug), más los de gestión:

```json
{
  "id": 7,
  "sede": {
    "id": 1,
    "nombre": "Parroquia Señor de la Exaltación",
    "slug": "senor-de-la-exaltacion"
  },
  "tipo": { "codigo": "NOTICIA", "nombre": "Noticia" },
  "estado": { "codigo": "EN_REVISION", "nombre": "En revisión" },
  "titulo": "Solemnidad de Cristo Rey: invitación a la procesión",
  "slug": "solemnidad-de-cristo-rey-invitacion-a-la-procesion",
  "resumen": "El domingo 22 de noviembre celebramos a Cristo Rey con misa solemne y procesión con el Santísimo.",
  "categoria": { "id": 2, "nombre": "Comunidad", "slug": "comunidad" },
  "imagenPortada": {
    "id": 3,
    "url": "/media/seed/altar.webp",
    "textoAlternativo": "Altar del templo parroquial adornado con flores rojas y blancas, con un tríptico de icono al lado derecho",
    "ancho": 1879,
    "alto": 1057
  },
  "urlExterna": null,
  "destacada": true,
  "fechaPublicacion": "2026-11-15T08:00:00-04:00",
  "fechaExpiracion": "2026-11-23T00:00:00-04:00",
  "contenido": {
    "formato": "blocknote",
    "version": 1,
    "bloques": [
      {
        "id": "c1",
        "type": "paragraph",
        "props": {
          "textColor": "default",
          "backgroundColor": "default",
          "textAlignment": "left"
        },
        "content": [
          {
            "type": "text",
            "text": "Invitamos a toda la comunidad a la misa solemne de las 10:00 y a la procesión con el Santísimo alrededor de la plaza.",
            "styles": {}
          }
        ],
        "children": []
      }
    ]
  },
  "autor": { "id": 4, "nombreCompleto": "Marketing (desarrollo)" },
  "revision": null,
  "fechaCreacion": "2026-11-12T10:05:31-04:00",
  "visibleEnPortal": false,
  "acciones": ["EDITAR", "APROBAR", "RECHAZAR"]
}
```

| Campo             | Descripción                                                                                                                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `estado.codigo`   | `BORRADOR`, `EN_REVISION`, `PUBLICADO` o `ARCHIVADO`.                                                                                                                                                                                                       |
| `autor`           | Quien la creó.                                                                                                                                                                                                                                              |
| `revision`        | `null` si nunca se revisó. Si se revisó: `{ "revisadoPor": { "id", "nombreCompleto" }, "fecha", "observacion" }`. `observacion` solo tiene valor cuando el Párroco la rechazó.                                                                              |
| `visibleEnPortal` | `true` si hoy aparece en el portal: está `PUBLICADO`, ya llegó su `fechaPublicacion` y no expiró. Una publicada con fecha futura (programada) tiene `false`.                                                                                                |
| `acciones`        | Acciones que **el usuario de la sesión** puede hacer ahora sobre ella: `EDITAR`, `ELIMINAR`, `ENVIAR_REVISION`, `APROBAR`, `RECHAZAR`, `PUBLICAR`, `ARCHIVAR`, `RESTAURAR`. El panel muestra solo esos botones. En el ejemplo, la sesión es la del Párroco. |

Ejemplo de `revision` después de un rechazo:

```json
{
  "revisadoPor": { "id": 2, "nombreCompleto": "Párroco (desarrollo)" },
  "fecha": "2026-11-12T17:40:02-04:00",
  "observacion": "Corregir la hora de la procesión: es a las 11:30, después de la misa."
}
```

### `GET /api/admin/publicaciones`

Paginada. En la lista **no** se incluye `contenido`.

| Parámetro             | Descripción                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sede`                | Slug de la sede.                                                                                                                                     |
| `tipo`                | `AVISO`, `NOTICIA`, `NOTA_DE_PRENSA` (varios separados por comas).                                                                                   |
| `estado`              | `BORRADOR`, `EN_REVISION`, `PUBLICADO`, `ARCHIVADO` (varios separados por comas). El Párroco usa `estado=EN_REVISION` para su bandeja de pendientes. |
| `categoria`           | Slug de la categoría.                                                                                                                                |
| `autor`               | Id del autor. `autor=yo` filtra por el usuario de la sesión.                                                                                         |
| `buscar`              | Busca en título y resumen.                                                                                                                           |
| `pagina`, `porPagina` | Paginación estándar.                                                                                                                                 |
| `orden`               | `fechaCreacion`, `-fechaCreacion` (por defecto), `fechaPublicacion`, `-fechaPublicacion`, `titulo`, `-titulo`.                                       |

### `GET /api/admin/publicaciones/:id`

El objeto completo, con `contenido`.

### `POST /api/admin/publicaciones`

Crea una publicación, **siempre en `BORRADOR`**. Permiso: `avisos.gestionar` para `AVISO`; `noticias.redactar` para `NOTICIA` y `NOTA_DE_PRENSA`.

```json
{
  "tipo": "NOTICIA",
  "titulo": "Solemnidad de Cristo Rey: invitación a la procesión",
  "slug": null,
  "resumen": "El domingo 22 de noviembre celebramos a Cristo Rey con misa solemne y procesión con el Santísimo.",
  "categoriaId": 2,
  "imagenPortadaId": 3,
  "contenido": {
    "formato": "blocknote",
    "version": 1,
    "bloques": []
  },
  "urlExterna": null,
  "destacada": true,
  "fechaPublicacion": "2026-11-15T08:00:00-04:00",
  "fechaExpiracion": "2026-11-23T00:00:00-04:00"
}
```

| Campo                            | Regla                                                                                                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tipo`                           | Obligatorio. `AVISO`, `NOTICIA` o `NOTA_DE_PRENSA`. No se puede cambiar después.                                                                                  |
| `titulo`                         | Obligatorio, de 3 a 200 caracteres.                                                                                                                               |
| `slug`                           | Opcional. Si es `null` o no se envía, se genera desde el título. Único en la sede (`409 CONFLICTO`). Si se genera y choca, la API agrega un sufijo (`-2`, `-3`…). |
| `resumen`                        | Hasta 400 caracteres.                                                                                                                                             |
| `categoriaId`, `imagenPortadaId` | Opcionales. `imagenPortadaId` debe ser una imagen de la misma sede.                                                                                               |
| `contenido`                      | Obligatorio. Documento BlockNote válido ([contenido.md](contenido.md)). Puede tener `bloques: []` si hay `urlExterna`.                                            |
| `urlExterna`                     | URL `https://` de hasta 500 caracteres.                                                                                                                           |
| `destacada`                      | Booleano, por defecto `false`.                                                                                                                                    |
| `fechaPublicacion`               | Opcional. Fecha **deseada**: se aplica al publicar o aprobar (ver [estados-publicacion.md](estados-publicacion.md)).                                              |
| `fechaExpiracion`                | Opcional. Si viene junto con `fechaPublicacion`, debe ser posterior.                                                                                              |

**Respuesta `201`:** el objeto publicación, en `BORRADOR`.

### `PATCH /api/admin/publicaciones/:id`

Edita campos (los mismos de la creación, salvo `tipo`). Solo se permite en los estados que indica [estados-publicacion.md](estados-publicacion.md#5-edición-según-el-estado); fuera de ellos responde `409 CONFLICTO`.

```json
{
  "titulo": "Solemnidad de Cristo Rey: misa solemne y procesión",
  "destacada": false
}
```

### `DELETE /api/admin/publicaciones/:id`

Elimina definitivamente. Solo se pueden eliminar publicaciones en `BORRADOR` o `ARCHIVADO`: las que están en revisión se rechazan y las publicadas se archivan primero. Quién puede hacerlo está en [estados-publicacion.md](estados-publicacion.md#6-eliminación).

### Acciones de estado

Todas responden `200` con el objeto publicación actualizado. Si la acción no es válida desde el estado actual, `409 CONFLICTO`; si el rol no puede hacerla, `403 SIN_PERMISO`.

| Endpoint                                            | Cuerpo                                                                      | Efecto                                                                            |
| --------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `POST /api/admin/publicaciones/:id/enviar-revision` | —                                                                           | `BORRADOR` → `EN_REVISION` (Marketing).                                           |
| `POST /api/admin/publicaciones/:id/aprobar`         | `{ "fechaPublicacion": "..." }` opcional                                    | `EN_REVISION` → `PUBLICADO` (Párroco o Administrador).                            |
| `POST /api/admin/publicaciones/:id/rechazar`        | `{ "observacion": "..." }` obligatorio, de 5 a 500 caracteres               | `EN_REVISION` → `BORRADOR`, con la observación.                                   |
| `POST /api/admin/publicaciones/:id/publicar`        | `{ "fechaPublicacion": "...", "fechaExpiracion": "..." }`, ambos opcionales | `BORRADOR` → `PUBLICADO`. Con una `fechaPublicacion` futura queda **programada**. |
| `POST /api/admin/publicaciones/:id/archivar`        | —                                                                           | `PUBLICADO` → `ARCHIVADO`.                                                        |
| `POST /api/admin/publicaciones/:id/restaurar`       | —                                                                           | `ARCHIVADO` → `BORRADOR`.                                                         |

Ejemplo de rechazo:

```json
{
  "observacion": "Corregir la hora de la procesión: es a las 11:30, después de la misa."
}
```

---

## 4. Eventos

Calendario parroquial. Permiso de escritura: `eventos.gestionar`. Los eventos se publican directamente, sin revisión.

### Objeto evento (vista del panel)

```json
{
  "id": 3,
  "sede": {
    "id": 1,
    "nombre": "Parroquia Señor de la Exaltación",
    "slug": "senor-de-la-exaltacion"
  },
  "estado": { "codigo": "PUBLICADO", "nombre": "Publicado" },
  "titulo": "Solemnidad de Cristo Rey del Universo",
  "descripcion": "Santa Misa solemne y procesión con el Santísimo alrededor de la plaza.",
  "lugar": "Templo parroquial",
  "fechaInicio": "2026-11-22T10:00:00-04:00",
  "fechaFin": "2026-11-22T12:00:00-04:00",
  "todoElDia": false,
  "categoria": { "id": 2, "nombre": "Solemnidad", "colorHex": "#9E1B22" },
  "imagen": null,
  "idExternoM365": null,
  "creadoPor": { "id": 3, "nombreCompleto": "Secretaría (desarrollo)" },
  "finalizado": false
}
```

- `finalizado`: `true` cuando el evento ya no se muestra en el portal porque pasó su fecha (misma regla que en [publico.md](publico.md#get-apisedessedeeventos)).
- `idExternoM365`: solo lectura; queda reservado para la sincronización con Microsoft 365 (RF-12, «Could Have»).

### Endpoints

| Método y ruta                   | Descripción                                                                                                                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/eventos`        | Paginada. Filtros: `sede`, `desde`, `hasta` (fechas), `categoria` (ids), `estado`, `finalizados` (`true` / `false`; por defecto se incluyen todos). Orden: `fechaInicio` (por defecto) o `-fechaInicio`. |
| `GET /api/admin/eventos/:id`    | Un evento.                                                                                                                                                                                               |
| `POST /api/admin/eventos`       | Crea. `201`.                                                                                                                                                                                             |
| `PATCH /api/admin/eventos/:id`  | Edita, incluido el `estado`.                                                                                                                                                                             |
| `DELETE /api/admin/eventos/:id` | Elimina.                                                                                                                                                                                                 |

**Cuerpo de `POST`:**

```json
{
  "titulo": "Solemnidad de Cristo Rey del Universo",
  "descripcion": "Santa Misa solemne y procesión con el Santísimo alrededor de la plaza.",
  "lugar": "Templo parroquial",
  "fechaInicio": "2026-11-22T10:00:00-04:00",
  "fechaFin": "2026-11-22T12:00:00-04:00",
  "todoElDia": false,
  "categoriaEventoId": 2,
  "imagenId": null,
  "estado": "PUBLICADO"
}
```

| Campo               | Regla                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------- |
| `titulo`            | Obligatorio, de 3 a 200 caracteres.                                                     |
| `fechaInicio`       | Obligatoria.                                                                            |
| `fechaFin`          | Opcional, igual o posterior a `fechaInicio`.                                            |
| `todoElDia`         | Por defecto `false`. Si es `true`, se ignoran las horas.                                |
| `categoriaEventoId` | Obligatorio.                                                                            |
| `estado`            | `PUBLICADO` (por defecto), `BORRADOR` o `ARCHIVADO`. Los eventos no usan `EN_REVISION`. |
| `descripcion`       | Texto plano, hasta 2000 caracteres.                                                     |
| `lugar`             | Hasta 150 caracteres.                                                                   |

---

## 5. Horarios

Permiso de escritura: `horarios.gestionar`. A diferencia del endpoint público, aquí cada horario es una fila con su `id`, sin agrupar.

### Objeto horario

```json
{
  "id": 12,
  "sede": {
    "id": 1,
    "nombre": "Parroquia Señor de la Exaltación",
    "slug": "senor-de-la-exaltacion"
  },
  "tipo": { "id": 1, "nombre": "Santa Misa" },
  "diaSemana": 6,
  "horaInicio": "18:00",
  "horaFin": null,
  "descripcion": "Misa vespertina dominical",
  "activo": true
}
```

| Método y ruta                    | Descripción                                                                              |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| `GET /api/admin/horarios`        | Sin paginar. Filtros: `sede`, `tipo` (ids), `activo`. Orden: tipo, día y hora de inicio. |
| `GET /api/admin/horarios/:id`    | Un horario.                                                                              |
| `POST /api/admin/horarios`       | Crea. `201`.                                                                             |
| `PATCH /api/admin/horarios/:id`  | Edita. Para ocultar un horario sin borrarlo: `{ "activo": false }`.                      |
| `DELETE /api/admin/horarios/:id` | Elimina.                                                                                 |

**Cuerpo de `POST`:**

```json
{
  "tipoHorarioId": 1,
  "diaSemana": 6,
  "horaInicio": "18:00",
  "horaFin": null,
  "descripcion": "Misa vespertina dominical",
  "activo": true
}
```

Reglas: `diaSemana` de 1 a 7; `horaInicio` obligatoria (`HH:mm`); `horaFin`, si viene, posterior a `horaInicio`; `descripcion` hasta 150 caracteres.

---

## 6. Servicios y preguntas frecuentes

Permiso de escritura: `servicios.gestionar`.

### Objeto servicio (vista del panel)

```json
{
  "id": 1,
  "sede": {
    "id": 1,
    "nombre": "Parroquia Señor de la Exaltación",
    "slug": "senor-de-la-exaltacion"
  },
  "slug": "bautismo",
  "nombre": "Bautismo",
  "descripcionCorta": "Charla pre-bautismal el primer sábado de cada mes. Padres y padrinos se inscriben en secretaría.",
  "icono": "droplet",
  "contenido": {
    "datos": [
      {
        "etiqueta": "Charla pre-bautismal",
        "valor": "Primer sábado de cada mes"
      },
      {
        "etiqueta": "Inscripción",
        "valor": "Padres y padrinos se inscriben en secretaría"
      }
    ]
  },
  "orden": 1,
  "visible": true,
  "preguntasFrecuentes": [
    {
      "id": 1,
      "pregunta": "¿Qué requisitos necesito para bautizar a mi hijo?",
      "respuesta": "Certificado de nacimiento, CI de padres y padrinos, y asistir a la charla pre-bautismal del primer sábado de cada mes.",
      "orden": 0,
      "activa": true
    }
  ]
}
```

| Método y ruta                                                      | Descripción                                                                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `GET /api/admin/servicios`                                         | Sin paginar, por `orden`. Filtros: `sede`, `visible`.                                                              |
| `GET /api/admin/servicios/:id`                                     | Un servicio con sus preguntas frecuentes (activas e inactivas).                                                    |
| `POST /api/admin/servicios`                                        | Crea. `201`.                                                                                                       |
| `PATCH /api/admin/servicios/:id`                                   | Edita.                                                                                                             |
| `DELETE /api/admin/servicios/:id`                                  | Elimina el servicio. Sus preguntas frecuentes quedan sin servicio asociado: las sigue usando el asistente virtual. |
| `POST /api/admin/servicios/reordenar`                              | `{ "ids": [1, 2, 3, 4, 5, 6] }`.                                                                                   |
| `POST /api/admin/servicios/:id/preguntas-frecuentes`               | Crea una pregunta: `{ "pregunta", "respuesta", "activa" }`.                                                        |
| `PATCH /api/admin/servicios/:id/preguntas-frecuentes/:preguntaId`  | Edita una pregunta.                                                                                                |
| `DELETE /api/admin/servicios/:id/preguntas-frecuentes/:preguntaId` | Elimina una pregunta.                                                                                              |

**Cuerpo de `POST /api/admin/servicios`:**

```json
{
  "nombre": "Bautismo",
  "slug": null,
  "descripcionCorta": "Charla pre-bautismal el primer sábado de cada mes. Padres y padrinos se inscriben en secretaría.",
  "icono": "droplet",
  "contenido": {
    "datos": [
      {
        "etiqueta": "Charla pre-bautismal",
        "valor": "Primer sábado de cada mes"
      }
    ]
  },
  "visible": true
}
```

Reglas: `nombre` obligatorio (hasta 100 caracteres); `descripcionCorta` obligatoria (hasta 300); `icono`, nombre de lucide en kebab-case (hasta 40) o `null`; `contenido` con el formato de [contenido.md](contenido.md#contenido-de-los-servicios). El `orden` de un servicio nuevo es el último.

---

## 7. Grupos pastorales

Permiso de escritura: `grupos.gestionar`.

### Objeto grupo pastoral

```json
{
  "id": 4,
  "sede": {
    "id": 1,
    "nombre": "Parroquia Señor de la Exaltación",
    "slug": "senor-de-la-exaltacion"
  },
  "nombre": "Pastoral Juvenil",
  "descripcion": null,
  "horarioReunion": "Viernes · 18:30",
  "contacto": null,
  "icono": "users",
  "imagen": null,
  "orden": 4,
  "visible": true
}
```

| Método y ruta                                 | Descripción                                           |
| --------------------------------------------- | ----------------------------------------------------- |
| `GET /api/admin/grupos-pastorales`            | Sin paginar, por `orden`. Filtros: `sede`, `visible`. |
| `GET /api/admin/grupos-pastorales/:id`        | Un grupo.                                             |
| `POST /api/admin/grupos-pastorales`           | Crea. `201`.                                          |
| `PATCH /api/admin/grupos-pastorales/:id`      | Edita.                                                |
| `DELETE /api/admin/grupos-pastorales/:id`     | Elimina.                                              |
| `POST /api/admin/grupos-pastorales/reordenar` | `{ "ids": [1, 2, 3, 4, 5, 6] }`.                      |

**Cuerpo de `POST`:**

```json
{
  "nombre": "Pastoral Juvenil",
  "descripcion": "Jóvenes de 15 a 25 años que se reúnen a compartir, rezar y servir.",
  "horarioReunion": "Viernes · 18:30",
  "contacto": "Coordinación juvenil: escribir por Messenger",
  "icono": "users",
  "imagenId": null,
  "visible": true
}
```

Reglas: `nombre` obligatorio (hasta 100); `horarioReunion` texto libre (hasta 100); `contacto` hasta 120; `descripcion` texto plano hasta 2000.

---

## 8. Videos

Videos de YouTube (RF-05). Permiso de escritura: `videos.gestionar`.

### Objeto video (vista del panel)

El mismo objeto del [endpoint público](publico.md#get-apisedessedevideos), más `sede`.

| Método y ruta                      | Descripción                                |
| ---------------------------------- | ------------------------------------------ |
| `GET /api/admin/videos`            | Sin paginar. Filtros: `sede`, `destacado`. |
| `GET /api/admin/videos/:id`        | Un video.                                  |
| `POST /api/admin/videos`           | Crea. `201`.                               |
| `PATCH /api/admin/videos/:id`      | Edita.                                     |
| `DELETE /api/admin/videos/:id`     | Elimina.                                   |
| `POST /api/admin/videos/reordenar` | `{ "ids": [1, 2] }`.                       |

**Cuerpo de `POST`:**

```json
{
  "youtube": "https://www.youtube.com/watch?v=pX7aQm3kR2c",
  "titulo": "Un recorrido por nuestra parroquia",
  "descripcion": "Recorrido aéreo y del templo de la Parroquia Señor de la Exaltación.",
  "duracionSegundos": 30,
  "destacado": true,
  "fechaPublicacion": "2026-10-15"
}
```

- `youtube` acepta el id (`pX7aQm3kR2c`) o cualquier URL de YouTube (`watch?v=`, `youtu.be/`, `shorts/`, `embed/`). La API extrae y guarda el id. Una URL no reconocida es `400 VALIDACION`.
- El id es único en toda la plataforma: repetir un video es `409 CONFLICTO`.
- `titulo`: obligatorio, hasta 160 caracteres.

---

## 9. Sedes y redes sociales

### Objeto sede (vista del panel)

El mismo objeto de [`GET /api/sedes/:sede`](publico.md#get-apisedessede), más `activo`. Además, `redesSociales` incluye el `id` de la red y `configuracion` trae todas las claves guardadas.

### Endpoints

| Método y ruta                | Permiso                                       | Descripción                                                                                                                 |
| ---------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/sedes`       | todos                                         | Sin paginar. El Administrador ve todas, incluidas las inactivas; los demás roles solo la suya.                              |
| `GET /api/admin/sedes/:id`   | todos                                         | Una sede.                                                                                                                   |
| `POST /api/admin/sedes`      | `sedes.gestionar`                             | Crea una sede. `201`.                                                                                                       |
| `PATCH /api/admin/sedes/:id` | `sede.editar` (la propia) o `sedes.gestionar` | Edita datos, configuración y redes sociales. Solo `sedes.gestionar` puede cambiar `slug`, `tipo`, `sedePadreId` y `activo`. |

**Cuerpo de `PATCH`** (Secretaría actualiza el aviso de la barra superior, el WhatsApp y las redes):

```json
{
  "whatsapp": "+591 71234567",
  "configuracion": {
    "textoBarraSuperior": "Hoy, jueves: Santa Misa 7:00 · 19:00 · Adoración 19:30"
  },
  "redesSociales": [
    {
      "redSocialId": 1,
      "url": "https://www.facebook.com/profile.php?id=100064836665037"
    },
    {
      "redSocialId": 2,
      "url": "https://www.instagram.com/senor_de_la_exaltacion"
    },
    {
      "redSocialId": 3,
      "url": "https://www.youtube.com/@ArquidiocesisdeLaPaz/videos"
    }
  ]
}
```

- `configuracion` se **fusiona** con la guardada: solo cambian las claves enviadas, y una clave con `null` se elimina. Se envía en camelCase y la API la guarda en snake_case.
- `redesSociales`, si se envía, **reemplaza** la lista completa de redes de la sede. Cada `url` debe ser `https://`.
- Otros campos editables: `nombre`, `direccion`, `telefono`, `whatsapp`, `correo`, `latitud`, `longitud` (juntos o ninguno) y `imagenPortadaId` (la API guarda su URL en `url_imagen_portada`).

**Cuerpo de `POST`** (solo el Administrador):

```json
{
  "nombre": "Capilla Santa Gema",
  "slug": "capilla-santa-gema",
  "tipo": "CAPILLA",
  "sedePadreId": 1,
  "direccion": "Calle 15 de Obrajes, La Paz",
  "activo": false
}
```

---

## 10. Proclamas

Proclamas matrimoniales (RF-02). Permiso de escritura: `proclamas.gestionar`.

### Objeto proclama (vista del panel)

```json
{
  "id": 3,
  "sede": {
    "id": 1,
    "nombre": "Parroquia Señor de la Exaltación",
    "slug": "senor-de-la-exaltacion"
  },
  "contrayente1": "Luis F. Gutiérrez",
  "contrayente2": "Andrea Mamani C.",
  "fechaMatrimonio": "2026-12-05T12:00:00-04:00",
  "tramiteOrigenId": null,
  "fechaRegistro": "2026-11-05T11:20:00-04:00",
  "numeroProclama": 1,
  "publicaciones": [{ "numero": 1, "fecha": "2026-11-08" }],
  "vigente": true
}
```

- `publicaciones` incluye también las de fecha futura (ya programadas). En el portal solo aparecen cuando llega su fecha.
- `tramiteOrigenId`: id del trámite en el sistema de gestión parroquial. Es opcional y en la v1.0 se deja en `null`.
- `vigente`: tiene al menos una publicación ya alcanzada y su `fechaMatrimonio` no pasó.

| Método y ruta                                           | Descripción                                                                                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/admin/proclamas`                              | Paginada. Filtros: `sede`, `vigentes` (`true` / `false`), `anio`, `buscar` (nombres). Orden: `fechaMatrimonio` (por defecto) o `-fechaMatrimonio`.     |
| `GET /api/admin/proclamas/:id`                          | Una proclama.                                                                                                                                          |
| `POST /api/admin/proclamas`                             | Crea. `201`.                                                                                                                                           |
| `PATCH /api/admin/proclamas/:id`                        | Edita los nombres o la fecha del matrimonio.                                                                                                           |
| `DELETE /api/admin/proclamas/:id`                       | Elimina la proclama y sus publicaciones. Solo si ninguna publicación llegó todavía a su fecha; si no, `409 CONFLICTO`, porque el historial es público. |
| `POST /api/admin/proclamas/:id/publicaciones`           | Agrega la siguiente publicación: `{ "fecha": "2026-11-15" }`. El `numero` se asigna solo (1, 2, 3).                                                    |
| `PATCH /api/admin/proclamas/:id/publicaciones/:numero`  | Cambia la fecha: `{ "fecha": "2026-11-15" }`.                                                                                                          |
| `DELETE /api/admin/proclamas/:id/publicaciones/:numero` | Quita **la última** publicación.                                                                                                                       |

**Cuerpo de `POST /api/admin/proclamas`:**

```json
{
  "contrayente1": "Luis F. Gutiérrez",
  "contrayente2": "Andrea Mamani C.",
  "fechaMatrimonio": "2026-12-05T12:00:00-04:00",
  "tramiteOrigenId": null,
  "publicaciones": [{ "fecha": "2026-11-08" }]
}
```

Reglas:

- Nombres obligatorios, hasta 150 caracteres.
- `publicaciones` es opcional al crear: hasta 3, con fechas crecientes y anteriores a `fechaMatrimonio`.
- Una cuarta publicación o una fecha posterior al matrimonio responde `409 CONFLICTO` o `400 VALIDACION`, según el caso.

---

## 11. Boletines

Boletines parroquiales en PDF (RF-06). Permiso de escritura: `boletines.gestionar`. Primero se sube el PDF a [multimedia](#2-multimedia) y luego se crea el boletín con ese `archivoId`.

### Objeto boletín (vista del panel)

El mismo objeto del [endpoint público](publico.md#get-apisedessedeboletines), más `sede` y `publicadoPor: { "id", "nombreCompleto" }`.

| Método y ruta                     | Descripción                                                            |
| --------------------------------- | ---------------------------------------------------------------------- |
| `GET /api/admin/boletines`        | Paginada, del más reciente al más antiguo. Filtros: `sede`, `anio`.    |
| `GET /api/admin/boletines/:id`    | Un boletín.                                                            |
| `POST /api/admin/boletines`       | Publica un boletín. `201`. Se publica directamente, sin revisión.      |
| `PATCH /api/admin/boletines/:id`  | Cambia el título o el periodo, o reemplaza el PDF (`archivoId`).       |
| `DELETE /api/admin/boletines/:id` | Elimina el boletín. El PDF queda en la biblioteca multimedia, sin uso. |

**Cuerpo de `POST`:**

```json
{
  "titulo": "Edición de noviembre 2026",
  "periodo": "2026-11",
  "archivoId": 9
}
```

- `periodo`: `YYYY-MM`. Se guarda como el primer día del mes. Solo puede haber un boletín por sede y mes: repetir el periodo es `409 CONFLICTO`.
- `archivoId`: debe ser un `application/pdf` de la misma sede. Si no, `400 VALIDACION`.

---

## 12. Páginas y bloques

Páginas armadas con bloques (RF-04, RNF-06). Permiso de escritura: `paginas.gestionar`. Las páginas se publican directamente: su `estado` es `BORRADOR`, `PUBLICADO` o `ARCHIVADO`, sin revisión.

### Objeto página (vista del panel)

```json
{
  "id": 2,
  "sede": {
    "id": 1,
    "nombre": "Parroquia Señor de la Exaltación",
    "slug": "senor-de-la-exaltacion"
  },
  "estado": { "codigo": "PUBLICADO", "nombre": "Publicado" },
  "slug": "nosotros",
  "titulo": "Quiénes somos",
  "descripcionSeo": "Comunidad parroquial confiada a los Padres Pasionistas en Obrajes, La Paz.",
  "paginaPadre": null,
  "mostrarEnMenu": true,
  "ordenMenu": 1,
  "creadoPor": { "id": 1, "nombreCompleto": "Administrador (desarrollo)" },
  "actualizadoPor": { "id": 3, "nombreCompleto": "Secretaría (desarrollo)" },
  "fechaCreacion": "2026-10-26T10:12:37-04:00",
  "fechaActualizacion": "2026-11-02T16:20:00-04:00",
  "bloques": [
    {
      "id": 3,
      "tipo": "cita",
      "orden": 2,
      "visible": true,
      "contenido": {
        "texto": "Que la Pasión de Jesucristo esté siempre grabada en nuestros corazones.",
        "autor": "Lema de la Congregación Pasionista"
      },
      "fechaActualizacion": "2026-11-02T16:20:00-04:00"
    }
  ]
}
```

En el panel, `bloques` incluye también los no visibles (`visible: false`). La lista de páginas no incluye `bloques`.

### Páginas

| Método y ruta                   | Descripción                                                                                                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/paginas`        | Sin paginar. Filtros: `sede`, `estado`. Orden: `ordenMenu`, `titulo`.                                                                                                            |
| `GET /api/admin/paginas/:id`    | Una página con todos sus bloques.                                                                                                                                                |
| `POST /api/admin/paginas`       | Crea. `201`.                                                                                                                                                                     |
| `PATCH /api/admin/paginas/:id`  | Edita datos o estado. Actualiza `actualizadoPor` y `fechaActualizacion`.                                                                                                         |
| `DELETE /api/admin/paginas/:id` | Elimina la página y sus bloques. Si tiene páginas hijas, `409 CONFLICTO`. Las páginas `inicio` y `nosotros` no se pueden eliminar (`409 CONFLICTO`): el portal depende de ellas. |

**Cuerpo de `POST`:**

```json
{
  "slug": "historia",
  "titulo": "Nuestra historia",
  "descripcionSeo": "Historia de la presencia pasionista en Obrajes.",
  "paginaPadreId": 2,
  "mostrarEnMenu": false,
  "ordenMenu": 0,
  "estado": "BORRADOR"
}
```

### Bloques

| Método y ruta                                     | Descripción                                                   |
| ------------------------------------------------- | ------------------------------------------------------------- |
| `POST /api/admin/paginas/:id/bloques`             | Agrega un bloque al final. `201` con el objeto bloque.        |
| `PATCH /api/admin/paginas/:id/bloques/:bloqueId`  | Edita `contenido` o `visible`. El `tipo` no se puede cambiar. |
| `DELETE /api/admin/paginas/:id/bloques/:bloqueId` | Elimina el bloque.                                            |
| `POST /api/admin/paginas/:id/bloques/reordenar`   | `{ "ids": [2, 3, 4, 5] }`.                                    |

**Cuerpo de `POST .../bloques`:**

```json
{
  "tipo": "cita",
  "contenido": {
    "texto": "Que la Pasión de Jesucristo esté siempre grabada en nuestros corazones.",
    "autor": "Lema de la Congregación Pasionista"
  },
  "visible": true
}
```

**Validación**: `contenido` se valida contra el `esquema_validacion` (JSON Schema) del `tipo_bloque`, y luego con las reglas adicionales de [contenido.md](contenido.md#bloques-de-página). Si no cumple, responde `400 VALIDACION` con la ruta de cada error:

```json
{
  "error": {
    "codigo": "VALIDACION",
    "mensaje": "El contenido del bloque no es válido.",
    "detalles": [{ "campo": "contenido.texto", "mensaje": "Es obligatorio." }]
  }
}
```

Un `tipo` inexistente también es `400 VALIDACION` (`campo`: `tipo`).

---

## 13. Bitácora

Registro de auditoría de todas las modificaciones hechas desde la API (tabla `bitacora_cambio`). Solo lectura. Permiso: `bitacora.ver`. El Párroco solo ve los cambios de recursos de su sede.

### `GET /api/admin/bitacora`

Paginada. Orden: `-fecha` (más recientes primero).

| Parámetro             | Descripción                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| `entidad`             | Nombre de la tabla: `publicacion`, `evento`, `horario`, `usuario`, etc. |
| `entidadId`           | Id del registro (texto).                                                |
| `usuario`             | Id del usuario que hizo el cambio.                                      |
| `accion`              | `INSERT`, `UPDATE` o `DELETE`.                                          |
| `desde`, `hasta`      | Fechas `YYYY-MM-DD`, ambas incluidas.                                   |
| `pagina`, `porPagina` | Paginación estándar.                                                    |

**Respuesta `200`:**

```json
{
  "datos": [
    {
      "id": 128,
      "usuario": { "id": 2, "nombreCompleto": "Párroco (desarrollo)" },
      "entidad": "publicacion",
      "entidadId": "7",
      "accion": "UPDATE",
      "datosAnteriores": {
        "estado_publicacion_id": 4,
        "revisado_por": null,
        "fecha_revision": null
      },
      "datosNuevos": {
        "estado_publicacion_id": 2,
        "revisado_por": 2,
        "fecha_revision": "2026-11-12T18:02:11-04:00"
      },
      "direccionIp": "190.129.24.18",
      "fecha": "2026-11-12T18:02:11-04:00"
    }
  ],
  "paginacion": {
    "pagina": 1,
    "porPagina": 10,
    "total": 1,
    "totalPaginas": 1
  }
}
```

- En un `UPDATE`, `datosAnteriores` y `datosNuevos` solo contienen las columnas que cambiaron. Los nombres de columna van en snake_case, tal como se guardan.
- En `INSERT`, `datosAnteriores` es `null`. En `DELETE`, `datosNuevos` es `null`.
- `hash_contrasena` nunca se registra: en su lugar se guarda `"[oculto]"`.
- `usuario` es `null` en los cambios hechos por procesos del sistema (ej. migraciones).

---

## 14. Usuarios

Solo el Administrador (`usuarios.gestionar`). Los usuarios no se eliminan, se **desactivan**: sus publicaciones, archivos y la bitácora siguen haciendo referencia a ellos.

### Objeto usuario (vista del panel)

```json
{
  "id": 4,
  "nombreCompleto": "Marketing (desarrollo)",
  "correo": "marketing@parroquia.test",
  "rol": { "codigo": "MARKETING", "nombre": "Marketing" },
  "sede": {
    "id": 1,
    "nombre": "Parroquia Señor de la Exaltación",
    "slug": "senor-de-la-exaltacion"
  },
  "activo": true,
  "fechaUltimoAcceso": "2026-11-12T09:02:17-04:00",
  "fechaCreacion": "2026-10-26T10:12:37-04:00"
}
```

Nunca se devuelve el hash de la contraseña.

| Método y ruta                                         | Descripción                                                                                                             |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/usuarios`                             | Paginada. Filtros: `rol` (código), `sede`, `activo`, `buscar` (nombre o correo). Orden: `nombreCompleto` (por defecto). |
| `GET /api/admin/usuarios/:id`                         | Un usuario.                                                                                                             |
| `POST /api/admin/usuarios`                            | Crea. `201`.                                                                                                            |
| `PATCH /api/admin/usuarios/:id`                       | Edita nombre, correo, rol, sede o `activo`.                                                                             |
| `POST /api/admin/usuarios/:id/restablecer-contrasena` | `{ "contrasenaNueva": "..." }` (mínimo 10 caracteres). `204`.                                                           |

**Cuerpo de `POST`:**

```json
{
  "nombreCompleto": "María Elena Quispe",
  "correo": "secretaria.exaltacion@pasionistas.org.bo",
  "rol": "SECRETARIA",
  "sedeId": 1,
  "contrasena": "Temporal-Obrajes-2026",
  "activo": true
}
```

Reglas:

- `correo` único, sin distinguir mayúsculas (`409 CONFLICTO`).
- `sedeId` es obligatorio para todo rol que no sea `ADMINISTRADOR`.
- `contrasena`: mínimo 10 caracteres.
- El Administrador no puede desactivarse ni quitarse el rol a sí mismo, y siempre debe quedar al menos un Administrador activo. Si no, `409 CONFLICTO`.
