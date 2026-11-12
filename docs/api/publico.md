# Endpoints públicos del portal

Endpoints que consume el portal público (`frontend/`). No requieren sesión y solo devuelven contenido **publicado y vigente**. Siguen las [convenciones generales](convenciones.md): envoltorio `datos`, fechas con zona `-04:00`, errores con `codigo`, etc.

Los ejemplos usan los datos reales de la landing y del seed (`database/seed/db_portal_cms_datos_iniciales.sql`). Los ids de `archivo_multimedia` del seed son: 1 `exterior-parroquia.webp`, 2 `crucifijo.webp`, 3 `altar.webp`, 4 `padre_gregorio.jpg`, 5 `pastoral-familiar.jpg` y 6 `portada-final.mp4`.

## Errores comunes a todos los endpoints de esta página

| Situación                                                                              | Respuesta                                                  |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| El slug de `:sede` no existe o la sede está inactiva                                   | `404 NO_ENCONTRADO` — `"No existe la sede «parroquia-x»."` |
| Un parámetro de query o de ruta tiene un valor inválido (ej. `pagina=0`, `desde=ayer`) | `400 VALIDACION` con `detalles` (`campo`: `query.pagina`)  |
| Error no previsto                                                                      | `500 ERROR_INTERNO`                                        |

Una sede que existe pero aún no tiene contenido (ej. `resurreccion`) responde `200` con listas vacías, no `404`.

## Qué endpoint alimenta cada sección de la landing

| Componente (`frontend/src/components/parroquia/`)        | Endpoint                                                                                                                                           |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Encabezado` (barra superior, teléfono, WhatsApp, redes) | [`GET /api/sedes/:sede`](#get-apisedessede)                                                                                                        |
| `Portada` (título, subtítulo, video, botones)            | [`GET /api/sedes/:sede/paginas/inicio`](#get-apisedessedepaginasslug)                                                                              |
| `Nosotros` (texto, cita, párroco)                        | [`GET /api/sedes/:sede/paginas/nosotros`](#get-apisedessedepaginasslug)                                                                            |
| `Horarios`                                               | [`GET /api/sedes/:sede/horarios`](#get-apisedessedehorarios) + textos de `configuracion` en [`GET /api/sedes/:sede`](#get-apisedessede)            |
| `Sacramentos`                                            | [`GET /api/sedes/:sede/servicios`](#get-apisedessedeservicios) y [detalle](#get-apisedessedeserviciosslug)                                         |
| `Agenda`: próximos eventos                               | [`GET /api/sedes/:sede/eventos`](#get-apisedessedeeventos)                                                                                         |
| `Agenda`: avisos parroquiales                            | [`GET /api/sedes/:sede/publicaciones?tipo=AVISO`](#get-apisedessedepublicaciones)                                                                  |
| `Agenda`: boletín parroquial                             | [`GET /api/sedes/:sede/boletines?porPagina=1`](#get-apisedessedeboletines)                                                                         |
| `VidaParroquial` (noticias y notas de prensa)            | [`GET /api/sedes/:sede/publicaciones?tipo=NOTICIA,NOTA_DE_PRENSA`](#get-apisedessedepublicaciones) y [detalle](#get-apisedessedepublicacionesslug) |
| `Proclamas`                                              | [`GET /api/sedes/:sede/proclamas`](#get-apisedessedeproclamas) e [historial](#get-apisedessedeproclamashistorial)                                  |
| `VideoInstitucional`                                     | [`GET /api/sedes/:sede/videos`](#get-apisedessedevideos)                                                                                           |
| `GruposPastorales`                                       | [`GET /api/sedes/:sede/grupos-pastorales`](#get-apisedessedegrupos-pastorales)                                                                     |
| `Comunidades`                                            | [`GET /api/sedes`](#get-apisedes)                                                                                                                  |
| `Contacto` y `PiePagina`                                 | [`GET /api/sedes/:sede`](#get-apisedessede)                                                                                                        |

Las anclas de navegación (`#horarios`, `#agenda`…) y los accesos rápidos de la portada son parte del diseño y no vienen de la API.

---

## `GET /api/salud`

Estado de la API y de la base de datos. Lo usan monitores externos, por eso **no** usa el envoltorio `datos`.

**Respuesta `200`** (todo funciona):

```json
{
  "estado": "ok",
  "servicio": "api-parroquia",
  "fecha": "2026-11-12T15:04:12.381Z",
  "dependencias": {
    "baseDatos": "ok"
  }
}
```

**Respuesta `503`** (la API responde pero la base de datos no):

```json
{
  "estado": "degradado",
  "servicio": "api-parroquia",
  "fecha": "2026-11-12T15:04:12.381Z",
  "dependencias": {
    "baseDatos": "error"
  }
}
```

`fecha` es la hora del servidor en UTC (`Z`), la única fecha de la API que no se devuelve en `-04:00`.

---

## `GET /api/sedes`

Sedes activas, para la sección «Nuestras comunidades». Sin paginación. Orden: primero las parroquias y después las capillas; dentro de cada tipo, por `id`.

**Respuesta `200`:**

```json
{
  "datos": [
    {
      "id": 1,
      "nombre": "Parroquia Señor de la Exaltación",
      "slug": "senor-de-la-exaltacion",
      "tipo": { "codigo": "PARROQUIA", "nombre": "Parroquia" },
      "sedePadre": null,
      "direccion": "Av. Héctor Ormachea N.º 167, Obrajes, La Paz",
      "imagenPortada": {
        "id": 1,
        "url": "/media/seed/exterior-parroquia.webp",
        "textoAlternativo": "Vista exterior de la Parroquia Señor de la Exaltación",
        "ancho": 1878,
        "alto": 1057
      },
      "enlaceComoLlegar": "https://www.google.com/maps/dir/?api=1&destination=-16.5267952%2C-68.1082157"
    },
    {
      "id": 2,
      "nombre": "Parroquia de la Resurrección",
      "slug": "resurreccion",
      "tipo": { "codigo": "PARROQUIA", "nombre": "Parroquia" },
      "sedePadre": null,
      "direccion": "La Paz",
      "imagenPortada": null,
      "enlaceComoLlegar": null
    },
    {
      "id": 3,
      "nombre": "Capilla San Pablo de la Cruz",
      "slug": "capilla-san-pablo-de-la-cruz",
      "tipo": { "codigo": "CAPILLA", "nombre": "Capilla" },
      "sedePadre": {
        "id": 1,
        "nombre": "Parroquia Señor de la Exaltación",
        "slug": "senor-de-la-exaltacion"
      },
      "direccion": "La Paz",
      "imagenPortada": null,
      "enlaceComoLlegar": null
    }
  ]
}
```

