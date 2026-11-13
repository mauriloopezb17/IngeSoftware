# Autenticación, roles y permisos

El panel CMS (`frontend/src/admin/`) se autentica con un **JWT guardado en una cookie httpOnly** (RF-11, RNF-02). El portal público no usa sesión. Todos los endpoints de `/api/admin/...` exigen sesión; los de `/api/auth/...` son los que la abren, la consultan y la cierran.

## 1. Sesión

### Cookie

| Atributo   | Valor                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| Nombre     | `parroquia_sesion`                                                                                      |
| Contenido  | JWT firmado con `HS256` y `JWT_SECRET`                                                                  |
| `HttpOnly` | Sí. El JavaScript del frontend nunca lee el token.                                                      |
| `SameSite` | `Lax`                                                                                                   |
| `Secure`   | Sí en producción (`NODE_ENV=production`); no en desarrollo, que usa `http://localhost`.                 |
| `Path`     | `/api`                                                                                                  |
| Expiración | `JWT_EXPIRA_EN` (por defecto `8h`): el mismo valor para el `exp` del token y el `Max-Age` de la cookie. |

- La sesión **no se renueva** sola: al vencer, la siguiente petición responde `401 NO_AUTENTICADO` y el panel vuelve al login.
- El frontend debe enviar `credentials: 'include'`, cosa que `clienteHttp.js` ya hace.
- En desarrollo, el panel (`http://localhost:5173`) y la API (`http://localhost:3000`) son del mismo sitio para el navegador (`localhost`), así que la cookie `Lax` viaja sin problema. El origen tiene que coincidir con `CORS_ORIGEN`.

### Contenido del token

```json
{
  "sub": "3",
  "rol": "SECRETARIA",
  "sede": 1,
  "iat": 1794486665,
  "exp": 1794515465
}
```

`sub` es el id del usuario. En **cada** petición, la API valida la firma y el vencimiento, y además vuelve a leer al usuario de la base de datos. Así, desactivarlo o cambiarle el rol o la sede tiene efecto inmediato, sin esperar a que venza el token. Si el usuario ya no existe o está inactivo, la respuesta es `401 NO_AUTENTICADO` y la cookie se borra.

### Protección contra CSRF

- `SameSite=Lax`: el navegador no envía la cookie en `POST`, `PATCH` ni `DELETE` iniciados desde otro sitio.
- Además, en los métodos que modifican datos (`POST`, `PATCH` y `DELETE`) la API responde `403 SIN_PERMISO` en estos casos:
  - la cabecera `Origin` viene y no coincide con `CORS_ORIGEN` (incluido el valor `null`);
  - la cabecera `Sec-Fetch-Site` vale `cross-site`, **aunque no venga `Origin`**. El navegador la envía solo y la página no puede falsearla.
- Una petición sin `Origin` ni `Sec-Fetch-Site: cross-site` se deja pasar: la envían herramientas que no son un navegador (`curl`, otros servidores), que no llevan la cookie de otro usuario.
- Los métodos de lectura (`GET`) no se comprueban.

## 2. Endpoints

### `POST /api/auth/login`

