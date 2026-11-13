# Endpoints de administración del CMS

Endpoints del panel CMS (`frontend/src/admin/`), todos bajo `/api/admin/...`. Siguen las [convenciones generales](convenciones.md) y exigen sesión ([autenticacion.md](autenticacion.md)).

## Reglas comunes

- **Sesión y permisos**: sin sesión, `401 NO_AUTENTICADO`. Sin el permiso de la [matriz](autenticacion.md#7-matriz-de-permisos), `403 SIN_PERMISO`. Todos los roles pueden hacer `GET` sobre los recursos de su sede, salvo usuarios y bitácora.
- **Sede**: las listas aceptan `sede` (slug). Para los roles que no son Administrador, la sede se fuerza a la propia. Al crear, el Administrador indica `sedeId` en el cuerpo; para los demás roles ese campo se ignora y se usa su sede. Un recurso de otra sede responde `403 SIN_PERMISO`.
- **Lecturas por id**: `GET /api/admin/<recurso>/:id`. Si el id no existe, `404 NO_ENCONTRADO`.
- **`PATCH`**: solo los campos enviados cambian; `null` borra un campo opcional. Responde `200` con el objeto completo.
- **`DELETE`**: responde `204`. Si otro registro depende del recurso, responde `409 CONFLICTO` y el `mensaje` dice qué lo usa.
- **Reordenar**: los recursos con `orden` (servicios, preguntas frecuentes, grupos, videos y bloques) tienen `POST .../reordenar` con `{ "ids": [...] }`, que recibe **todos** los ids en el nuevo orden. Responde `200` con la lista ordenada. Si faltan o sobran ids, `400 VALIDACION`.
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
- Salvo `estadosPublicacion`, cada lista va ordenada por `id`. `esquemaValidacion` se devuelve tal como está guardado (sin traducir sus claves).
- Sin sesión, `401 NO_AUTENTICADO`; no pide ningún permiso de la matriz.

---

## 2. Multimedia

Archivos guardados en Oracle Cloud Object Storage (compatible con S3, bucket público). Su URL pública es `CDN_PUBLIC_URL` + `/` + la clave del objeto; con OCI, `CDN_PUBLIC_URL` termina en `/n/<namespace>/b/<bucket>/o` (ver `backend/.env.example`).

### Objeto archivo multimedia (vista del panel)

```json
{
  "id": 8,
  "url": "https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/11/4b1e9c2a-7d3f-4e8a-9c61-2f0d8a5b3e17.webp",
  "nombreOriginal": "primeras comuniones 2026.jpg",
  "tipoMime": "image/webp",
  "tamanoBytes": 412870,
  "ancho": 1600,
  "alto": 1067,
  "variantes": [
    {
      "ancho": 480,
      "url": "https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/11/4b1e9c2a-7d3f-4e8a-9c61-2f0d8a5b3e17-480w.webp"
    },
    {
      "ancho": 960,
      "url": "https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/11/4b1e9c2a-7d3f-4e8a-9c61-2f0d8a5b3e17-960w.webp"
    }
  ],
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

- `url`, `tipoMime`, `tamanoBytes`, `ancho` y `alto` describen el archivo **guardado**, no el que se subió: una imagen JPEG o PNG se guarda como WebP (ver [Imágenes](#imágenes)). `nombreOriginal` conserva el nombre con que se subió.
- `ancho` y `alto` son `null` en los videos y los PDF. `variantes` es `[]` en todo lo que no es imagen.
- `variantes` tiene la misma forma que en el [objeto imagen estándar](convenciones.md#7-objeto-imagen-estándar).
- `enUso` indica si el archivo está siendo usado (ver [Cuándo un archivo está en uso](#cuándo-un-archivo-está-en-uso)). Un archivo en uso no se puede eliminar.

### Tipos y límites (RNF-05)

| Clase     | Tipos permitidos                        | Tamaño máximo |
| --------- | --------------------------------------- | ------------- |
| Imagen    | `image/jpeg`, `image/png`, `image/webp` | 30 MB         |
| Video     | `video/mp4`, `video/webm`               | 2 GB          |
| Documento | `application/pdf`                       | 50 MB         |

- El tipo se detecta **por el contenido del archivo** (firma binaria), no por la extensión ni por el `Content-Type` que manda el navegador. Si no coincide con la tabla, `415 TIPO_NO_PERMITIDO`.
- No se aceptan SVG ni GIF: un SVG puede contener scripts.
- Los videos y los PDF se guardan tal cual. La API no lee su ancho ni su alto: quedan en `null`.
- El tamaño máximo se comprueba contra el archivo subido, antes de procesarlo.
- **Capacidad**: el almacenamiento total es de 50 GB. Se mide con la suma de `tamanoBytes` de todos los archivos (las variantes de las imágenes no se cuentan). Al llegar al 90 %, la subida responde `409 CONFLICTO` con el mensaje «El almacenamiento está casi lleno.».
- **Duración de la subida**: una subida que tarda más de 30 minutos se corta. Un video de 2 GB necesita una conexión de al menos 10 Mbps. Como mejora futura queda la subida directa al bucket con una URL prefirmada para los videos grandes.

### Imágenes

Toda imagen subida se procesa antes de guardarla:

1. Se aplica la orientación indicada por el EXIF y después se **eliminan todos los metadatos** (incluida la ubicación GPS).
2. Se reduce, sin deformarla, para que su lado largo no pase de **2560 px**. Nunca se amplía.
3. Se guarda como **WebP**, con calidad 82. Los PNG con transparencia conservan la transparencia. El archivo original no se conserva.
4. Se generan las [variantes](#variantes).

Una imagen que no se puede leer (archivo dañado) responde `415 TIPO_NO_PERMITIDO`. Una imagen con demasiados píxeles (más de 268 megapíxeles, aunque pese poco) responde `400 VALIDACION` con el detalle en `archivo`: así se evitan las «bombas de descompresión».

### Variantes

Las imágenes subidas desde el CMS tienen versiones más pequeñas para que el navegador descargue solo lo que necesita.

- Se generan **solo** las de ancho **menor** que el de la imagen guardada, entre 480, 960 y 1600 px. Una imagen de 400 px de ancho no tiene variantes.
- El cliente **nunca deduce** las URL de las variantes a partir de la `url` principal: usa siempre el campo `variantes`. Las imágenes del seed (`/media/seed/...`) y las de URL fija no tienen variantes y devuelven `[]`.
- Claves de los objetos en el bucket: la principal es `sedes/<slug-de-la-sede>/<año>/<mes>/<uuid>.webp` y cada variante, `.../<uuid>-<ancho>w.webp`. El nombre original solo se guarda en la base.
- Al eliminar un archivo se eliminan también sus variantes.

### Cuándo un archivo está en uso

`enUso` es `true` si el archivo está en alguno de estos lugares:

- como portada de una publicación;
- como imagen de un evento o de un grupo pastoral;
- como archivo de un boletín;
- como portada de una sede (la `url` de la portada es la del archivo);
- dentro del contenido de una publicación o de un servicio;
- dentro de un bloque de una página.

> El contenido de las publicaciones, los servicios y los bloques es JSON: en él el archivo se busca por su **identificador único** (el `<uuid>` de la clave del objeto), no por la URL completa. Así también se detecta cuando el contenido usa una de sus variantes.

### `POST /api/admin/multimedia`

Sube un archivo. Permiso: `multimedia.subir`. **`Content-Type: multipart/form-data`.**

| Campo del formulario | Tipo    | Regla                                                                                                                                                                 |
| -------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `archivo`            | archivo | Obligatorio. Uno solo.                                                                                                                                                |
| `textoAlternativo`   | texto   | Opcional, hasta 255 caracteres. Se acepta y se guarda en cualquier clase de archivo. Recomendado para imágenes: es necesario para publicarlas en el portal.           |
| `sedeId`             | entero  | Solo lo usa el Administrador (los demás roles usan su sede y se ignora este campo). Por defecto, su sede. **Obligatorio** si el Administrador no tiene sede asignada. |

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

| Código                         | Cuándo                                                                                                                                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `400 VALIDACION`               | Falta `archivo`, se envió más de uno, `textoAlternativo` es demasiado largo, falta `sedeId` (Administrador sin sede), el `sedeId` no existe o la sede está inactiva, o la imagen tiene demasiados píxeles. |
| `413 ARCHIVO_DEMASIADO_GRANDE` | El archivo supera el límite de su clase.                                                                                                                                                                   |
| `415 TIPO_NO_PERMITIDO`        | Tipo real no permitido, imagen dañada, o la petición no es `multipart/form-data`.                                                                                                                          |
| `409 CONFLICTO`                | Almacenamiento casi lleno.                                                                                                                                                                                 |
| `503 SERVICIO_NO_DISPONIBLE`   | El almacenamiento no está configurado en el servidor o no responde. No se guarda nada.                                                                                                                     |

Mensajes:

| Error | `mensaje`                                                                                                                     | `detalles`         |
| ----- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 400   | «Falta el archivo.» / «Envía un solo archivo.»                                                                                | `archivo`          |
| 400   | «El texto alternativo puede tener hasta 255 caracteres.»                                                                      | `textoAlternativo` |
| 400   | «Indica la sede del archivo.» / «La sede no existe o está inactiva.»                                                          | `sedeId`           |
| 400   | «La imagen tiene demasiados píxeles (máximo 268 megapíxeles).»                                                                | `archivo`          |
| 413   | «Las imágenes pueden pesar hasta 30 MB.» / «Los videos pueden pesar hasta 2 GB.» / «Los documentos pueden pesar hasta 50 MB.» | `[]`               |
| 415   | «El archivo no es de un tipo permitido. Se aceptan imágenes JPEG, PNG y WebP, videos MP4 y WebM, y documentos PDF.»           | `[]`               |
| 415   | «El archivo no es una imagen válida.»                                                                                         | `[]`               |
| 415   | «La petición debe ser multipart/form-data.»                                                                                   | `[]`               |
| 409   | «El almacenamiento está casi lleno.»                                                                                          | `[]`               |
| 503   | «El almacenamiento de archivos no está configurado.» / «No se pudo guardar el archivo. Intenta de nuevo más tarde.»           | `[]`               |

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

### `GET /api/admin/multimedia/:id`

Un archivo de la biblioteca. Es la dirección que devuelve la cabecera `Location` de la subida.

**Respuesta `200`:** `{ "datos": <archivo multimedia> }`.

**Errores:** `404 NO_ENCONTRADO` si el id no existe y `403 SIN_PERMISO` si el archivo es de otra sede.

### `PATCH /api/admin/multimedia/:id`

Solo se puede cambiar `textoAlternativo` (hasta 255 caracteres; `null` lo borra). Cualquier otro campo responde `400 VALIDACION`. Permiso: `multimedia.subir`.

```json
{
  "textoAlternativo": "Niños de primera comunión con sus catequistas frente al altar"
}
```

**Respuesta `200`:** `{ "datos": <archivo multimedia> }`.

### `DELETE /api/admin/multimedia/:id`

Borra el archivo de la base y del bucket, con todas sus variantes. Permiso: `multimedia.eliminar`. **Respuesta `204`.**

**Errores:**

| Código                       | Cuándo                                                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `403 SIN_PERMISO`            | Fuera del Administrador, cada usuario solo puede borrar lo que subió: «Solo puedes eliminar los archivos que tú subiste.» También si es de otra sede. |
| `404 NO_ENCONTRADO`          | El id no existe.                                                                                                                                      |
| `409 CONFLICTO`              | El archivo está en uso.                                                                                                                               |
| `503 SERVICIO_NO_DISPONIBLE` | El almacenamiento no está configurado o no responde. **No se borra nada**: se puede reintentar.                                                       |

Si el archivo está en uso, el `mensaje` es «El archivo está en uso y no se puede eliminar.» y `detalles` trae un elemento por cada uso, con `campo: "id"`:

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

| Uso                          | Mensaje del detalle                                    |
| ---------------------------- | ------------------------------------------------------ |
| Portada de una publicación   | Usado como portada de la publicación «título».         |
| Imagen de un evento          | Usado como imagen del evento «título».                 |
| Imagen de un grupo pastoral  | Usado como imagen del grupo «nombre».                  |
| Archivo de un boletín        | Usado como archivo del boletín «título».               |
| Portada de una sede          | Usado como portada de la sede «nombre».                |
| Contenido de una publicación | Usado dentro del contenido de la publicación «título». |
| Contenido de un servicio     | Usado dentro del contenido del servicio «nombre».      |
| Bloque de una página         | Usado en un bloque de la página «título».              |

Se listan hasta 5 usos. Si hay más, el último elemento dice «Y N usos más.».

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
    "alto": 1057,
    "variantes": []
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
| `sedeId`                         | Solo lo usa el Administrador (los demás roles usan su sede). Por defecto, su sede; **obligatorio** si no tiene sede asignada. Debe existir.                       |

**Respuesta `201`:** el objeto publicación, en `BORRADOR`, con la cabecera `Location: /api/admin/publicaciones/:id`.

- Un campo que no está en la tabla responde `400 VALIDACION` («Campo no permitido.»).
- `contenido` puede guardarse con `bloques: []` en cualquier tipo: el borrador no necesita estar completo. Que tenga contenido (o `urlExterna`) se exige al salir de `BORRADOR` ([requisitos](estados-publicacion.md#requisitos-para-salir-de-borrador)).
- Las URL de los bloques `image` y `video` se buscan en la biblioteca de la sede (también la de una variante); si no están, o no son de la clase del bloque, `400 VALIDACION` en `contenido.bloques.N.props.url`.
- Errores de las referencias: «La categoría no existe.» (`categoriaId`), «Debe ser una imagen de la biblioteca multimedia de esta sede.» o «El archivo no es una imagen.» (`imagenPortadaId`), «Indica la sede.» o «La sede no existe.» (`sedeId`).
- Slug repetido: `409 CONFLICTO` con «Ya existe una publicación con el slug «…» en esta sede.» y un detalle en `slug`.
- Sin el permiso del tipo: `403 SIN_PERMISO` con «Tu rol no tiene permiso para crear avisos.» o «… para crear noticias ni notas de prensa.».

### `PATCH /api/admin/publicaciones/:id`

Edita campos (los mismos de la creación, salvo `tipo`). Solo se permite en los estados que indica [estados-publicacion.md](estados-publicacion.md#5-edición-según-el-estado); fuera de ellos responde `409 CONFLICTO`.

```json
{
  "titulo": "Solemnidad de Cristo Rey: misa solemne y procesión",
  "destacada": false
}
```

- Enviar `tipo` responde `400 VALIDACION` («El tipo no se puede cambiar.»); `sedeId` u otro campo desconocido, «Campo no permitido.».
- `"slug": null` lo vuelve a generar desde el título (el nuevo, si también cambia). Cambiar el título no cambia el slug.
- En `PUBLICADO` el slug no se puede cambiar: `409 CONFLICTO` con un detalle en `slug`.
- `fechaExpiracion` se compara con la `fechaPublicacion` que quedaría guardada (la enviada o la actual).

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

Reglas de las acciones (el detalle del flujo está en [estados-publicacion.md](estados-publicacion.md)):

- `aprobar` y `publicar` aceptan solo los campos de la tabla; cualquier otro es `400 VALIDACION`. `fechaPublicacion` y `fechaExpiracion` deben llevar zona horaria. Si se envían ambas en `publicar`, la expiración debe ser posterior (`400` en `fechaExpiracion`).
- `enviar-revision`, `aprobar` y `publicar` validan [los requisitos para salir de `BORRADOR`](estados-publicacion.md#requisitos-para-salir-de-borrador) y responden `400 VALIDACION` con el mensaje «La publicación no está lista para publicarse.» y un detalle por cada campo que falta. `enviar-revision` valida con la fecha de publicación **deseada** guardada.
- Una `fechaExpiracion` que ya pasó, o que no es posterior a la fecha efectiva de publicación, es `400 VALIDACION` en `fechaExpiracion` («Debe ser posterior a la fecha de publicación y a la fecha actual.»).
- Orden de las respuestas de error: `403` si el rol no tiene el permiso de la acción para ese tipo de publicación (o no es el autor, en `enviar-revision`); `409` si el estado actual no la permite. Marketing al enviar un aviso a revisión recibe `409` (los avisos no pasan por revisión), no `403`, porque sí tiene `noticias.redactar`.
- `rechazar` registra al revisor y la fecha; al reenviar o aprobar después, la observación anterior se conserva hasta la nueva decisión (`aprobar` la deja en `null`).

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
  "id": 5,
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

Reglas adicionales:

- `sedeId` (solo el Administrador, igual que en publicaciones): por defecto su sede; obligatorio si no tiene sede asignada.
- `PATCH` acepta los mismos campos salvo `sedeId`; `fechaFin` se compara con la `fechaInicio` que quedaría guardada. `idExternoM365` es solo lectura: enviarlo es `400 VALIDACION` («Campo no permitido.»).
- Con `todoElDia: true` las fechas se guardan como se envían; el portal no muestra la hora.
- `categoriaEventoId` inexistente: `400 VALIDACION` («La categoría no existe.»). `imagenId` debe ser una imagen de la biblioteca de la misma sede («Debe ser una imagen de la biblioteca multimedia de esta sede.»).
- Filtros de la lista: `desde` y `hasta` incluyen todo evento que se cruce con ese rango de días (hora de Bolivia); `estado` acepta `BORRADOR`, `PUBLICADO` y `ARCHIVADO` (varios con comas); `hasta` anterior a `desde` es `400 VALIDACION`.
- Lectura: todos los roles de la sede; `POST`, `PATCH` y `DELETE` piden `eventos.gestionar` (Marketing recibe `403 SIN_PERMISO`).

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

| Método y ruta                                                      | Descripción                                                                                                                                |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/admin/servicios`                                         | Sin paginar, por `orden`. Filtros: `sede`, `visible`.                                                                                      |
| `GET /api/admin/servicios/:id`                                     | Un servicio con sus preguntas frecuentes (activas e inactivas).                                                                            |
| `POST /api/admin/servicios`                                        | Crea. `201`.                                                                                                                               |
| `PATCH /api/admin/servicios/:id`                                   | Edita.                                                                                                                                     |
| `DELETE /api/admin/servicios/:id`                                  | Elimina el servicio. Sus preguntas frecuentes quedan sin servicio asociado: las sigue usando el asistente virtual.                         |
| `POST /api/admin/servicios/reordenar`                              | `{ "ids": [1, 2, 3, 4, 5, 6] }`.                                                                                                           |
| `POST /api/admin/servicios/:id/preguntas-frecuentes`               | Crea una pregunta: `{ "pregunta", "respuesta", "activa" }`.                                                                                |
| `PATCH /api/admin/servicios/:id/preguntas-frecuentes/:preguntaId`  | Edita una pregunta.                                                                                                                        |
| `DELETE /api/admin/servicios/:id/preguntas-frecuentes/:preguntaId` | Elimina una pregunta.                                                                                                                      |
| `POST /api/admin/servicios/:id/preguntas-frecuentes/reordenar`     | `{ "ids": [3, 1, 2] }`: todos los ids de las preguntas del servicio, en el nuevo orden. Responde `200` con la lista de preguntas ordenada. |

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

Reglas adicionales:

- `sedeId` (solo el Administrador): por defecto su sede; obligatorio si no tiene sede asignada. Un campo que no está en el cuerpo es `400 VALIDACION` («Campo no permitido.»).
- Las fechas de `publicaciones` deben ser **estrictamente crecientes** y **anteriores al día del matrimonio** (en hora de Bolivia): `400 VALIDACION` con el detalle en `publicaciones.N.fecha` («Debe ser posterior a la proclama anterior.» / «Debe ser anterior a la fecha del matrimonio.»). Más de 3 publicaciones al crear es `400` en `publicaciones`.
- `POST .../publicaciones`: la cuarta es `409 CONFLICTO` («La proclama ya tiene sus 3 publicaciones.»); una fecha que rompe el orden o pasa del matrimonio es `400 VALIDACION` en `fecha`. Responde `201` con la proclama completa y `Location` de la proclama.
- `PATCH .../publicaciones/:numero`: aplica las mismas reglas de orden a la lista resultante (`400` en `fecha`); un `numero` que la proclama no tiene es `404 NO_ENCONTRADO`. Responde `200` con la proclama.
- `DELETE .../publicaciones/:numero`: solo la última; otra es `409 CONFLICTO` («Solo se puede quitar la última publicación (la N).»). Responde `200` con la proclama actualizada (no `204`, porque sigue existiendo).
- `PATCH` de la proclama: no acepta `tramiteOrigenId` ni `publicaciones`. Si cambia `fechaMatrimonio`, debe seguir siendo posterior a todas las publicaciones (`400` en `fechaMatrimonio`).
- `tramiteOrigenId` repetido: `409 CONFLICTO` con un detalle en `tramiteOrigenId`. Varias proclamas sin trámite (`null`) son válidas.
- `numeroProclama` es el número de la última publicación **ya alcanzada** (su fecha llegó, hoy en Bolivia o antes), o `null` si ninguna. Una proclama con solo publicaciones futuras tiene `numeroProclama: null` y `vigente: false`.
- `GET` (lista): `vigentes=true|false`, `anio` (año de la boda, hora de Bolivia, 1900–2100) y `buscar` (en ambos nombres, sin distinguir mayúsculas ni acentos).
- Los cambios de las publicaciones se registran en la bitácora como cambios de la entidad `proclama`: sus `datosAnteriores` y `datosNuevos` incluyen la clave `publicaciones` (`[{ numero, fecha }]`).
- Lectura: todos los roles de la sede; `POST`, `PATCH` y `DELETE` piden `proclamas.gestionar` (Marketing recibe `403 SIN_PERMISO`).

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

Reglas adicionales:

- `sedeId` (solo el Administrador): por defecto su sede; obligatorio si no tiene sede asignada.
- `titulo`: obligatorio, hasta 150 caracteres. `periodo` con otro formato que `YYYY-MM` (ej. `2026-11-01` o `2026-13`) es `400 VALIDACION`.
- `archivoId` inexistente, de otra sede o que no es un PDF: `400 VALIDACION` en `archivoId` («Debe ser un documento PDF de la biblioteca multimedia de esta sede.» o «El archivo no es un documento PDF.»).
- `periodo` repetido en la sede (al crear o al editar): `409 CONFLICTO` con un detalle en `periodo`. `PATCH` acepta `titulo`, `periodo` y `archivoId`; cualquier otro campo es `400`.
- `publicadoPor` es quien creó el boletín y no cambia al editarlo. `fechaPublicacion` es el momento de la creación.
- Lectura: todos los roles de la sede; `POST`, `PATCH` y `DELETE` piden `boletines.gestionar` (incluye a Marketing).

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
      "id": 4,
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

Cómo se valida el contenido:

- Se evalúan los dos pasos y se informan **juntos** los errores de ambos, sin repetir un mismo error. Cada detalle usa la ruta del dato con el prefijo `contenido.` (`contenido.items.0.titulo`, `contenido.botones.1.enlace`).
- Mensajes: «Es obligatorio.», «Campo no permitido.» (clave que no es del tipo), «Debe ser un texto.» / «una lista.» / «un objeto.» / «un número.» / «true o false.», «Puede tener hasta N caracteres.», «Agrega al menos un elemento.», «Puede tener hasta N elementos.», «Debe ser uno de: …», «Debe ser texto plano, sin HTML.», y uno propio para URL, enlaces, íconos e id de YouTube.
- Las imágenes y los videos (`url_video`, `url_poster`, `url_imagen`, `items[].url_imagen`, `imagenes[].url`) deben ser archivos de la biblioteca multimedia **de la misma sede** y de su clase (video o imagen), sea la ruta `/media/seed/...` o la URL pública del CDN (también la de una variante). Si no, `400 VALIDACION` en ese campo («Debe ser una imagen de la biblioteca multimedia de esta sede.», «El archivo no es un video.»). Un `contenido` que no es un objeto es `400` en `contenido`.
- Un tipo de bloque que se agregue al catálogo sin reglas adicionales en la API se valida solo con su `esquema_validacion`.

### Reglas de páginas y bloques

- **Páginas**: `sedeId` (solo el Administrador, por defecto su sede; obligatorio si no tiene sede). `slug` es opcional (`null` o ausente: se genera desde el título con sufijo `-2`, `-3`… si choca), único por sede (`409 CONFLICTO`) y de hasta 120 caracteres. `estado` por defecto `BORRADOR`; `EN_REVISION` es `400`. `ordenMenu` entre 0 y 32767 (por defecto 0). `paginaPadreId` debe ser una página de la misma sede (`400` en `paginaPadreId`: «La página padre no existe en esta sede.») y, al editar, no puede ser la propia página ni una de sus descendientes («No puede ser la propia página ni una de sus páginas hijas.»). El árbol admite hasta **3 niveles** (una página raíz, sus hijas y las hijas de estas): un `paginaPadreId` que deje alguna página en el nivel 4 es `400 VALIDACION` en `paginaPadreId` («Las páginas se pueden anidar hasta 3 niveles.»). Al mover una página con hijas se cuentan también sus descendientes. Quitar el padre (`null`) siempre se puede.
- **`PATCH` de la página**: `"slug": null` lo regenera desde el título; el slug de `inicio` y de `nosotros` no se puede cambiar (`409 CONFLICTO`, detalle en `slug`). La respuesta del detalle y del `PATCH` incluyen `bloques`.
- **`GET /api/admin/paginas`**: filtros `sede` y `estado` (`BORRADOR`, `PUBLICADO`, `ARCHIVADO`, varios con comas); orden fijo por `ordenMenu` y luego `titulo`; sin `bloques`. `paginaPadre` es `{ id, slug, titulo }` o `null`.
- **Eliminar una página** también elimina sus bloques. El `409 CONFLICTO` de las páginas hijas dice «La página tiene páginas hijas: elimínalas o cámbiales la página padre primero.»; el de `inicio` y `nosotros`, «La página «inicio» no se puede eliminar: el portal depende de ella.».
- **`POST .../bloques`**: `tipo` es el `codigo` del tipo (`cita`, `galeria`…), `visible` por defecto `true`; el `orden` es el último más uno. Responde `201` con el bloque y `Location: /api/admin/paginas/:id/bloques/:bloqueId`. Un bloque tiene `id`, `tipo`, `orden`, `visible`, `contenido` y `fechaActualizacion`.
- **`PATCH .../bloques/:bloqueId`**: `contenido` **reemplaza** al guardado (no se fusiona) y se valida completo; `visible` por sí solo no revalida. Enviar `tipo` es `400` («El tipo no se puede cambiar.»). Un `bloqueId` que no es de esa página es `404 NO_ENCONTRADO`. Responde `200` con el bloque.
- **`DELETE .../bloques/:bloqueId`**: `204`. Los bloques restantes conservan su `orden` (puede haber huecos hasta que se reordene).
- **`POST .../bloques/reordenar`**: `ids` debe tener **todos** los bloques de la página, una vez cada uno; si falta, sobra o se repite alguno, o es de otra página, `400 VALIDACION` en `ids`. Reasigna `orden` 1, 2, 3… y responde `200` con la lista de bloques ordenada. Una página sin bloques acepta `[]`.
- Cambiar un bloque (agregar, editar, eliminar o reordenar) actualiza también `actualizadoPor` y `fechaActualizacion` de la página.
- **Lectura**: todos los roles de la sede; todo lo demás pide `paginas.gestionar` (Marketing recibe `403 SIN_PERMISO`).
- **Bitácora**: las páginas se registran como la entidad `pagina` y cada bloque como `bloque`. A los datos de un bloque se les agrega `sede_id` (la tabla no lo tiene), para que el Párroco vea los cambios de su sede aunque el bloque ya no exista.

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