- `tipo.codigo`: `PARROQUIA` o `CAPILLA`.
- `imagenPortada` sale de `sede.url_imagen_portada`. Si esa URL coincide con un archivo de `archivo_multimedia`, se completan `id`, `ancho`, `alto` y `textoAlternativo`; si no, esos campos van en `null`.
- `enlaceComoLlegar` sale de `configuracion.enlace_como_llegar`.

---

## `GET /api/sedes/:sede`

Datos institucionales, contacto, redes sociales y configuración visual de una sede (RF-01, RF-10). Alimenta el encabezado, el contacto, el pie de página y los textos de la sección de horarios.

**Respuesta `200`** para `GET /api/sedes/senor-de-la-exaltacion`:

```json
{
  "datos": {
    "id": 1,
    "nombre": "Parroquia Señor de la Exaltación",
    "slug": "senor-de-la-exaltacion",
    "tipo": { "codigo": "PARROQUIA", "nombre": "Parroquia" },
    "sedePadre": null,
    "direccion": "Av. Héctor Ormachea N.º 167, Obrajes, La Paz",
    "telefono": "(2) 278 4937",
    "whatsapp": null,
    "correo": "parroquia.exaltacion.obrajes@gmail.com",
    "ubicacion": {
      "latitud": -16.526795,
      "longitud": -68.108216
    },
    "imagenPortada": {
      "id": 1,
      "url": "/media/seed/exterior-parroquia.webp",
      "textoAlternativo": "Vista exterior de la Parroquia Señor de la Exaltación",
      "ancho": 1878,
      "alto": 1057
    },
    "redesSociales": [
      {
        "nombre": "Facebook",
        "icono": "facebook",
        "url": "https://www.facebook.com/profile.php?id=100064836665037"
      },
      {
        "nombre": "Instagram",
        "icono": "instagram",
        "url": "https://www.instagram.com/senor_de_la_exaltacion"
      },
      {
        "nombre": "YouTube",
        "icono": "youtube",
        "url": "https://www.youtube.com/@ArquidiocesisdeLaPaz/videos"
      }
    ],
    "configuracion": {
      "colorPrimario": "#231F20",
      "colorAcento": "#E2AD11",
      "textoBarraSuperior": "Hoy, sábado: Santa Misa 7:00 · 18:00 (vespertina dominical)",
      "textoWhatsapp": "WhatsApp Secretaría",
      "enlaceComoLlegar": "https://www.google.com/maps/dir/?api=1&destination=-16.5267952%2C-68.1082157",
      "enlaceMessenger": "https://www.facebook.com/profile.php?id=100064836665037",
      "textoMessenger": "Escríbenos por Facebook Messenger",
      "descripcionPie": "Parroquia confiada a la Congregación de la Pasión de Jesucristo (Pasionistas). Arquidiócesis de La Paz · Vicaría Sur.",
      "textoCopyright": "© 2026 Parroquia Señor de la Exaltación · Pasionistas Bolivia · pasionistas.org.bo",
      "textoCreditos": "Diseño y desarrollo: CodeForge · Ingeniería de Sistemas UCB",
      "horariosIntroduccion": "Horarios regulares de la parroquia. Las celebraciones especiales se publican en el calendario.",
      "horariosNotas": {
        "confesionesAdoracion": "Previo a cada misa, según disponibilidad",
        "secretaria": "Trámites, certificados e inscripciones"
      },
      "horariosWhatsappSecretaria": "Asistente 24/7"
    }
  }
}
```

- `whatsapp` es `null` mientras el número no esté confirmado. El portal muestra entonces `textoWhatsapp` sin enlace.
- `telefono` se devuelve tal como se guarda, para mostrarlo. El enlace `tel:` lo arma el portal (`tel:+59122784937`).
- `redesSociales`: solo las redes que la sede tiene registradas, ordenadas por el `id` de la red. `icono` es el nombre del ícono de lucide-react.
- `configuracion`: el JSONB `sede.configuracion` con **todas sus claves traducidas a camelCase**, también las anidadas (`horarios_notas.confesiones_adoracion` → `horariosNotas.confesionesAdoracion`). Las claves documentadas arriba son las que usa la landing; una sede nueva puede no tener ninguna (`"configuracion": {}`), y el portal usa entonces sus valores por defecto.

---

## `GET /api/sedes/:sede/horarios`

Horarios activos, agrupados por tipo (RF-01). La API ya agrupa los días con el mismo horario, para que el portal muestre filas como «Lunes a viernes · 7:00 · 19:00» sin calcularlas.

**Parámetros de query:**

| Parámetro | Tipo      | Descripción                                                                           |
| --------- | --------- | ------------------------------------------------------------------------------------- |
| `tipo`    | entero(s) | Filtra por id de tipo de horario, separados por comas (ej. `tipo=1` solo Santa Misa). |

**Respuesta `200`:**

