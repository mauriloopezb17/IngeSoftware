// Enumeraciones fijas del contrato (docs/api/convenciones.md, sección 2) y su nombre en la base.
//
// Las tablas de catálogo (estado_publicacion, tipo_publicacion, tipo_sede, rol) no tienen columna
// "codigo" y sus ids no siguen un orden lógico (ej. "En revisión" es el id 4). Por eso la API:
//  * responde con el código (EN_REVISION) traducido desde el nombre guardado ("En revisión");
//  * filtra en SQL por nombre (JOIN ... WHERE estado.nombre = $1), nunca con ids fijos.

class Catalogo {
  // descripcion: para los mensajes de error. nombres: { CODIGO: 'Nombre en la base' }.
  constructor(descripcion, nombres) {
    this.descripcion = descripcion;
    this.nombres = Object.freeze({ ...nombres });
    this.codigosPorNombre = Object.freeze(
      Object.fromEntries(Object.entries(nombres).map(([codigo, nombre]) => [nombre, codigo])),
    );
    this.codigos = Object.freeze(Object.keys(nombres));
    Object.freeze(this);
  }

  // Código de la API -> nombre en la base (para filtrar en SQL).
  nombreDe(codigo) {
    const nombre = this.nombres[codigo];
    if (nombre === undefined) {
      throw new Error(`Código de ${this.descripcion} desconocido: ${codigo}`);
    }
    return nombre;
  }

  // Nombre en la base -> código de la API. Un nombre desconocido indica que la base y el código
  // no coinciden (ej. alguien renombró una fila del catálogo): es un error interno, no del usuario.
  codigoDe(nombre) {
    const codigo = this.codigosPorNombre[nombre];
    if (codigo === undefined) {
      throw new Error(`Nombre de ${this.descripcion} sin código en la API: ${nombre}`);
    }
    return codigo;
  }

  // Objeto { codigo, nombre } de las respuestas (ej. "tipo": { "codigo": "PARROQUIA", "nombre": "Parroquia" }).
  aEnumeracion(nombre) {
    return { codigo: this.codigoDe(nombre), nombre };
  }
}

export const ESTADOS_PUBLICACION = new Catalogo('estado de publicación', {
  BORRADOR: 'Borrador',
  EN_REVISION: 'En revisión',
  PUBLICADO: 'Publicado',
  ARCHIVADO: 'Archivado',
});

export const TIPOS_PUBLICACION = new Catalogo('tipo de publicación', {
  AVISO: 'Aviso',
  NOTICIA: 'Noticia',
  NOTA_DE_PRENSA: 'Nota de prensa',
});

export const TIPOS_SEDE = new Catalogo('tipo de sede', {
  PARROQUIA: 'Parroquia',
  CAPILLA: 'Capilla',
});

export const ROLES = new Catalogo('rol', {
  ADMINISTRADOR: 'Administrador',
  PARROCO: 'Párroco',
  SECRETARIA: 'Secretaría',
  MARKETING: 'Marketing',
});