Abre la sesión. Tiene límite de intentos (ver [sección 4](#4-límite-de-intentos)).

**Cuerpo:**

```json
{
  "correo": "secretaria@parroquia.test",
  "contrasena": "Parroquia2026!"
}
```

| Campo        | Regla                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------- |
| `correo`     | Obligatorio, formato de correo, hasta 120 caracteres. Se compara sin distinguir mayúsculas. |
| `contrasena` | Obligatoria, de 1 a 200 caracteres.                                                         |

**Respuesta `200`**, con la cabecera `Set-Cookie: parroquia_sesion=<jwt>; Path=/api; HttpOnly; SameSite=Lax; Max-Age=28800`:

```json
{
  "datos": {
    "id": 3,
    "nombreCompleto": "Secretaría (desarrollo)",
    "correo": "secretaria@parroquia.test",
    "rol": { "codigo": "SECRETARIA", "nombre": "Secretaría" },
    "sede": {
      "id": 1,
      "nombre": "Parroquia Señor de la Exaltación",
      "slug": "senor-de-la-exaltacion"
    },
    "permisos": [
      "multimedia.subir",
      "multimedia.eliminar",
      "avisos.gestionar",
      "eventos.gestionar",
      "horarios.gestionar",
      "servicios.gestionar",
      "grupos.gestionar",
      "videos.gestionar",
      "sede.editar",
      "proclamas.gestionar",
      "boletines.gestionar",
      "paginas.gestionar"
    ],
    "fechaUltimoAcceso": "2026-11-12T08:31:05-04:00",
    "sesionExpiraEn": "2026-11-12T16:31:05-04:00"
  }
}
```

- `sede` es `null` para un Administrador sin sede asignada (trabaja en todas las sedes). Los demás roles siempre tienen sede. `GET /api/auth/yo` devuelve lo mismo.
- `fechaUltimoAcceso` se actualiza con cada login exitoso.
- `sesionExpiraEn` sirve para que el panel avise antes de que venza la sesión.
- `permisos` es la lista de la [matriz de permisos](#7-matriz-de-permisos) que corresponde al rol. El panel la usa para mostrar u ocultar menús y botones; quien decide de verdad es la API.

**Errores:**

| Código                       | Cuándo                                                                                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `400 VALIDACION`             | Falta el correo o la contraseña, o el correo no tiene formato válido.                                                                                                   |
| `401 NO_AUTENTICADO`         | Correo inexistente, contraseña incorrecta o usuario inactivo. El mensaje es siempre el mismo, para no revelar qué correos existen: `"Correo o contraseña incorrectos."` |
| `429 DEMASIADAS_SOLICITUDES` | Se superó el límite de intentos. Incluye la cabecera `Retry-After`.                                                                                                     |

```json
{
  "error": {
    "codigo": "NO_AUTENTICADO",
    "mensaje": "Correo o contraseña incorrectos.",
    "detalles": []
  }
}
```

### `POST /api/auth/logout`

Cierra la sesión: borra la cookie (`Max-Age=0`). Es idempotente y funciona aunque no haya sesión.

**Respuesta `204`**, sin cuerpo.

### `GET /api/auth/yo`

Devuelve el usuario de la sesión actual. El panel lo llama al cargar, para saber si hay sesión y con qué rol.

**Respuesta `200`:** el mismo objeto que devuelve el login.

**Errores:** `401 NO_AUTENTICADO` si no hay cookie, si el token es inválido o venció, o si el usuario fue desactivado.

```json
{
  "error": {
    "codigo": "NO_AUTENTICADO",
    "mensaje": "Tu sesión expiró. Vuelve a iniciar sesión.",
    "detalles": []
  }
}
```

### `POST /api/auth/cambiar-contrasena`

El usuario cambia su propia contraseña. Requiere sesión.

**Cuerpo:**

```json
{
  "contrasenaActual": "Parroquia2026!",
  "contrasenaNueva": "Exaltacion-Obrajes-167"
}
```

`contrasenaNueva`: de 10 a 200 caracteres y distinta de la actual.

**Respuesta `204`**, sin cuerpo. La sesión actual sigue abierta.

**Errores:** `400 VALIDACION` (la nueva no cumple las reglas o la actual es incorrecta, con `detalles` en `contrasenaActual`), `401 NO_AUTENTICADO` (sin sesión) y `429 DEMASIADAS_SOLICITUDES` (comparte el límite del login).

## 3. Contraseñas

- Se guardan con **argon2id** (`usuario.hash_contrasena`, RNF-02). Nunca se devuelven ni se registran en los logs.
- Mínimo 10 caracteres para toda contraseña nueva (creación de usuario y cambio de contraseña).
- Los usuarios de desarrollo del seed (`admin@`, `parroco@`, `secretaria@` y `marketing@parroquia.test`, con contraseña `Parroquia2026!`) son **solo para desarrollo y pruebas**.

## 4. Límite de intentos

| Endpoint                                                     | Límite                                                                                                                                                   | Al superarlo                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `POST /api/auth/login` y `POST /api/auth/cambiar-contrasena` | 5 intentos **fallidos** cada 15 minutos por combinación de IP y correo, y 20 intentos fallidos cada 15 minutos por IP. Los intentos exitosos no cuentan. | `429 DEMASIADAS_SOLICITUDES` con `Retry-After` (segundos que faltan) |

```json
{
  "error": {
    "codigo": "DEMASIADAS_SOLICITUDES",
    "mensaje": "Demasiados intentos fallidos. Vuelve a intentarlo en 15 minutos.",
    "detalles": []
  }
}
```

- El `mensaje` indica los minutos que faltan, **redondeados hacia arriba**, en singular o plural: «…en 1 minuto.», «…en 12 minutos.». `Retry-After` lleva los segundos exactos.
- Superado el límite, la contraseña ni se comprueba: incluso la correcta recibe `429` hasta que pase la ventana.
- Cuenta como intento fallido: credenciales incorrectas (correo inexistente, contraseña incorrecta o usuario inactivo) y, en el cambio de contraseña, la contraseña actual incorrecta. No cuentan los `400` de validación ni los intentos exitosos.
- Un intento exitoso **no reinicia** los contadores: la ventana de 15 minutos empieza con el primer intento fallido y no se extiende con los siguientes.
- Los contadores se guardan en Redis, así que se mantienen aunque la API se reinicie. Si Redis no responde, el límite no se aplica y el login sigue funcionando (ADR-02).

## 5. Roles

| Código (`rol.codigo`) | Nombre en la base | Responsabilidad                                                                                                   |
| --------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `ADMINISTRADOR`       | Administrador     | Equipo técnico (CodeForge / soporte). Acceso total y a todas las sedes.                                           |
| `PARROCO`             | Párroco           | Valida y define el contenido pastoral. Aprueba o rechaza lo que redacta Marketing.                                |
| `SECRETARIA`          | Secretaría        | Gestiona avisos, calendario, horarios, proclamas, boletines y el contenido institucional (RF-04).                 |
| `MARKETING`           | Marketing         | Redacta noticias y notas de prensa, y gestiona multimedia y videos. Lo que redacta pasa por revisión del Párroco. |

Cada usuario tiene **un** rol.

## 6. Restricción por sede

- El **Administrador** trabaja en todas las sedes, tenga o no `sede` asignada. Si no la tiene, `sede` es `null` en la sesión y debe indicar `sedeId` al crear recursos (en las listas, `sede` es solo un filtro).
- Los demás roles tienen **una sede obligatoria** y solo pueden leer y modificar los recursos de esa sede:
  - en las listas de `/api/admin/...`, el filtro `sede` se fuerza a la suya (si piden otra, reciben `403`);
  - al crear un recurso, la sede se toma de la sesión y se ignora la que venga en el cuerpo;
  - al leer, modificar o eliminar por `id` un recurso de otra sede, la respuesta es `403 SIN_PERMISO`.
- Los catálogos globales (categorías, categorías de eventos, tipos de horario, redes sociales y tipos de bloque) se leen sin restricción de sede.

```json
{
  "error": {
    "codigo": "SIN_PERMISO",
    "mensaje": "Este recurso pertenece a otra sede.",
    "detalles": []
  }
}
```

## 7. Matriz de permisos

Todos los roles pueden **consultar** (`GET`) todos los recursos de su sede en `/api/admin/...`, salvo usuarios y bitácora. La matriz indica quién puede **modificar**.

| Permiso               | Qué permite                                                                                                                                                   | Administrador | Párroco | Secretaría | Marketing |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-----------: | :-----: | :--------: | :-------: |
| `multimedia.subir`    | Subir imágenes, videos y PDF.                                                                                                                                 |       ✓       |    ✓    |     ✓      |     ✓     |
| `multimedia.eliminar` | Eliminar archivos que no estén en uso. Fuera del Administrador, cada uno solo los que subió.                                                                  |       ✓       |    ✓    |     ✓      |     ✓     |
| `avisos.gestionar`    | Crear, editar, publicar directamente, programar, archivar y eliminar **avisos**.                                                                              |       ✓       |    ✓    |     ✓      |     —     |
| `noticias.redactar`   | Crear noticias y notas de prensa, editar los borradores propios y enviarlos a revisión.                                                                       |       ✓       |    ✓    |     —      |     ✓     |
| `noticias.publicar`   | Publicar directamente noticias y notas de prensa, **aprobar o rechazar** las que están en revisión, editar las de cualquier autor, archivarlas y eliminarlas. |       ✓       |    ✓    |     —      |     —     |
| `eventos.gestionar`   | CRUD del calendario parroquial.                                                                                                                               |       ✓       |    ✓    |     ✓      |     —     |
| `horarios.gestionar`  | CRUD de horarios.                                                                                                                                             |       ✓       |    ✓    |     ✓      |     —     |
| `servicios.gestionar` | CRUD de servicios y sacramentos, y de sus preguntas frecuentes.                                                                                               |       ✓       |    ✓    |     ✓      |     —     |
| `grupos.gestionar`    | CRUD de grupos pastorales.                                                                                                                                    |       ✓       |    ✓    |     ✓      |     —     |
| `videos.gestionar`    | CRUD de videos de YouTube.                                                                                                                                    |       ✓       |    ✓    |     ✓      |     ✓     |
| `sede.editar`         | Editar datos, contacto, configuración y redes sociales de la propia sede.                                                                                     |       ✓       |    ✓    |     ✓      |     —     |
| `sedes.gestionar`     | Crear sedes, activarlas y desactivarlas.                                                                                                                      |       ✓       |    —    |     —      |     —     |
| `proclamas.gestionar` | CRUD de proclamas matrimoniales y de sus publicaciones.                                                                                                       |       ✓       |    ✓    |     ✓      |     —     |
| `boletines.gestionar` | Publicar, reemplazar y eliminar boletines.                                                                                                                    |       ✓       |    ✓    |     ✓      |     ✓     |
| `paginas.gestionar`   | CRUD de páginas y de sus bloques (RF-04).                                                                                                                     |       ✓       |    ✓    |     ✓      |     —     |
| `usuarios.gestionar`  | CRUD de usuarios y restablecer contraseñas.                                                                                                                   |       ✓       |    —    |     —      |     —     |
| `bitacora.ver`        | Consultar la bitácora de cambios. El Párroco solo ve la de su sede.                                                                                           |       ✓       |    ✓    |     —      |     —     |

Reglas que la matriz no alcanza a mostrar (el detalle está en [estados-publicacion.md](estados-publicacion.md)):

- **Marketing** no publica: lo que redacta queda en `BORRADOR` y lo envía a revisión (`EN_REVISION`). Mientras está en revisión no puede editarlo. Si el Párroco lo rechaza, vuelve a `BORRADOR` con una observación.
- **Párroco y Administrador** publican directamente, sin pasar por revisión.
- **Avisos y eventos** (Secretaría) se publican directamente.
- Un rol sin el permiso necesario recibe `403 SIN_PERMISO`:

```json
{
  "error": {
    "codigo": "SIN_PERMISO",
    "mensaje": "Tu rol no tiene permiso para aprobar publicaciones.",
    "detalles": []
  }
}
```

## 8. Resumen de respuestas de autenticación

| Situación                                                             | Respuesta                                   |
| --------------------------------------------------------------------- | ------------------------------------------- |
| `/api/admin/...` sin cookie, con token inválido o vencido             | `401 NO_AUTENTICADO`                        |
| Usuario desactivado con una sesión abierta                            | `401 NO_AUTENTICADO` (y se borra la cookie) |
| Sesión válida pero el rol no tiene el permiso                         | `403 SIN_PERMISO`                           |
| Sesión válida pero el recurso es de otra sede                         | `403 SIN_PERMISO`                           |
| Petición que modifica datos con un `Origin` distinto de `CORS_ORIGEN` | `403 SIN_PERMISO`                           |