```json
{
  "datos": [
    {
      "tipo": { "id": 1, "nombre": "Santa Misa" },
      "filas": [
        {
          "dias": [1, 2, 3, 4, 5],
          "etiqueta": "Lunes a viernes",
          "horarios": [
            { "horaInicio": "07:00", "horaFin": null, "descripcion": null },
            { "horaInicio": "19:00", "horaFin": null, "descripcion": null }
          ]
        },
        {
          "dias": [6],
          "etiqueta": "Sábado",
          "horarios": [
            { "horaInicio": "07:00", "horaFin": null, "descripcion": null },
            {
              "horaInicio": "18:00",
              "horaFin": null,
              "descripcion": "Misa vespertina dominical"
            }
          ]
        },
        {
          "dias": [7],
          "etiqueta": "Domingo",
          "horarios": [
            { "horaInicio": "08:00", "horaFin": null, "descripcion": null },
            { "horaInicio": "10:00", "horaFin": null, "descripcion": null },
            { "horaInicio": "12:00", "horaFin": null, "descripcion": null },
            { "horaInicio": "19:00", "horaFin": null, "descripcion": null }
          ]
        }
      ]
    },
    {
      "tipo": { "id": 2, "nombre": "Confesiones" },
      "filas": [
        {
          "dias": [1, 2, 3, 4, 5],
          "etiqueta": "Lunes a viernes",
          "horarios": [
            {
              "horaInicio": "18:00",
              "horaFin": "18:45",
              "descripcion": "Previo a cada misa, según disponibilidad"
            }
          ]
        },
        {
          "dias": [6],
          "etiqueta": "Sábado",
          "horarios": [
            {
              "horaInicio": "10:00",
              "horaFin": "12:00",
              "descripcion": "Previo a cada misa, según disponibilidad"
            }
          ]
        }
      ]
    },
    {
      "tipo": { "id": 3, "nombre": "Adoración" },
      "filas": [
        {
          "dias": [4],
          "etiqueta": "Jueves",
          "horarios": [
            { "horaInicio": "19:30", "horaFin": "20:30", "descripcion": null }
          ]
        }
      ]
    },
    {
      "tipo": { "id": 4, "nombre": "Secretaría" },
      "filas": [
        {
          "dias": [1, 2, 3, 4, 5],
          "etiqueta": "Lunes a viernes",
          "horarios": [
            { "horaInicio": "09:00", "horaFin": "12:00", "descripcion": null },
            { "horaInicio": "15:00", "horaFin": "19:30", "descripcion": null }
          ]
        },
        {
          "dias": [6],
          "etiqueta": "Sábado",
          "horarios": [
            { "horaInicio": "09:00", "horaFin": "12:00", "descripcion": null }
          ]
        }
      ]
    }
  ]
}
```

Reglas de agrupación:

- Los grupos se ordenan por el `id` del tipo de horario. Un tipo sin horarios activos no aparece.
- Dentro de un tipo, los días que tienen **exactamente** los mismos horarios (hora de inicio, de fin y descripción) forman una fila. Las filas se ordenan por su primer día.
- `etiqueta`: días consecutivos se escriben como rango («Lunes a viernes»); días sueltos se enumeran («Martes y jueves», «Lunes, miércoles y viernes»); un solo día va con su nombre («Sábado»).
- `horarios` se ordena por `horaInicio`.
- La landing une «Confesiones» y «Adoración» en una sola tarjeta y le pone la nota `configuracion.horariosNotas.confesionesAdoracion`. Esa composición la hace el portal; la API entrega los tipos por separado.
- Para editar horarios uno por uno (con su `id`), el panel usa `GET /api/admin/horarios` (ver [admin.md](admin.md)).

---

## `GET /api/sedes/:sede/servicios`

Servicios y sacramentos visibles, ordenados por `orden`. Sin paginación. No incluye `contenido` (está en el detalle).

**Respuesta `200`:**

```json
{
  "datos": [
    {
      "id": 1,
      "slug": "bautismo",
      "nombre": "Bautismo",
      "descripcionCorta": "Charla pre-bautismal el primer sábado de cada mes. Padres y padrinos se inscriben en secretaría.",
      "icono": "droplet",
      "orden": 1
    },
    {
      "id": 2,
      "slug": "primera-comunion",
      "nombre": "Primera Comunión",
      "descripcionCorta": "Catequesis de dos años para niños desde los 8 años. Inscripciones de febrero a marzo.",
      "icono": "sun",
      "orden": 2
    },
    {
      "id": 3,
      "slug": "confirmacion",
      "nombre": "Confirmación",
      "descripcionCorta": "Preparación para jóvenes desde los 15 años y adultos que deseen completar su iniciación.",
      "icono": "flame",
      "orden": 3
    },
    {
      "id": 4,
      "slug": "matrimonio",
      "nombre": "Matrimonio",
      "descripcionCorta": "Cursillo prematrimonial, presentación de documentos y proclamas con tres meses de anticipación.",
      "icono": null,
      "orden": 4
    },
    {
      "id": 5,
      "slug": "catequesis-de-adultos",
      "nombre": "Catequesis de adultos",
      "descripcionCorta": "Formación para adultos que desean recibir los sacramentos o profundizar su fe.",
      "icono": "book-open",
      "orden": 5
    },
    {
      "id": 6,
      "slug": "uncion-de-los-enfermos",
      "nombre": "Unción de los enfermos",
      "descripcionCorta": "Visita a enfermos y adultos mayores en domicilio. Coordinar por teléfono o WhatsApp.",
      "icono": "heart-pulse",
      "orden": 6
    }
  ]
}
```

`icono: null` (Matrimonio): el portal usa su ícono propio de anillos, porque lucide no tiene uno equivalente.

## `GET /api/sedes/:sede/servicios/:slug`

Detalle de un servicio para la vista «Ver requisitos». Incluye el `contenido` (formato en [contenido.md](contenido.md)) y sus preguntas frecuentes activas, ordenadas por `orden`.

**Respuesta `200`** para `GET /api/sedes/senor-de-la-exaltacion/servicios/bautismo`:

```json
{
  "datos": {
    "id": 1,
    "slug": "bautismo",
    "nombre": "Bautismo",
    "descripcionCorta": "Charla pre-bautismal el primer sábado de cada mes. Padres y padrinos se inscriben en secretaría.",
    "icono": "droplet",
    "orden": 1,
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
    "preguntasFrecuentes": [
      {
        "id": 1,
        "pregunta": "¿Qué requisitos necesito para bautizar a mi hijo?",
        "respuesta": "Certificado de nacimiento, CI de padres y padrinos, y asistir a la charla pre-bautismal del primer sábado de cada mes."
      }
    ]
  }
}
```

**Errores:** `404 NO_ENCONTRADO` si el slug no existe en la sede o el servicio no está visible.

---

## `GET /api/sedes/:sede/grupos-pastorales`

Grupos y pastorales visibles, ordenados por `orden`. Sin paginación.

**Respuesta `200`:**

```json
{
  "datos": [
    {
      "id": 1,
      "nombre": "Monaguillos",
      "descripcion": null,
      "horarioReunion": "Sábados · 10:00",
      "contacto": null,
      "icono": "star",
      "imagen": null,
      "orden": 1
    },
    {
      "id": 2,
      "nombre": "Coro parroquial",
      "descripcion": null,
      "horarioReunion": "Jueves · 19:00",
      "contacto": null,
      "icono": "music-2",
      "imagen": null,
      "orden": 2
    },
    {
      "id": 3,
      "nombre": "Catequistas",
      "descripcion": null,
      "horarioReunion": "Formación mensual",
      "contacto": null,
      "icono": "book-open",
      "imagen": null,
      "orden": 3
    },
    {
      "id": 4,
      "nombre": "Pastoral Juvenil",
      "descripcion": null,
      "horarioReunion": "Viernes · 18:30",
      "contacto": null,
      "icono": "users",
      "imagen": null,
      "orden": 4
    },
    {
      "id": 5,
      "nombre": "Legión de María",
      "descripcion": null,
      "horarioReunion": "Martes · 16:00",
      "contacto": null,
      "icono": "cross",
      "imagen": null,
      "orden": 5
    },
    {
      "id": 6,
      "nombre": "Pastoral social",
      "descripcion": null,
      "horarioReunion": "Cáritas parroquial",
      "contacto": null,
      "icono": "heart-handshake",
      "imagen": null,
      "orden": 6
    }
  ]
}
```

`horarioReunion` es texto libre (ej. «Formación mensual»), no un horario estructurado.

---

## `GET /api/sedes/:sede/eventos`

Próximos eventos publicados del calendario parroquial, en orden cronológico (RF-09). Paginado.

**Un evento es «próximo» mientras no haya terminado:**

- con `fechaFin`: mientras `fechaFin` sea posterior a ahora;
- sin `fechaFin`: hasta el final del día de `fechaInicio` (23:59:59, hora de Bolivia). Así, la misa de las 19:00 sigue visible durante esa noche.

Los eventos pasados nunca se devuelven: el retiro es automático y no depende de que alguien los archive. Solo se devuelven eventos en estado `PUBLICADO`.

**Parámetros de query:**

| Parámetro             | Tipo               | Por defecto | Descripción                                                                          |
| --------------------- | ------------------ | ----------- | ------------------------------------------------------------------------------------ |
| `desde`               | fecha `YYYY-MM-DD` | hoy         | Primer día del rango, para la vista de calendario. Si es anterior a hoy, se usa hoy. |
| `hasta`               | fecha `YYYY-MM-DD` | sin límite  | Último día del rango (incluido). Debe ser igual o posterior a `desde`.               |
| `categoria`           | entero(s)          | todas       | Ids de categoría de evento, separados por comas.                                     |
| `pagina`, `porPagina` | entero             | `1`, `10`   | Paginación estándar.                                                                 |

Orden fijo: `fechaInicio` ascendente.

**Respuesta `200`** para `GET /api/sedes/senor-de-la-exaltacion/eventos?porPagina=4` (consultado el 12/11/2026):

```json
{
  "datos": [
    {
      "id": 3,
      "titulo": "Solemnidad de Cristo Rey del Universo",
      "descripcion": "Santa Misa solemne y procesión con el Santísimo alrededor de la plaza.",
      "lugar": "Templo parroquial",
      "fechaInicio": "2026-11-22T10:00:00-04:00",
      "fechaFin": "2026-11-22T12:00:00-04:00",
      "todoElDia": false,
      "categoria": { "id": 2, "nombre": "Solemnidad", "colorHex": "#9E1B22" },
      "imagen": null
    },
    {
      "id": 4,
      "titulo": "Primer domingo de Adviento: bendición de coronas",
      "descripcion": "Trae tu corona de Adviento para bendecirla en todas las misas del domingo.",
      "lugar": "Templo parroquial",
      "fechaInicio": "2026-11-29T08:00:00-04:00",
      "fechaFin": null,
      "todoElDia": true,
      "categoria": { "id": 1, "nombre": "Liturgia", "colorHex": "#E2AD11" },
      "imagen": null
    },
    {
      "id": 5,
      "titulo": "Charla pre-bautismal para padres y padrinos",
      "descripcion": null,
      "lugar": "Salón parroquial",
      "fechaInicio": "2026-12-05T09:30:00-04:00",
      "fechaFin": null,
      "todoElDia": false,
      "categoria": { "id": 3, "nombre": "Catequesis", "colorHex": "#B5532F" },
      "imagen": null
    },
    {
      "id": 6,
      "titulo": "Solemnidad de la Inmaculada Concepción",
      "descripcion": null,
      "lugar": "Templo parroquial",
      "fechaInicio": "2026-12-08T19:00:00-04:00",
      "fechaFin": null,
      "todoElDia": false,
      "categoria": { "id": 2, "nombre": "Solemnidad", "colorHex": "#9E1B22" },
      "imagen": {
        "id": 3,
        "url": "/media/seed/altar.webp",
        "textoAlternativo": "Altar del templo parroquial adornado con flores rojas y blancas, con un tríptico de icono al lado derecho",
        "ancho": 1879,
        "alto": 1057
      }
    }
  ],
  "paginacion": {
    "pagina": 1,
    "porPagina": 4,
    "total": 4,
    "totalPaginas": 1
  }
}
```

