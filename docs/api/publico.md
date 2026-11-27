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
| `Portada` (título, video, botones y accesos rápidos)     | [`GET /api/sedes/:sede/paginas/inicio`](#get-apisedessedepaginasslug)                                                                              |
| `Nosotros` (texto, cita, párroco)                        | [`GET /api/sedes/:sede/paginas/nosotros`](#get-apisedessedepaginasslug)                                                                            |
| `Horarios`                                               | [`GET /api/sedes/:sede/horarios`](#get-apisedessedehorarios) + textos de `configuracion` en [`GET /api/sedes/:sede`](#get-apisedessede)            |
| `Sacramentos`                                            | [`GET /api/sedes/:sede/servicios`](#get-apisedessedeservicios) y [detalle](#get-apisedessedeserviciosslug)                                         |
| `Agenda`: próximos eventos                               | [`GET /api/sedes/:sede/eventos`](#get-apisedessedeeventos)                                                                                         |
| `Agenda`: avisos parroquiales                            | [`GET /api/sedes/:sede/publicaciones?tipo=AVISO`](#get-apisedessedepublicaciones)                                                                  |
| `Agenda`: boletín parroquial                             | [`GET /api/sedes/:sede/boletines?porPagina=1`](#get-apisedessedeboletines)                                                                         |
| `VidaParroquial` (noticias y notas de prensa)            | [`GET /api/sedes/:sede/publicaciones?tipo=NOTICIA,NOTA_DE_PRENSA`](#get-apisedessedepublicaciones) y [detalle](#get-apisedessedepublicacionesslug) |
| `Proclamas`                                              | [`GET /api/sedes/:sede/proclamas`](#get-apisedessedeproclamas), [historial](#get-apisedessedeproclamashistorial) y [detalle](#get-apisedessedeproclamasid) |
| `VideoInstitucional`                                     | [`GET /api/sedes/:sede/videos`](#get-apisedessedevideos); mientras no haya videos, el bloque `hero_video` de `inicio`                              |
| `GruposPastorales`                                       | [`GET /api/sedes/:sede/grupos-pastorales`](#get-apisedessedegrupos-pastorales)                                                                     |
| `Comunidades`                                            | [`GET /api/sedes`](#get-apisedes)                                                                                                                  |
| `Contacto` y `PiePagina`                                 | [`GET /api/sedes/:sede`](#get-apisedessede)                                                                                                        |

No vienen de la API, porque son parte del diseño: las anclas de navegación (`#horarios`, `#agenda`…), los títulos y descripciones fijos de cada sección (ej. «Sacramentos y catequesis», «Hay un lugar para ti…») y el botón «Conoce nuestra historia», que en la landing no tiene destino.

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
        "alto": 1057,
        "variantes": []
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

- `tipo.codigo`: `PARROQUIA`, `CAPILLA`, `COMUNIDAD` o `COMUNIDAD_PASIONISTA`.
- `imagenPortada` sale de `sede.url_imagen_portada`. Si esa URL coincide con un archivo de `archivo_multimedia`, se completan `id`, `ancho`, `alto` y `textoAlternativo`; si no, esos campos van en `null`.
- `enlaceComoLlegar` sale de `configuracion.enlace_como_llegar`.

---

## `GET /api/sedes/arbol`

Sedes activas ordenadas jerárquicamente (`Parroquia → Capilla → Comunidad`) y con las comunidades pasionistas como entidad aparte. Dentro de cada nivel se ordenan por `orden` ascendente y `nombre` ascendente.

**Respuesta `200`:**

```json
{
  "datos": {
    "parroquias": [
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
          "alto": 1057,
          "variantes": []
        },
        "enlaceComoLlegar": "https://www.google.com/maps/dir/?api=1&destination=-16.5267952%2C-68.1082157",
        "capillas": [
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
            "enlaceComoLlegar": null,
            "comunidades": []
          }
        ],
        "comunidades": []
      }
    ],
    "comunidadesPasionistas": []
  }
}
```

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
      "alto": 1057,
      "variantes": []
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
      "textoBarraSuperior": "Misas: lunes a viernes 7:00 y 19:00 · sábado 7:00 y 18:00 · domingo 8:00, 10:00, 12:00 y 19:00",
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
- `redesSociales`: solo las redes que la sede tiene registradas, ordenadas por el `id` de la red. `icono` es el **identificador de la red** (`facebook`, `instagram`, `youtube`, `tiktok`, `chat`), **no** un nombre de lucide: el portal lo traduce a su ícono de marca (hoy `react-icons/fa`). El enlace de YouTube del seed es el canal de la Arquidiócesis de La Paz, no uno propio de la parroquia.
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
            { "horaInicio": "15:00", "horaFin": "19:00", "descripcion": null }
          ]
        }
      ]
    }
  ],
  "paginacion": {
    "pagina": 1,
    "porPagina": 10,
    "total": 4,
    "totalPaginas": 1
  }
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

Servicios y sacramentos visibles, ordenados por `orden`. Paginado (`porPagina` hasta 100; para obtener la lista completa enviar `porPagina=100`). Acepta `pagina`, `porPagina`, `buscar` y `orden` (`orden`, `-orden`, `nombre`, `-nombre`; defecto `orden`). No incluye `contenido` (está en el detalle).

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
  ],
  "paginacion": {
    "pagina": 1,
    "porPagina": 10,
    "total": 6,
    "totalPaginas": 1
  }
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

Grupos y pastorales visibles, ordenados por `orden`.

**Respuesta `200`:**

```json
{
  "datos": [
    {
      "id": 1,
      "slug": "monaguillos",
      "nombre": "Monaguillos",
      "descripcion": null,
      "horarioReunion": "Sábados · 10:00",
      "responsable": null,
      "whatsapp": null,
      "correo": null,
      "icono": "star",
      "imagen": null,
      "tieneDetalle": false,
      "orden": 1
    },
    {
      "id": 2,
      "slug": "coro-parroquial",
      "nombre": "Coro parroquial",
      "descripcion": null,
      "horarioReunion": "Jueves · 19:00",
      "responsable": null,
      "whatsapp": null,
      "correo": null,
      "icono": "music-2",
      "imagen": null,
      "tieneDetalle": false,
      "orden": 2
    },
    {
      "id": 3,
      "slug": "catequistas",
      "nombre": "Catequistas",
      "descripcion": null,
      "horarioReunion": "Formación mensual",
      "responsable": null,
      "whatsapp": null,
      "correo": null,
      "icono": "book-open",
      "imagen": null,
      "tieneDetalle": false,
      "orden": 3
    },
    {
      "id": 4,
      "slug": "pastoral-juvenil",
      "nombre": "Pastoral Juvenil",
      "descripcion": null,
      "horarioReunion": "Viernes · 18:30",
      "responsable": null,
      "whatsapp": null,
      "correo": null,
      "icono": "users",
      "imagen": null,
      "tieneDetalle": false,
      "orden": 4
    },
    {
      "id": 5,
      "slug": "legion-de-maria",
      "nombre": "Legión de María",
      "descripcion": null,
      "horarioReunion": "Martes · 16:00",
      "responsable": null,
      "whatsapp": null,
      "correo": null,
      "icono": "cross",
      "imagen": null,
      "tieneDetalle": false,
      "orden": 5
    },
    {
      "id": 6,
      "slug": "pastoral-social",
      "nombre": "Pastoral social",
      "descripcion": null,
      "horarioReunion": "Cáritas parroquial",
      "responsable": null,
      "whatsapp": null,
      "correo": null,
      "icono": "heart-handshake",
      "imagen": null,
      "tieneDetalle": false,
      "orden": 6
    }
  ],
  "paginacion": {
    "pagina": 1,
    "porPagina": 10,
    "total": 6,
    "totalPaginas": 1
  }
}
```

`horarioReunion` es texto libre (ej. «Formación mensual»), no un horario estructurado.

## `GET /api/sedes/:sede/grupos-pastorales/:slug`

Detalle completo de un grupo pastoral visible, incluyendo galería hidratada y contenido BlockNote.

**Errores:** `404 NO_ENCONTRADO` si el slug no existe en la sede o el grupo no está visible.

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

**Respuesta `200`** para `GET /api/sedes/senor-de-la-exaltacion/eventos?porPagina=4` (consultado el 12/11/2026; son los eventos de la landing, que el seed fecha a 6, 7, 8 y 13 días de hoy):

```json
{
  "datos": [
    {
      "id": 1,
      "titulo": "Adoración eucarística comunitaria",
      "descripcion": null,
      "lugar": "Templo parroquial",
      "fechaInicio": "2026-11-18T19:00:00-04:00",
      "fechaFin": null,
      "todoElDia": false,
      "categoria": {
        "id": 1,
        "nombre": "Liturgia",
        "colorHex": "#E2AD11"
      },
      "imagen": null,
      "tieneDetalle": false
    },
    {
      "id": 2,
      "titulo": "Misa de sanación",
      "descripcion": "Horarios: 8:00 – 10:00 – 12:00",
      "lugar": "Templo parroquial",
      "fechaInicio": "2026-11-19T08:00:00-04:00",
      "fechaFin": null,
      "todoElDia": false,
      "categoria": {
        "id": 2,
        "nombre": "Solemnidad",
        "colorHex": "#9E1B22"
      },
      "imagen": null,
      "tieneDetalle": true
    },
    {
      "id": 3,
      "titulo": "Misa por los difuntos de la comunidad",
      "descripcion": null,
      "lugar": "Templo parroquial",
      "fechaInicio": "2026-11-20T19:00:00-04:00",
      "fechaFin": null,
      "todoElDia": false,
      "categoria": {
        "id": 1,
        "nombre": "Liturgia",
        "colorHex": "#E2AD11"
      },
      "imagen": null,
      "tieneDetalle": false
    },
    {
      "id": 4,
      "titulo": "Charla pre-bautismal para padres y padrinos",
      "descripcion": null,
      "lugar": "Salón parroquial",
      "fechaInicio": "2026-11-25T09:30:00-04:00",
      "fechaFin": null,
      "todoElDia": false,
      "categoria": {
        "id": 3,
        "nombre": "Catequesis",
        "colorHex": "#B5532F"
      },
      "imagen": null,
      "tieneDetalle": false
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
- `tieneDetalle`: indica si el evento tiene información adicional cargada en su página de detalle (la lista no envía `detalle` para mantenerse liviana).
- La tarjeta de la landing muestra día y mes (`18 NOV`), la hora y el lugar. El portal los arma con `fechaInicio`. Cuando hay varias horas (ej. «8:00 – 10:00 – 12:00»), van en `descripcion`.
- **Vista de un solo día**: enviando `desde=YYYY-MM-DD&hasta=YYYY-MM-DD` con la misma fecha se obtienen todos los eventos publicados que ocurren o se cruzan con ese día (siempre desde hoy en adelante).

## `GET /api/sedes/:sede/eventos/:id`

Detalle completo de un evento publicado de la sede (RF-09). Si el evento ya pasó pero sigue en estado `PUBLICADO`, responde `200` para que los enlaces compartidos sigan funcionando. Un evento en `BORRADOR`, `ARCHIVADO`, inexistente o de otra sede responde `404 NO_ENCONTRADO`.

**Respuesta `200`:**

```json
{
  "datos": {
    "id": 2,
    "titulo": "Misa de sanación",
    "descripcion": "Horarios: 8:00 – 10:00 – 12:00",
    "lugar": "Templo parroquial",
    "fechaInicio": "2026-11-19T08:00:00-04:00",
    "fechaFin": null,
    "todoElDia": false,
    "categoria": {
      "id": 2,
      "nombre": "Solemnidad",
      "colorHex": "#9E1B22"
    },
    "imagen": null,
    "tieneDetalle": true,
    "detalle": {
      "contenido": {
        "formato": "blocknote",
        "version": 1,
        "bloques": []
      },
      "direccion": "Av. Héctor Ormachea N.º 167, Obrajes, La Paz",
      "enlaceMapa": "https://www.google.com/maps/search/?api=1&query=-16.5267952%2C-68.1082157",
      "programa": [
        { "hora": "08:00", "actividad": "Primera misa de sanación (ejemplo)" }
      ],
      "responsable": {
        "nombre": "Equipo de Liturgia (ejemplo)",
        "rol": "Coordinación pastoral",
        "telefono": "(2) 278 4937",
        "correo": null
      },
      "enlaces": []
    }
  }
}
```

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
      "slug": "encuentro-pastoral-familiar-duelo",
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
        "alto": 1383,
        "variantes": []
      },
      "urlExterna": "https://www.facebook.com/photo.php?fbid=1568791201958754&set=pb.100064836665037.-2207520000&type=3",
      "abrirEnlaceDirecto": false,
      "destacada": false,
      "fechaPublicacion": "2026-10-30T12:00:00-04:00",
      "fechaExpiracion": null
    },
    {
      "id": 4,
      "tipo": { "codigo": "NOTICIA", "nombre": "Noticia" },
      "titulo": "Primeras comuniones: 42 niños recibieron a Jesús",
      "slug": "primeras-comuniones-42-ninos",
      "resumen": "Una jornada de fiesta para toda la comunidad, acompañada por catequistas y familias.",
      "categoria": { "id": 1, "nombre": "Sacramentos", "slug": "sacramentos" },
      "imagenPortada": {
        "id": 2,
        "url": "/media/seed/crucifijo.webp",
        "textoAlternativo": "Crucifijo en el interior del templo parroquial",
        "ancho": 1888,
        "alto": 1059,
        "variantes": []
      },
      "urlExterna": null,
      "abrirEnlaceDirecto": false,
      "destacada": false,
      "fechaPublicacion": "2026-10-18T12:00:00-04:00",
      "fechaExpiracion": null
    },
    {
      "id": 5,
      "tipo": { "codigo": "NOTICIA", "nombre": "Noticia" },
      "titulo": "Encuentro de monaguillos de la Vicaría Sur",
      "slug": "encuentro-monaguillos-vicaria-sur",
      "resumen": "Más de 60 monaguillos compartieron una jornada de formación, juego y oración.",
      "categoria": { "id": 2, "nombre": "Comunidad", "slug": "comunidad" },
      "imagenPortada": {
        "id": 1,
        "url": "/media/seed/exterior-parroquia.webp",
        "textoAlternativo": "Vista exterior de la Parroquia Señor de la Exaltación",
        "ancho": 1878,
        "alto": 1057,
        "variantes": []
      },
      "urlExterna": null,
      "abrirEnlaceDirecto": false,
      "destacada": false,
      "fechaPublicacion": "2026-10-11T12:00:00-04:00",
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

**Respuesta `200`** para `GET /api/sedes/senor-de-la-exaltacion/publicaciones?tipo=AVISO&porPagina=3` (tarjeta «Avisos parroquiales», consultado el 12/11/2026; el seed los fecha hace 1, 3 y 5 días):

```json
{
  "datos": [
    {
      "id": 1,
      "tipo": { "codigo": "AVISO", "nombre": "Aviso" },
      "titulo": "Inscripciones abiertas para la catequesis de Confirmación 2027.",
      "slug": "inscripciones-confirmacion-2027",
      "resumen": null,
      "categoria": null,
      "imagenPortada": null,
      "urlExterna": null,
      "abrirEnlaceDirecto": false,
      "destacada": false,
      "fechaPublicacion": "2026-11-11T09:00:00-04:00",
      "fechaExpiracion": null
    },
    {
      "id": 2,
      "tipo": { "codigo": "AVISO", "nombre": "Aviso" },
      "titulo": "El próximo lunes la secretaría atenderá solo por la mañana.",
      "slug": "secretaria-atencion-lunes",
      "resumen": null,
      "categoria": null,
      "imagenPortada": null,
      "urlExterna": null,
      "abrirEnlaceDirecto": false,
      "destacada": false,
      "fechaPublicacion": "2026-11-09T09:00:00-04:00",
      "fechaExpiracion": null
    },
    {
      "id": 3,
      "tipo": { "codigo": "AVISO", "nombre": "Aviso" },
      "titulo": "Recibimos donaciones de víveres para la Pastoral Social hasta fin de mes.",
      "slug": "donaciones-viveres-pastoral-social",
      "resumen": null,
      "categoria": null,
      "imagenPortada": null,
      "urlExterna": null,
      "abrirEnlaceDirecto": false,
      "destacada": false,
      "fechaPublicacion": "2026-11-07T09:00:00-04:00",
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

- **Avisos**: el texto del aviso es el `titulo` (y también el único párrafo de su `contenido`). No tienen `resumen` ni imagen.
- **Noticias**: la tarjeta muestra el `resumen`.
- **«Leer nota»**: por defecto abre el detalle de la publicación por `slug` (y si tiene `urlExterna`, dentro del detalle se muestra el botón «Ver publicación original»). Solo si `abrirEnlaceDirecto` es `true` y `urlExterna` tiene valor, «Leer nota» abre el enlace externo en otra pestaña (ej. una publicación que es solo un post de Facebook).

## `GET /api/sedes/:sede/publicaciones/:slug`

Detalle de una publicación publicada y vigente, con su `contenido` en formato BlockNote (ver [contenido.md](contenido.md)).

**Respuesta `200`** para `GET /api/sedes/senor-de-la-exaltacion/publicaciones/primeras-comuniones-42-ninos`:

```json
{
  "datos": {
    "id": 4,
    "tipo": { "codigo": "NOTICIA", "nombre": "Noticia" },
    "titulo": "Primeras comuniones: 42 niños recibieron a Jesús",
    "slug": "primeras-comuniones-42-ninos",
    "resumen": "Una jornada de fiesta para toda la comunidad, acompañada por catequistas y familias.",
    "categoria": { "id": 1, "nombre": "Sacramentos", "slug": "sacramentos" },
    "imagenPortada": {
      "id": 2,
      "url": "/media/seed/crucifijo.webp",
      "textoAlternativo": "Crucifijo en el interior del templo parroquial",
      "ancho": 1888,
      "alto": 1059,
      "variantes": []
    },
    "urlExterna": null,
    "abrirEnlaceDirecto": false,
    "destacada": false,
    "fechaPublicacion": "2026-10-18T12:00:00-04:00",
    "fechaExpiracion": null,
    "contenido": {
      "formato": "blocknote",
      "version": 1,
      "bloques": [
        {
          "id": "primeras-comuniones-42-ninos-p1",
          "type": "paragraph",
          "props": {
            "textColor": "default",
            "backgroundColor": "default",
            "textAlignment": "left"
          },
          "content": [
            {
              "type": "text",
              "text": "Una jornada de fiesta para toda la comunidad, acompañada por catequistas y familias.",
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

El seed solo tiene un párrafo por publicación porque la landing no tiene textos más largos. En [contenido.md](contenido.md#ejemplo-completo) hay un documento con todos los tipos de bloque.

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
      ],
      "tieneDetalle": false,
      "imagen": null
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
      ],
      "tieneDetalle": false,
      "imagen": null
    },
    {
      "id": 3,
      "contrayente1": "Luis F. Gutiérrez",
      "contrayente2": "Andrea Mamani C.",
      "fechaMatrimonio": "2026-12-05T12:00:00-04:00",
      "numeroProclama": 1,
      "publicaciones": [{ "numero": 1, "fecha": "2026-11-08" }],
      "tieneDetalle": false,
      "imagen": null
    }
  ],
  "paginacion": {
    "pagina": 1,
    "porPagina": 10,
    "total": 3,
    "totalPaginas": 1
  }
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
      ],
      "tieneDetalle": false,
      "imagen": null
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

## `GET /api/sedes/:sede/proclamas/:id`

Detalle de una proclama visible (al menos una publicación cuya fecha ya llegó). Si no existe, pertenece a otra sede o todavía no tiene publicaciones alcanzadas, responde `404 NO_ENCONTRADO`.

**Respuesta `200`:**

```json
{
  "datos": {
    "id": 1,
    "contrayente1": "Juan Carlos M. Q.",
    "contrayente2": "María Fernanda R. V.",
    "fechaMatrimonio": "2026-11-14T11:00:00-04:00",
    "numeroProclama": 3,
    "publicaciones": [
      { "numero": 1, "fecha": "2026-10-25" },
      { "numero": 2, "fecha": "2026-11-01" },
      { "numero": 3, "fecha": "2026-11-08" }
    ],
    "tieneDetalle": true,
    "imagen": null,
    "aceptaObservaciones": true,
    "galeria": [
      {
        "id": 12,
        "url": "https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/11/foto.webp",
        "textoAlternativo": "Foto de los novios",
        "ancho": 1200,
        "alto": 800,
        "variantes": [
          { "ancho": 480, "url": "https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/11/foto-480w.webp" },
          { "ancho": 960, "url": "https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/11/foto-960w.webp" }
        ],
        "tipoMime": "image/webp"
      }
    ],
    "detalle": {
      "contenido": null,
      "galeria": [12],
      "lugar": {
        "templo": "Capilla San Pablo de la Cruz",
        "direccion": "Av. Costanera 123, Obrajes",
        "enlaceMapa": "https://maps.app.goo.gl/ejemplo"
      }
    }
  }
}
```

- `detalle` es `null` si no se cargó información adicional. Si `detalle.lugar` es `null`, la boda se celebra en la propia parroquia.
- `aceptaObservaciones` es `true` desde la primera publicación hasta la fecha y hora del matrimonio.

## `GET /api/sedes/:sede/proclamas/:id/observaciones/verificacion`

Emite un token HMAC de verificación de corto plazo para el formulario de observaciones (`Cache-Control: no-store`).

**Respuesta `200`:**

```json
{
  "datos": {
    "token": "1.1764200000000.firmahmac"
  }
}
```

- Proclama inexistente o no visible → `404 NO_ENCONTRADO`.

## `POST /api/sedes/:sede/proclamas/:id/observaciones`

Envía una observación confidencial al párroco sobre una proclama (sin sesión, con protección CSRF, verificación temporal y límite de 5 peticiones por hora por IP).

**Cuerpo:**

```json
{
  "nombreCompleto": "María Elena Quispe",
  "correo": "maria@ejemplo.com",
  "telefono": "+591 71234567",
  "mensaje": "Deseo comunicar una observación sobre esta proclama.",
  "sitioWeb": "",
  "verificacion": "1.1764200000000.firmahmac"
}
```

- `nombreCompleto` es opcional (`null` o vacío = observación anónima).
- Es obligatorio al menos uno entre `correo` o `telefono` (si faltan ambos, `400 VALIDACION` en `contacto`).
- `verificacion` es obligatorio: si falta, es inválido, corresponde a otra proclama, tiene más de 2 horas o se envía antes de 3 segundos desde su emisión, responde `400 VALIDACION` en el campo `verificacion`.
- Responde `201 { "datos": { "recibido": true } }` sin devolver los datos enviados y sin caché (`Cache-Control: no-store`).
- Proclama inexistente o no visible → `404 NO_ENCONTRADO`; proclama cuya boda ya pasó → `409 CONFLICTO`; límite superado → `429 DEMASIADAS_SOLICITUDES`.

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
        "url": "https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/10/8f3c2a1d-5b7e-4c90-a1f4-6d2e9b0c7a35.pdf",
        "nombreOriginal": "Boletín octubre 2026.pdf",
        "tipoMime": "application/pdf",
        "tamanoBytes": 2516582
      },
      "portada": null
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
- `portada` es el **objeto imagen estándar** (`{ id, url, textoAlternativo, ancho, alto, variantes }`) de la miniatura de la primera página, o `null` si no tiene portada.
- La URL del CDN de los ejemplos es ilustrativa: la real sale de `CDN_PUBLIC_URL`.
- El seed **no** tiene boletines, porque no hay un PDF real en el repositorio. Con el seed, este endpoint responde `"datos": []` y el portal oculta la tarjeta del boletín.

---

## `GET /api/sedes/:sede/videos`

Videos de YouTube de la sede (RF-05). Paginado (`porPagina` hasta 100). Acepta `pagina`, `porPagina`, `destacado` (`true`/`false`), `buscar` y `orden` (`orden`, `-orden`, `fechaPublicacion`, `-fechaPublicacion`, `titulo`, `-titulo`; defecto `orden`). Orden predeterminado: primero los destacados, luego por `orden`.

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
  ],
  "paginacion": {
    "pagina": 1,
    "porPagina": 10,
    "total": 2,
    "totalPaginas": 1
  }
}
```

- Los `youtubeVideoId` de los ejemplos son **inventados**: los mocks deben reemplazarlos por videos reales si necesitan que se reproduzcan. El seed **no** tiene videos (la parroquia aún no tiene un video propio en YouTube), así que con el seed este endpoint responde `"datos": []`.
- `urlVideo`, `urlInsercion` y `urlMiniatura` los arma la API a partir de `youtubeVideoId`. El portal usa `urlInsercion` en un `<iframe>`.
- Los botones «Ver en YouTube» y «Suscribirse al canal» usan la red `YouTube` de [`GET /api/sedes/:sede`](#get-apisedessede).
- Hoy la landing reproduce un MP4 propio (`portada-final.mp4`) en esta sección. Mientras la lista esté vacía, el portal usa el `url_video` y el `detalle_video` del bloque `hero_video` de la página `inicio`, con el póster `altar.webp`.

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

**Respuesta `200`** para `GET /api/sedes/senor-de-la-exaltacion/paginas/inicio` (sección `Portada` y sus accesos rápidos):

```json
{
  "datos": {
    "id": 1,
    "slug": "inicio",
    "titulo": "Inicio",
    "descripcionSeo": null,
    "paginaPadre": null,
    "fechaActualizacion": null,
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
          "texto_video": "Video institucional",
          "detalle_video": "Recorrido aéreo · 0:27",
          "botones": [
            { "texto": "Ver horarios de misa", "enlace": "#horarios" },
            { "texto": "Conócenos", "enlace": "#nosotros" }
          ]
        }
      },
      {
        "id": 2,
        "tipo": "tarjetas",
        "orden": 2,
        "contenido": {
          "items": [
            {
              "titulo": "Noticias",
              "subtitulo": "Lo último de la parroquia",
              "icono": "newspaper",
              "enlace": "/noticias"
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
    "descripcionSeo": null,
    "paginaPadre": null,
    "fechaActualizacion": null,
    "bloques": [
      {
        "id": 3,
        "tipo": "texto_imagen",
        "orden": 1,
        "contenido": {
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
      },
      {
        "id": 4,
        "tipo": "cita",
        "orden": 2,
        "contenido": {
          "texto": "Que la Pasión de Jesucristo esté siempre grabada en nuestros corazones.",
          "autor": "Lema de la Congregación Pasionista"
        }
      },
      {
        "id": 5,
        "tipo": "tarjetas",
        "orden": 3,
        "contenido": {
          "items": [
            {
              "titulo": "P. Gregorio, C.P.",
              "subtitulo": "Párroco",
              "url_imagen": "/media/seed/padre_gregorio.jpg"
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

---

## Búsqueda

### `GET /api/sedes/:sede/buscar`

Búsqueda de texto completo en español (sin tildes ni distinción de mayúsculas, con *stemming*) sobre todo el contenido **público y vigente** de la sede: noticias, notas de prensa, eventos publicados, servicios/sacramentos visibles, grupos pastorales visibles, boletines publicados y páginas publicadas.

**Nunca** indexa proclamas matrimoniales, observaciones confidenciales, usuarios, borradores ni avisos internos. Límite por IP: 30 búsquedas por minuto (`429 DEMASIADAS_SOLICITUDES`). Respuesta cacheada en Redis e invalidada automáticamente al publicar o editar cualquiera de los recursos indexados.

**Parámetros de query:**

| Parámetro | Regla |
|---|---|
| `q` | Obligatorio; 2–100 caracteres tras `trim`, sin caracteres de control. Admite la sintaxis de `websearch_to_tsquery`: `"frase exacta"`, `-excluir`, `palabra OR otra`. |
| `tipo` | Opcional; lista separada por comas de `noticia`, `evento`, `sacramento`, `grupo`, `boletin`, `pagina`. |
| `desde`, `hasta` | Opcionales; fechas `AAAA-MM-DD` (zona horaria `America/La_Paz`), con `hasta >= desde`. |
| `orden` | `relevancia` (predeterminado), `reciente` o `antiguo`. |
| `pagina`, `porPagina` | Paginación estándar; `porPagina` predeterminado `10`, máximo `30`. |

**Respuesta `200`** para `GET /api/sedes/senor-de-la-exaltacion/buscar?q=fiesta+patronal`:

```json
{
  "datos": [
    {
      "tipo": "noticia",
      "id": 12,
      "titulo": "Fiesta patronal 2026",
      "fragmento": [
        { "texto": "… la ", "resaltado": false },
        { "texto": "fiesta", "resaltado": true },
        { "texto": " del Señor …", "resaltado": false }
      ],
      "url": "/noticias/fiesta-patronal-2026",
      "fecha": "2026-09-14T10:00:00-04:00",
      "imagen": {
        "id": 31,
        "url": "https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/09/portada.webp",
        "textoAlternativo": "Procesión patronal",
        "ancho": 1600,
        "alto": 1067,
        "variantes": []
      }
    }
  ],
  "paginacion": {
    "pagina": 1,
    "porPagina": 10,
    "total": 23,
    "totalPaginas": 3
  },
  "totalesPorTipo": {
    "noticia": 15,
    "evento": 4,
    "sacramento": 1,
    "grupo": 2,
    "boletin": 1,
    "pagina": 0
  }
}
```

- `fragmento`: lista de segmentos `{ texto, resaltado }` (nunca HTML).
- `totalesPorTipo`: se calcula con los mismos filtros (`q`, `desde`, `hasta`) salvo `tipo`.
- `url`: ruta del portal (`/noticias/:slug`, `/calendario/:id`, `/sacramentos/:slug`, `/comunidad/grupos/:slug`, `/boletines/AAAA-MM`, `/paginas/:slug`). `fecha` puede ser `null` (sacramentos, grupos, páginas).
- **Errores:** `400 VALIDACION` en `query.<campo>`; `429 DEMASIADAS_SOLICITUDES`; `404 NO_ENCONTRADO` si la sede no existe.
- **Escalabilidad:** con índices GIN por expresión en cada tabla, la búsqueda escala adecuadamente a decenas de miles de documentos; si el volumen crece mucho más en el futuro, el siguiente paso es una tabla única de documentos mantenida por triggers.
