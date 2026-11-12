# Formato del contenido: BlockNote y bloques de página

Formato de los tres documentos JSONB que la API guarda y devuelve **sin traducir sus claves** (ver [convenciones.md](convenciones.md#2-nombres-y-tipos-de-datos)):

| Documento                                                                   | Columna                 | Dónde se edita                     |
| --------------------------------------------------------------------------- | ----------------------- | ---------------------------------- |
| [Contenido de las publicaciones](#contenido-de-las-publicaciones-blocknote) | `publicacion.contenido` | Editor BlockNote del panel         |
| [Contenido de los servicios](#contenido-de-los-servicios)                   | `servicio.contenido`    | Formulario de etiqueta y valor     |
| [Bloques de página](#bloques-de-página)                                     | `bloque.contenido`      | Formulario según el tipo de bloque |

La API valida los tres antes de guardar (ADR-01: el motor no valida el JSONB). Un documento inválido responde `400 VALIDACION`, con `detalles[].campo` apuntando a la ruta exacta (ej. `contenido.bloques.3.props.level`).

---

## Contenido de las publicaciones (BlockNote)

### Envoltorio

```json
{
  "formato": "blocknote",
  "version": 1,
  "bloques": []
}
```

| Campo     | Regla                                                                                                                                                                                     |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `formato` | Siempre `"blocknote"`.                                                                                                                                                                    |
| `version` | Siempre `1`: el subconjunto de bloques de este documento, con la forma de BlockNote 0.57. Si en el futuro cambia la forma, se sube la versión y la API convierte los documentos antiguos. |
| `bloques` | El documento del editor tal como lo entrega BlockNote (`editor.document`). Puede estar vacío.                                                                                             |

En el panel:

```js
// Guardar
const contenido = {
  formato: "blocknote",
  version: 1,
  bloques: editor.document,
};

// Cargar
const editor = useCreateBlockNote({
  schema,
  initialContent: contenido.bloques.length ? contenido.bloques : undefined,
});
```

`initialContent` no acepta una lista vacía, por eso se pasa `undefined`. Un documento cuyos bloques son todos párrafos vacíos cuenta como **sin contenido** para los [requisitos de publicación](estados-publicacion.md#requisitos-para-salir-de-borrador).

### Estructura de un bloque

```json
{
  "id": "4f1b8c2e-0d6a-4b52-9a77-3c1e5f0a9d21",
  "type": "paragraph",
  "props": {
    "textColor": "default",
    "backgroundColor": "default",
    "textAlignment": "left"
  },
  "content": [{ "type": "text", "text": "Texto del párrafo.", "styles": {} }],
  "children": []
}
```

| Campo      | Regla                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `id`       | Texto que genera BlockNote, único dentro del documento.                                                                               |
| `type`     | Uno de los [tipos permitidos](#tipos-de-bloque-permitidos).                                                                           |
| `props`    | Exactamente las propiedades de ese tipo en BlockNote 0.57, con valores válidos. Una propiedad desconocida es `400 VALIDACION`.        |
| `content`  | Contenido en línea (`text` y `link`) en los bloques de texto. **No existe** en `image` y `video`.                                     |
| `children` | Bloques anidados. Solo se usa para anidar elementos de lista dentro de otros; profundidad máxima 3. En los demás tipos debe ser `[]`. |

### Tipos de bloque permitidos

Solo este subconjunto. Cualquier otro tipo de BlockNote (tablas, código, archivos, audio, casillas, desplegables, separadores) es `400 VALIDACION`:

| `type`             | `props` (valores por defecto)                                                                                        | Notas                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `paragraph`        | `textColor: "default"`, `backgroundColor: "default"`, `textAlignment: "left"`                                        |                                                                                                                            |
| `heading`          | Las de `paragraph`, más `level` y `isToggleable: false`                                                              | `level` solo 2 o 3: el título (h1) lo pone el portal. `isToggleable` siempre `false`.                                      |
| `bulletListItem`   | Las de `paragraph`                                                                                                   | Se puede anidar en `children`.                                                                                             |
| `numberedListItem` | Las de `paragraph`, más `start` (opcional, número)                                                                   | Se puede anidar en `children`.                                                                                             |
| `quote`            | `textColor`, `backgroundColor`                                                                                       | Cita en el cuerpo del texto.                                                                                               |
| `image`            | `textAlignment`, `backgroundColor`, `name`, `url`, `caption`, `showPreview: true`, `previewWidth` (opcional, número) | `url` obligatoria. `caption` es el pie de foto y el **texto alternativo** en el portal.                                    |
| `video`            | Las mismas de `image`                                                                                                | `url` obligatoria: un video MP4 o WebM subido a multimedia. Para YouTube se usa la sección de [videos](admin.md#8-videos). |

Valores permitidos en `props`:

- `textAlignment`: `left`, `center`, `right`, `justify`.
- `textColor` y `backgroundColor`: `default`, `gray`, `brown`, `red`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink` (paleta de BlockNote).
- `url` de `image` y `video`: debe ser la URL de un archivo de la biblioteca multimedia de **la misma sede** (absoluta de `CDN_PUBLIC_URL` o relativa `/media/seed/...`). No se aceptan imágenes de otros sitios: se rompen sin aviso y pueden rastrear a los visitantes.

### Contenido en línea

| `type` | Forma                                                           | Reglas                                                                                                                                                 |
| ------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `text` | `{ "type": "text", "text": "...", "styles": { ... } }`          | `styles` permitidos: `bold`, `italic`, `underline`, `strike` (`true`), y `textColor`, `backgroundColor` (un valor de la paleta). `code` no se permite. |
| `link` | `{ "type": "link", "href": "...", "content": [ <text>, ... ] }` | `href` debe empezar con `https://`, `http://`, `mailto:`, `tel:`, `/` o `#`. Cualquier otro esquema (ej. `javascript:`) es `400 VALIDACION`.           |

### Límites

- Hasta 500 bloques en total (contando los anidados).
- El documento serializado no puede pasar de 512 KB. El cuerpo JSON completo tiene un límite de 1 MB (`413 ARCHIVO_DEMASIADO_GRANDE`).
- Nunca se guarda HTML: el portal arma la vista a partir de los bloques.

### Configuración del editor en el panel

Para que el editor solo ofrezca los bloques permitidos:

```js
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultStyleSpecs,
} from "@blocknote/core";

const {
  paragraph,
  heading,
  bulletListItem,
  numberedListItem,
  quote,
  image,
  video,
} = defaultBlockSpecs;
const { bold, italic, underline, strike, textColor, backgroundColor } =
  defaultStyleSpecs;

export const esquemaPublicacion = BlockNoteSchema.create({
  blockSpecs: {
    paragraph,
    heading,
    bulletListItem,
    numberedListItem,
    quote,
    image,
    video,
  },
  styleSpecs: { bold, italic, underline, strike, textColor, backgroundColor },
});
```

El editor tiene que subir las imágenes y los videos a `POST /api/admin/multimedia` (opción `uploadFile` de `useCreateBlockNote`) y usar la `url` que devuelve la API.

### Ejemplo completo

Usa los siete tipos de bloque y los dos tipos de contenido en línea:

```json
{
  "formato": "blocknote",
  "version": 1,
  "bloques": [
    {
      "id": "b1",
      "type": "paragraph",
      "props": {
        "textColor": "default",
        "backgroundColor": "default",
        "textAlignment": "left"
      },
      "content": [
        {
          "type": "text",
          "text": "Este sábado celebramos las primeras comuniones de 42 niños de nuestra parroquia.",
          "styles": {}
        }
      ],
      "children": []
    },
    {
      "id": "b2",
      "type": "heading",
      "props": {
        "textColor": "default",
        "backgroundColor": "default",
        "textAlignment": "left",
        "level": 2,
        "isToggleable": false
      },
      "content": [
        {
          "type": "text",
          "text": "Requisitos para la catequesis 2027",
          "styles": {}
        }
      ],
      "children": []
    },
    {
      "id": "b3",
      "type": "bulletListItem",
      "props": {
        "textColor": "default",
        "backgroundColor": "default",
        "textAlignment": "left"
      },
      "content": [
        { "type": "text", "text": "Niños desde los 8 años.", "styles": {} }
      ],
      "children": [
        {
          "id": "b3a",
          "type": "bulletListItem",
          "props": {
            "textColor": "default",
            "backgroundColor": "default",
            "textAlignment": "left"
          },
          "content": [
            {
              "type": "text",
              "text": "Certificado de bautismo ",
              "styles": {}
            },
            { "type": "text", "text": "original", "styles": { "bold": true } }
          ],
          "children": []
        }
      ]
    },
    {
      "id": "b4",
      "type": "numberedListItem",
      "props": {
        "textColor": "default",
        "backgroundColor": "default",
        "textAlignment": "left"
      },
      "content": [
        {
          "type": "text",
          "text": "Inscripción en secretaría, de febrero a marzo.",
          "styles": {}
        }
      ],
      "children": []
    },
    {
      "id": "b5",
      "type": "numberedListItem",
      "props": {
        "textColor": "default",
        "backgroundColor": "default",
        "textAlignment": "left"
      },
      "content": [
        {
          "type": "text",
          "text": "Reunión de padres el primer sábado de abril.",
          "styles": {}
        }
      ],
      "children": []
    },
    {
      "id": "b6",
      "type": "quote",
      "props": { "textColor": "default", "backgroundColor": "default" },
      "content": [
        {
          "type": "text",
          "text": "Dejen que los niños vengan a mí.",
          "styles": { "italic": true }
        }
      ],
      "children": []
    },
    {
      "id": "b7",
      "type": "image",
      "props": {
        "textAlignment": "center",
        "backgroundColor": "default",
        "name": "crucifijo.webp",
        "url": "/media/seed/crucifijo.webp",
        "caption": "Crucifijo en el interior del templo parroquial",
        "showPreview": true,
        "previewWidth": 720
      },
      "children": []
    },
    {
      "id": "b8",
      "type": "video",
      "props": {
        "textAlignment": "center",
        "backgroundColor": "default",
        "name": "portada-final.mp4",
        "url": "/media/seed/portada-final.mp4",
        "caption": "Recorrido aéreo y del templo",
        "showPreview": true,
        "previewWidth": 720
      },
      "children": []
    },
    {
      "id": "b9",
      "type": "paragraph",
      "props": {
        "textColor": "default",
        "backgroundColor": "default",
        "textAlignment": "left"
      },
      "content": [
        { "type": "text", "text": "Más información en la ", "styles": {} },
        {
          "type": "link",
          "href": "https://www.facebook.com/profile.php?id=100064836665037",
          "content": [
            {
              "type": "text",
              "text": "página de Facebook de la parroquia",
              "styles": {}
            }
          ]
        },
        { "type": "text", "text": ".", "styles": {} }
      ],
      "children": []
    }
  ]
}
```

---

## Contenido de los servicios

`servicio.contenido` guarda los datos concretos que se muestran en «Ver requisitos». Es una lista de pares etiqueta–valor, la que usa el seed de la Sección C:

```json
{
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
}
```

| Campo              | Regla                                                                   |
| ------------------ | ----------------------------------------------------------------------- |
| `datos`            | Obligatorio. Lista de 0 a 20 elementos, en el orden en que se muestran. |
| `datos[].etiqueta` | Obligatoria, de 1 a 60 caracteres, texto plano.                         |
| `datos[].valor`    | Obligatorio, de 1 a 300 caracteres, texto plano.                        |

No se permiten otras claves.

---

## Bloques de página

Cada bloque de una página (`bloque`) tiene un tipo (`tipo_bloque`) y un `contenido` que la API valida en dos pasos:

1. **Esquema de la base**: el `esquema_validacion` (JSON Schema) del tipo, con `ajv`. Es lo que el panel recibe en `GET /api/admin/catalogos` → `tiposBloque`.
2. **Reglas adicionales de la API**: longitudes, formato de URL y claves permitidas. Una clave que no está en la tabla del tipo es `400 VALIDACION`.

Los esquemas del seed no prohíben propiedades adicionales, por eso las claves propias de la landing (`etiqueta`, `texto_video`, `detalle_video`, `tarjeta`, `subtitulo`…) pasan el paso 1. El paso 2 es el que fija la lista cerrada de claves de cada tipo (tablas siguientes).

Reglas comunes a todos los tipos:

- Las claves van en snake_case, tal como se guardan.
- El texto es **plano**: sin HTML ni Markdown. Un salto de párrafo es `\n\n`.
- `url_*`: URL `https://` o ruta relativa del portal (`/media/...`). Las imágenes y videos deben venir de la biblioteca multimedia.
- `enlace`: ancla (`#horarios`), ruta del portal (`/paginas/historia`) o URL `https://`.
- `texto_alternativo` es opcional pero recomendado cuando hay `url_imagen`. Si falta, el portal usa el título del bloque o de la tarjeta.

### `hero_video` · Portada con video

| Clave           | Tipo  | Obligatoria | Regla                                                                    |
| --------------- | ----- | :---------: | ------------------------------------------------------------------------ |
| `titulo`        | texto |      ✓      | Hasta 80 caracteres.                                                     |
| `subtitulo`     | texto |             | Hasta 300.                                                               |
| `etiqueta`      | texto |             | Línea pequeña sobre el título. Hasta 80.                                 |
| `url_video`     | URL   |      ✓      | Video MP4 o WebM de la biblioteca. Se reproduce sin sonido y en bucle.   |
| `url_poster`    | URL   |             | Imagen que se muestra mientras carga el video.                           |
| `texto_video`   | texto |             | Título del botón de reproducción (ej. «Video institucional»). Hasta 60.  |
| `detalle_video` | texto |             | Línea secundaria del botón (ej. «Recorrido aéreo · 0:30»). Hasta 60.     |
| `botones`       | lista |             | De 0 a 3 elementos `{ "texto", "enlace" }`; `texto` hasta 40 caracteres. |

```json
{
  "etiqueta": "Parroquia Pasionista · Obrajes, La Paz",
  "titulo": "Señor de la Exaltación",
  "subtitulo": "Una comunidad que camina junto a Cristo crucificado y resucitado. Te esperamos en casa, con las puertas siempre abiertas.",
  "url_video": "/media/seed/portada-final.mp4",
  "url_poster": "/media/seed/exterior-parroquia.webp",
  "texto_video": "Video institucional",
  "detalle_video": "Recorrido aéreo · 0:30",
  "botones": [
    { "texto": "Ver horarios de misa", "enlace": "#horarios" },
    { "texto": "Conócenos", "enlace": "#nosotros" }
  ]
}
```

### `texto_imagen` · Texto con imagen

| Clave               | Tipo                    | Obligatoria | Regla                                                                                                                                                                             |
| ------------------- | ----------------------- | :---------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `titulo`            | texto                   |      ✓      | Hasta 120.                                                                                                                                                                        |
| `texto`             | texto                   |      ✓      | Hasta 3000. Párrafos separados por `\n\n`.                                                                                                                                        |
| `etiqueta`          | texto                   |             | Línea pequeña sobre el título. Hasta 80.                                                                                                                                          |
| `url_imagen`        | URL                     |             | Imagen de la biblioteca.                                                                                                                                                          |
| `texto_alternativo` | texto                   |             | Hasta 255.                                                                                                                                                                        |
| `posicion_imagen`   | `izquierda` / `derecha` |             | Por defecto, `izquierda`.                                                                                                                                                         |
| `tarjeta`           | objeto                  |             | Tarjeta superpuesta a la imagen: `{ "etiqueta", "titulo", "descripcion" }`. `titulo` es obligatorio (hasta 80); `etiqueta` (hasta 60) y `descripcion` (hasta 200) son opcionales. |

```json
{
  "etiqueta": "Quiénes somos",
  "titulo": "Una casa de oración en el corazón de Obrajes",
  "texto": "Somos una comunidad parroquial confiada a los Padres Pasionistas, que desde la memoria de la Pasión de Cristo acompaña a las familias de Obrajes en la fe, los sacramentos y el servicio a los más necesitados.",
  "url_imagen": "/media/seed/crucifijo.webp",
  "posicion_imagen": "izquierda",
  "tarjeta": {
    "etiqueta": "Congregación de la Pasión",
    "titulo": "Pasionistas · C.P.",
    "descripcion": "Fundada por San Pablo de la Cruz"
  }
}
```

### `tarjetas` · Grilla de tarjetas

| Clave                       | Tipo   | Obligatoria | Regla                                                            |
| --------------------------- | ------ | :---------: | ---------------------------------------------------------------- |
| `titulo`                    | texto  |             | Título de la grilla. Hasta 120.                                  |
| `items`                     | lista  |      ✓      | De 1 a 12 tarjetas.                                              |
| `items[].titulo`            | texto  |      ✓      | Hasta 80.                                                        |
| `items[].subtitulo`         | texto  |             | Línea secundaria (cargo, horario, descripción breve). Hasta 300. |
| `items[].icono`             | texto  |             | Nombre de lucide-react en kebab-case.                            |
| `items[].url_imagen`        | URL    |             | Imagen de la biblioteca.                                         |
| `items[].texto_alternativo` | texto  |             | Hasta 255.                                                       |
| `items[].enlace`            | enlace |             | Destino al hacer clic en la tarjeta.                             |

Accesos rápidos de la portada (página `inicio`):

```json
{
  "items": [
    {
      "titulo": "Horarios de Misa",
      "subtitulo": "Toda la semana",
      "icono": "clock-3",
      "enlace": "#horarios"
    },
    {
      "titulo": "Sacramentos",
      "subtitulo": "Requisitos y fechas",
      "icono": "droplet",
      "enlace": "#sacramentos"
    },
    {
      "titulo": "Calendario",
      "subtitulo": "Próximas actividades",
      "icono": "calendar-days",
      "enlace": "#agenda"
    },
    {
      "titulo": "Proclamas",
      "subtitulo": "Vigentes esta semana",
      "icono": "scroll-text",
      "enlace": "#proclamas"
    }
  ]
}
```

Párroco (página `nosotros`):

```json
{
  "items": [
    {
      "titulo": "P. Gregorio, C.P.",
      "subtitulo": "Párroco",
      "url_imagen": "/media/seed/padre_gregorio.jpg"
    }
  ]
}
```

### `cita` · Cita destacada

| Clave   | Tipo  | Obligatoria | Regla                                           |
| ------- | ----- | :---------: | ----------------------------------------------- |
| `texto` | texto |      ✓      | Hasta 400. Sin comillas: las pone el portal.    |
| `autor` | texto |             | Hasta 120. Sin raya inicial: la pone el portal. |

```json
{
  "texto": "Que la Pasión de Jesucristo esté siempre grabada en nuestros corazones.",
  "autor": "Lema de la Congregación Pasionista"
}
```

### `galeria` · Galería de fotos

| Clave                          | Tipo  | Obligatoria | Regla                                  |
| ------------------------------ | ----- | :---------: | -------------------------------------- |
| `titulo`                       | texto |             | Hasta 120.                             |
| `imagenes`                     | lista |      ✓      | De 1 a 30 imágenes.                    |
| `imagenes[].url`               | URL   |      ✓      | Imagen de la biblioteca.               |
| `imagenes[].texto_alternativo` | texto |      ✓      | Hasta 255.                             |
| `imagenes[].leyenda`           | texto |             | Texto visible bajo la foto. Hasta 200. |

```json
{
  "titulo": "Nuestro templo",
  "imagenes": [
    {
      "url": "/media/seed/exterior-parroquia.webp",
      "texto_alternativo": "Vista exterior de la Parroquia Señor de la Exaltación",
      "leyenda": "Fachada sobre la Av. Héctor Ormachea"
    },
    {
      "url": "/media/seed/altar.webp",
      "texto_alternativo": "Altar del templo parroquial adornado con flores rojas y blancas, con un tríptico de icono al lado derecho"
    },
    {
      "url": "/media/seed/crucifijo.webp",
      "texto_alternativo": "Crucifijo en el interior del templo parroquial"
    }
  ]
}
```

### `video_youtube` · Video de YouTube

| Clave              | Tipo  | Obligatoria | Regla                                                                                                                          |
| ------------------ | ----- | :---------: | ------------------------------------------------------------------------------------------------------------------------------ |
| `youtube_video_id` | texto |      ✓      | Id de 11 caracteres (`A-Z`, `a-z`, `0-9`, `-`, `_`). El panel puede aceptar la URL completa y extraer el id antes de enviarlo. |
| `titulo`           | texto |             | Hasta 160. Se usa como `title` del `<iframe>`.                                                                                 |

```json
{
  "youtube_video_id": "pX7aQm3kR2c",
  "titulo": "Un recorrido por nuestra parroquia"
}
```

El portal lo inserta con `https://www.youtube-nocookie.com/embed/<youtube_video_id>`.