- `todoElDia: true`: el portal muestra solo la fecha, sin hora.
- La tarjeta de la landing muestra día y mes (`22 NOV`), la hora y el lugar. El portal los arma con `fechaInicio`.

---

## `GET /api/sedes/:sede/publicaciones`

Avisos, noticias y notas de prensa **publicados y vigentes**. Paginado. No incluye `contenido` (está en el detalle).

Una publicación se devuelve solo si cumple las tres condiciones:

1. su estado es `PUBLICADO`;
2. `fechaPublicacion` es anterior o igual a ahora (las programadas a futuro todavía no salen);
3. `fechaExpiracion` es `null` o posterior a ahora.

El ciclo de estados completo está en [estados-publicacion.md](estados-publicacion.md).

**Parámetros de query:**

| Parámetro             | Tipo                                    | Por defecto         | Descripción                                                      |
| --------------------- | --------------------------------------- | ------------------- | ---------------------------------------------------------------- |
| `tipo`                | código(s)                               | todos               | `AVISO`, `NOTICIA`, `NOTA_DE_PRENSA`, separados por comas.       |
| `categoria`           | slug                                    | todas               | Slug de la categoría (ej. `sacramentos`).                        |
| `destacada`           | `true` / `false`                        | todas               | Solo las destacadas (o solo las no destacadas).                  |
| `buscar`              | texto (2–100 caracteres)                | —                   | Busca en título y resumen, sin distinguir mayúsculas ni acentos. |
| `pagina`, `porPagina` | entero                                  | `1`, `10`           | Paginación estándar.                                             |
| `orden`               | `fechaPublicacion`, `-fechaPublicacion` | `-fechaPublicacion` | Más recientes primero.                                           |

**Respuesta `200`** para `GET /api/sedes/senor-de-la-exaltacion/publicaciones?tipo=NOTICIA,NOTA_DE_PRENSA&porPagina=3` (sección «Vida parroquial»):

```json
{
  "datos": [
    {
      "id": 6,
      "tipo": { "codigo": "NOTICIA", "nombre": "Noticia" },
      "titulo": "Encuentro de Pastoral Familiar: Cuando la muerte llega a la familia",
      "slug": "encuentro-de-pastoral-familiar-cuando-la-muerte-llega-a-la-familia",
      "resumen": "Un espacio para reflexionar sobre la pérdida de un ser querido y encontrar acompañamiento desde la fe. Viernes 30 de octubre a las 19:30, en el Salón San Gabriel.",
      "categoria": {
        "id": 4,
        "nombre": "Pastoral Familiar",
        "slug": "pastoral-familiar"
      },
      "imagenPortada": {
        "id": 5,
        "url": "/media/seed/pastoral-familiar.jpg",
        "textoAlternativo": "Afiche del encuentro de Pastoral Familiar sobre el duelo y la pérdida de un ser querido",
        "ancho": 1137,
        "alto": 1383
      },
      "urlExterna": "https://www.facebook.com/photo.php?fbid=1568791201958754&set=pb.100064836665037.-2207520000&type=3",
      "destacada": true,
      "fechaPublicacion": "2026-10-30T08:00:00-04:00",
      "fechaExpiracion": null
    },
    {
      "id": 4,
      "tipo": { "codigo": "NOTICIA", "nombre": "Noticia" },
      "titulo": "Primeras comuniones: 42 niños recibieron a Jesús",
      "slug": "primeras-comuniones-42-ninos-recibieron-a-jesus",
      "resumen": "Una jornada de fiesta para toda la comunidad, acompañada por catequistas y familias.",
      "categoria": { "id": 1, "nombre": "Sacramentos", "slug": "sacramentos" },
      "imagenPortada": {
        "id": 2,
        "url": "/media/seed/crucifijo.webp",
        "textoAlternativo": "Crucifijo en el interior del templo parroquial",
        "ancho": 1888,
        "alto": 1059
      },
      "urlExterna": null,
      "destacada": false,
      "fechaPublicacion": "2026-10-18T10:00:00-04:00",
      "fechaExpiracion": null
    },
    {
      "id": 5,
      "tipo": { "codigo": "NOTA_DE_PRENSA", "nombre": "Nota de prensa" },
      "titulo": "Encuentro de monaguillos de la Vicaría Sur",
      "slug": "encuentro-de-monaguillos-de-la-vicaria-sur",
      "resumen": "Más de 60 monaguillos compartieron una jornada de formación, juego y oración.",
      "categoria": { "id": 2, "nombre": "Comunidad", "slug": "comunidad" },
      "imagenPortada": {
        "id": 1,
        "url": "/media/seed/exterior-parroquia.webp",
        "textoAlternativo": "Vista exterior de la Parroquia Señor de la Exaltación",
        "ancho": 1878,
        "alto": 1057
      },
      "urlExterna": null,
      "destacada": false,
      "fechaPublicacion": "2026-10-11T18:30:00-04:00",
      "fechaExpiracion": null
    }
  ],
  "paginacion": {
    "pagina": 1,
    "porPagina": 3,
    "total": 3,
    "totalPaginas": 1
  }
}
```

**Respuesta `200`** para `GET /api/sedes/senor-de-la-exaltacion/publicaciones?tipo=AVISO&porPagina=3` (tarjeta «Avisos parroquiales»):

```json
{
  "datos": [
    {
      "id": 3,
      "tipo": { "codigo": "AVISO", "nombre": "Aviso" },
      "titulo": "Inscripciones abiertas para la catequesis de Confirmación 2027.",
      "slug": "inscripciones-abiertas-para-la-catequesis-de-confirmacion-2027",
      "resumen": null,
      "categoria": { "id": 1, "nombre": "Sacramentos", "slug": "sacramentos" },
      "imagenPortada": null,
      "urlExterna": null,
      "destacada": false,
      "fechaPublicacion": "2026-10-24T09:00:00-04:00",
      "fechaExpiracion": "2027-03-31T23:59:59-04:00"
    },
    {
      "id": 2,
      "tipo": { "codigo": "AVISO", "nombre": "Aviso" },
      "titulo": "El 2 de noviembre la secretaría atenderá solo por la mañana.",
      "slug": "el-2-de-noviembre-la-secretaria-atendera-solo-por-la-manana",
      "resumen": null,
      "categoria": null,
      "imagenPortada": null,
      "urlExterna": null,
      "destacada": false,
      "fechaPublicacion": "2026-10-22T09:00:00-04:00",
      "fechaExpiracion": "2026-11-03T00:00:00-04:00"
    },
    {
      "id": 1,
      "tipo": { "codigo": "AVISO", "nombre": "Aviso" },
      "titulo": "Recibimos donaciones de víveres para la Pastoral Social hasta fin de mes.",
      "slug": "recibimos-donaciones-de-viveres-para-la-pastoral-social-hasta-fin-de-mes",
      "resumen": null,
      "categoria": { "id": 2, "nombre": "Comunidad", "slug": "comunidad" },
      "imagenPortada": null,
      "urlExterna": null,
      "destacada": false,
      "fechaPublicacion": "2026-10-20T09:00:00-04:00",
      "fechaExpiracion": "2026-11-01T00:00:00-04:00"
    }
  ],
  "paginacion": {
    "pagina": 1,
    "porPagina": 3,
    "total": 3,
    "totalPaginas": 1
  }
}
```

> Los avisos de ejemplo copian las fechas de la landing (octubre de 2026). Con `fechaExpiracion` ya pasada, la API real dejaría de devolverlos; en los mocks se pueden mostrar tal cual.

- **Avisos**: el texto del aviso es el `titulo`. Normalmente no tienen `resumen` ni imagen.
- **«Leer nota»**: si `urlExterna` tiene valor, el portal abre ese enlace en otra pestaña (ej. la publicación de Facebook). Si no, navega al detalle por `slug`.

## `GET /api/sedes/:sede/publicaciones/:slug`

Detalle de una publicación publicada y vigente, con su `contenido` en formato BlockNote (ver [contenido.md](contenido.md)).

**Respuesta `200`** para `GET /api/sedes/senor-de-la-exaltacion/publicaciones/primeras-comuniones-42-ninos-recibieron-a-jesus`:

```json
{
  "datos": {
    "id": 4,
    "tipo": { "codigo": "NOTICIA", "nombre": "Noticia" },
    "titulo": "Primeras comuniones: 42 niños recibieron a Jesús",
    "slug": "primeras-comuniones-42-ninos-recibieron-a-jesus",
    "resumen": "Una jornada de fiesta para toda la comunidad, acompañada por catequistas y familias.",
    "categoria": { "id": 1, "nombre": "Sacramentos", "slug": "sacramentos" },
    "imagenPortada": {
      "id": 2,
      "url": "/media/seed/crucifijo.webp",
      "textoAlternativo": "Crucifijo en el interior del templo parroquial",
      "ancho": 1888,
      "alto": 1059
    },
    "urlExterna": null,
    "destacada": false,
    "fechaPublicacion": "2026-10-18T10:00:00-04:00",
    "fechaExpiracion": null,
    "contenido": {
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
              "text": "El sábado 17 de octubre, 42 niños de nuestra parroquia recibieron por primera vez a Jesús en la Eucaristía, después de dos años de catequesis.",
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
            "level": 2
          },
          "content": [
            {
              "type": "text",
              "text": "Una fiesta de toda la comunidad",
              "styles": {}
            }
          ],
          "children": []
        },
        {
          "id": "b3",
          "type": "paragraph",
          "props": {
            "textColor": "default",
            "backgroundColor": "default",
            "textAlignment": "left"
          },
          "content": [
            {
              "type": "text",
              "text": "Agradecemos a los ",
              "styles": {}
            },
            {
              "type": "text",
              "text": "catequistas",
              "styles": { "bold": true }
            },
            {
              "type": "text",
              "text": " y a las familias que acompañaron a los niños durante su preparación.",
              "styles": {}
            }
          ],
          "children": []
        }
      ]
    }
  }
}
```

**Errores:** `404 NO_ENCONTRADO` si el slug no existe en la sede, o si la publicación existe pero no está publicada o ya no está vigente. Así el portal no revela borradores.

---

## `GET /api/categorias`

Categorías de publicaciones (catálogo global), ordenadas por `nombre`. Sirve para los filtros de noticias.

**Respuesta `200`:**

```json
{
  "datos": [
    { "id": 2, "nombre": "Comunidad", "slug": "comunidad" },
    { "id": 3, "nombre": "Pasionistas", "slug": "pasionistas" },
    { "id": 4, "nombre": "Pastoral Familiar", "slug": "pastoral-familiar" },
    { "id": 1, "nombre": "Sacramentos", "slug": "sacramentos" }
  ]
}
```

## `GET /api/categorias-evento`

Categorías del calendario (catálogo global), ordenadas por `id`, con el color de la etiqueta.

**Respuesta `200`:**

```json
{
  "datos": [
    { "id": 1, "nombre": "Liturgia", "colorHex": "#E2AD11" },
    { "id": 2, "nombre": "Solemnidad", "colorHex": "#9E1B22" },
    { "id": 3, "nombre": "Catequesis", "colorHex": "#B5532F" },
    { "id": 4, "nombre": "Comunidad", "colorHex": "#3E9C97" }
  ]
}
```

---

## `GET /api/sedes/:sede/proclamas`

Proclamas matrimoniales **vigentes** (RF-02): las que tienen al menos una publicación y cuya `fechaMatrimonio` todavía no pasó. Orden: `fechaMatrimonio` ascendente. Sin paginación.

**Respuesta `200`** (consultado el 12/11/2026):

```json
{
  "datos": [
    {
      "id": 1,
      "contrayente1": "Juan Carlos M. Q.",
      "contrayente2": "María Fernanda R. V.",
      "fechaMatrimonio": "2026-11-14T11:00:00-04:00",
      "numeroProclama": 3,
      "publicaciones": [
        { "numero": 1, "fecha": "2026-10-25" },
        { "numero": 2, "fecha": "2026-11-01" },
        { "numero": 3, "fecha": "2026-11-08" }
      ]
    },
    {
      "id": 2,
      "contrayente1": "Diego A. Choque L.",
      "contrayente2": "Camila S. Paredes",
      "fechaMatrimonio": "2026-11-21T16:00:00-04:00",
      "numeroProclama": 2,
      "publicaciones": [
        { "numero": 1, "fecha": "2026-11-01" },
        { "numero": 2, "fecha": "2026-11-08" }
      ]
    },
    {
      "id": 3,
      "contrayente1": "Luis F. Gutiérrez",
      "contrayente2": "Andrea Mamani C.",
      "fechaMatrimonio": "2026-12-05T12:00:00-04:00",
      "numeroProclama": 1,
      "publicaciones": [{ "numero": 1, "fecha": "2026-11-08" }]
    }
  ]
}
```

- `numeroProclama` es la última proclama publicada (1, 2 o 3). La landing la muestra como «3.ª proclama».
- `publicaciones` solo incluye las proclamas cuya `fecha` ya llegó, ordenadas por `numero`.
- Los nombres son los ficticios de la landing.

## `GET /api/sedes/:sede/proclamas/historial`

Historial público de proclamas (RF-02): todas las que tuvieron al menos una publicación, incluidas las ya celebradas. Paginado. Orden: `fechaMatrimonio` descendente. Cada elemento tiene la misma forma que en `GET /proclamas`.

**Parámetros de query:** `pagina`, `porPagina` y `anio` (entero, filtra por el año de `fechaMatrimonio`).

**Respuesta `200`** para `GET /api/sedes/senor-de-la-exaltacion/proclamas/historial?porPagina=2&pagina=2`:

```json
{
  "datos": [
    {
      "id": 1,
      "contrayente1": "Juan Carlos M. Q.",
      "contrayente2": "María Fernanda R. V.",
      "fechaMatrimonio": "2026-11-14T11:00:00-04:00",
      "numeroProclama": 3,
      "publicaciones": [
        { "numero": 1, "fecha": "2026-10-25" },
        { "numero": 2, "fecha": "2026-11-01" },
        { "numero": 3, "fecha": "2026-11-08" }
      ]
    }
  ],
  "paginacion": {
    "pagina": 2,
    "porPagina": 2,
    "total": 3,
    "totalPaginas": 2
  }
}
```

---

## `GET /api/sedes/:sede/boletines`

Boletines parroquiales en PDF, del más reciente al más antiguo (por `periodo`). Paginado. La landing muestra solo el último: `?porPagina=1`.

**Parámetros de query:** `pagina`, `porPagina` y `anio` (entero, filtra por el año de `periodo`).

**Respuesta `200`** para `GET /api/sedes/senor-de-la-exaltacion/boletines?porPagina=1`:

```json
{
  "datos": [
    {
      "id": 1,
      "titulo": "Edición de octubre 2026",
      "periodo": "2026-10-01",
      "fechaPublicacion": "2026-10-03T10:00:00-04:00",
      "archivo": {
        "id": 7,
        "url": "https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/10/boletin-octubre-2026-8f3c2a1d.pdf",
        "nombreOriginal": "Boletín octubre 2026.pdf",
        "tipoMime": "application/pdf",
        "tamanoBytes": 2516582
      }
    }
  ],
  "paginacion": {
    "pagina": 1,
    "porPagina": 1,
    "total": 1,
    "totalPaginas": 1
  }
}
```

- `periodo` es siempre el primer día del mes del boletín. Hay como máximo un boletín por sede y mes.
- `archivo` es el **objeto archivo** (para lo que no es imagen): `{ id, url, nombreOriginal, tipoMime, tamanoBytes }`. El portal formatea el tamaño («PDF · 2,4 MB»).
- La URL del CDN de los ejemplos es ilustrativa: la real sale de `CDN_PUBLIC_URL`.

---

## `GET /api/sedes/:sede/videos`

Videos de YouTube de la sede (RF-05). Sin paginación. Orden: primero los destacados, luego por `orden`.

**Respuesta `200`:**

```json
{
  "datos": [
    {
      "id": 1,
      "titulo": "Un recorrido por nuestra parroquia",
      "descripcion": "Recorrido aéreo y del templo de la Parroquia Señor de la Exaltación.",
      "youtubeVideoId": "pX7aQm3kR2c",
      "urlVideo": "https://www.youtube.com/watch?v=pX7aQm3kR2c",
      "urlInsercion": "https://www.youtube-nocookie.com/embed/pX7aQm3kR2c",
      "urlMiniatura": "https://i.ytimg.com/vi/pX7aQm3kR2c/hqdefault.jpg",
      "duracionSegundos": 30,
      "destacado": true,
      "orden": 1,
      "fechaPublicacion": "2026-10-15"
    },
    {
      "id": 2,
      "titulo": "Fiesta patronal del Señor de la Exaltación 2026",
      "descripcion": null,
      "youtubeVideoId": "Lq2Wd9vNe4s",
      "urlVideo": "https://www.youtube.com/watch?v=Lq2Wd9vNe4s",
      "urlInsercion": "https://www.youtube-nocookie.com/embed/Lq2Wd9vNe4s",
      "urlMiniatura": "https://i.ytimg.com/vi/Lq2Wd9vNe4s/hqdefault.jpg",
      "duracionSegundos": 754,
      "destacado": false,
      "orden": 2,
      "fechaPublicacion": "2026-09-14"
    }
  ]
}
```

- Los `youtubeVideoId` de los ejemplos son **inventados**: los mocks deben reemplazarlos por videos reales si necesitan que se reproduzcan.
- `urlVideo`, `urlInsercion` y `urlMiniatura` los arma la API a partir de `youtubeVideoId`. El portal usa `urlInsercion` en un `<iframe>`.
- Los botones «Ver en YouTube» y «Suscribirse al canal» usan la red `YouTube` de [`GET /api/sedes/:sede`](#get-apisedessede).
- Hoy la landing reproduce un MP4 propio (`portada-final.mp4`) en esta sección. Mientras la parroquia no publique su video en YouTube, el portal puede reutilizar el `url_video` del bloque `hero_video` de la página `inicio`.

---

## `GET /api/sedes/:sede/paginas`

Páginas publicadas que van en el menú (`mostrarEnMenu = true`), ordenadas por `ordenMenu`. Sin paginación. Sirve para armar la navegación del portal.

**Respuesta `200`:**

```json
{
  "datos": [
    {
      "id": 2,
      "slug": "nosotros",
      "titulo": "Quiénes somos",
      "paginaPadreId": null,
      "ordenMenu": 1
    }
  ]
}
```

## `GET /api/sedes/:sede/paginas/:slug`

Una página publicada con sus bloques **visibles**, ordenados por `orden`. Cada bloque trae su `tipo` (el `codigo` de `tipo_bloque`) y su `contenido`, que cumple el esquema de ese tipo. Los formatos de cada tipo están en [contenido.md](contenido.md).

**Respuesta `200`** para `GET /api/sedes/senor-de-la-exaltacion/paginas/inicio` (sección `Portada`):

```json
{
  "datos": {
    "id": 1,
    "slug": "inicio",
    "titulo": "Inicio",
    "descripcionSeo": "Parroquia Señor de la Exaltación, Pasionistas en Obrajes, La Paz: horarios de misa, sacramentos, calendario parroquial y noticias.",
    "paginaPadre": null,
    "fechaActualizacion": "2026-11-02T16:20:00-04:00",
    "bloques": [
      {
        "id": 1,
        "tipo": "hero_video",
        "orden": 1,
        "contenido": {
          "etiqueta": "Parroquia Pasionista · Obrajes, La Paz",
          "titulo": "Señor de la Exaltación",
          "subtitulo": "Una comunidad que camina junto a Cristo crucificado y resucitado. Te esperamos en casa, con las puertas siempre abiertas.",
          "url_video": "/media/seed/portada-final.mp4",
          "url_poster": "/media/seed/exterior-parroquia.webp",
          "texto_video": "Recorrido aéreo · 0:30",
          "botones": [
            { "texto": "Ver horarios de misa", "enlace": "#horarios" },
            { "texto": "Conócenos", "enlace": "#nosotros" }
          ]
        }
      }
    ]
  }
}
```

**Respuesta `200`** para `GET /api/sedes/senor-de-la-exaltacion/paginas/nosotros` (sección `Nosotros`):

```json
{
  "datos": {
    "id": 2,
    "slug": "nosotros",
    "titulo": "Quiénes somos",
    "descripcionSeo": "Comunidad parroquial confiada a los Padres Pasionistas en Obrajes, La Paz.",
    "paginaPadre": null,
    "fechaActualizacion": "2026-11-02T16:20:00-04:00",
    "bloques": [
      {
        "id": 2,
        "tipo": "texto_imagen",
        "orden": 1,
        "contenido": {
          "etiqueta": "Quiénes somos",
          "titulo": "Una casa de oración en el corazón de Obrajes",
          "texto": "Somos una comunidad parroquial confiada a los Padres Pasionistas, que desde la memoria de la Pasión de Cristo acompaña a las familias de Obrajes en la fe, los sacramentos y el servicio a los más necesitados.",
          "url_imagen": "/media/seed/crucifijo.webp",
          "texto_alternativo": "Crucifijo en el interior de la Parroquia Señor de la Exaltación",
          "posicion_imagen": "izquierda"
        }
      },
      {
        "id": 3,
        "tipo": "cita",
        "orden": 2,
        "contenido": {
          "texto": "Que la Pasión de Jesucristo esté siempre grabada en nuestros corazones.",
          "autor": "Lema de la Congregación Pasionista"
        }
      },
      {
        "id": 4,
        "tipo": "tarjetas",
        "orden": 3,
        "contenido": {
          "titulo": "Nuestro párroco",
          "items": [
            {
              "titulo": "P. Gregorio, C.P.",
              "texto": "Párroco",
              "url_imagen": "/media/seed/padre_gregorio.jpg",
              "texto_alternativo": "P. Gregorio, C.P., párroco"
            }
          ]
        }
      },
      {
        "id": 5,
        "tipo": "tarjetas",
        "orden": 4,
        "contenido": {
          "titulo": "Congregación",
          "items": [
            {
              "etiqueta": "Congregación de la Pasión",
              "titulo": "Pasionistas · C.P.",
              "texto": "Fundada por San Pablo de la Cruz"
            }
          ]
        }
      }
    ]
  }
}
```

- `paginaPadre`: `{ "id", "slug", "titulo" }` o `null`.
- Las claves dentro de `contenido` van en snake_case porque se devuelven tal como se guardan y se validan contra `tipo_bloque.esquema_validacion` (ver [convenciones.md](convenciones.md#2-nombres-y-tipos-de-datos)).
- El portal debe ignorar un bloque de `tipo` desconocido en vez de fallar. Así se pueden agregar tipos nuevos sin romperlo.

**Errores:** `404 NO_ENCONTRADO` si el slug no existe en la sede o la página no está en estado `PUBLICADO`.
