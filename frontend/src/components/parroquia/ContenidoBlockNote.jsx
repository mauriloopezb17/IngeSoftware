import '../../styles/ContenidoBlockNote.css';
import { construirAtributosImagen } from './imagenSrcSet.js';

const PROTOCOLOS_ENLACE_PERMITIDOS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const PROTOCOLOS_ENLACE_EXTERNO = new Set(['http:', 'https:']);

const ALINEACIONES_PERMITIDAS = new Set(['left', 'center', 'right', 'justify']);

const COLORES_PALETA = new Set([
  'gray',
  'brown',
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
]);

const PROFUNDIDAD_MAXIMA_LISTA = 3;

function analizarHrefSeguro(href) {
  if (typeof href !== 'string') return null;
  const limpio = href.trim();
  if (!limpio) return null;

  try {
    const url = new URL(limpio);
    if (!PROTOCOLOS_ENLACE_PERMITIDOS.has(url.protocol)) {
      return null;
    }
    return {
      href: limpio,
      esExterno: PROTOCOLOS_ENLACE_EXTERNO.has(url.protocol),
    };
  } catch {
    return null;
  }
}

function esUrlMultimediaSegura(url) {
  if (typeof url !== 'string') return false;
  const limpio = url.trim();
  if (!limpio) return false;
  if (limpio.startsWith('/') && !limpio.startsWith('//')) return true;

  try {
    const parsed = new URL(limpio);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function clasesBloqueTexto(props = {}, claseBase) {
  const clases = [claseBase];

  if (ALINEACIONES_PERMITIDAS.has(props.textAlignment)) {
    clases.push(`bn-alinear-${props.textAlignment}`);
  }
  if (COLORES_PALETA.has(props.textColor)) {
    clases.push(`bn-texto-${props.textColor}`);
  }
  if (COLORES_PALETA.has(props.backgroundColor)) {
    clases.push(`bn-fondo-${props.backgroundColor}`);
  }

  return clases.join(' ');
}

function renderizarNodoTexto(item, clave) {
  const texto = typeof item?.text === 'string' ? item.text : '';
  const estilos = item?.styles ?? {};

  let contenido = texto;

  if (estilos.bold) contenido = <strong>{contenido}</strong>;
  if (estilos.italic) contenido = <em>{contenido}</em>;
  if (estilos.underline) contenido = <u>{contenido}</u>;
  if (estilos.strike) contenido = <s>{contenido}</s>;

  const clasesColor = [];
  if (COLORES_PALETA.has(estilos.textColor)) {
    clasesColor.push(`bn-texto-${estilos.textColor}`);
  }
  if (COLORES_PALETA.has(estilos.backgroundColor)) {
    clasesColor.push(`bn-fondo-${estilos.backgroundColor}`);
  }

  if (clasesColor.length > 0) {
    return (
      <span key={clave} className={clasesColor.join(' ')}>
        {contenido}
      </span>
    );
  }

  return <span key={clave}>{contenido}</span>;
}

function renderizarContenidoEnLinea(content) {
  if (!Array.isArray(content) || content.length === 0) return null;

  return content.map((item, indice) => {
    const clave = `inline-${indice}`;

    if (item?.type === 'text') {
      return renderizarNodoTexto(item, clave);
    }

    if (item?.type === 'link') {
      const hijos = Array.isArray(item.content)
        ? item.content.map((nodo, subIndice) =>
            nodo?.type === 'text' ? renderizarNodoTexto(nodo, `${clave}-${subIndice}`) : null,
          )
        : null;

      const enlaceSeguro = analizarHrefSeguro(item.href);
      if (!enlaceSeguro) {
        return <span key={clave}>{hijos}</span>;
      }

      if (enlaceSeguro.esExterno) {
        return (
          <a
            key={clave}
            href={enlaceSeguro.href}
            target="_blank"
            rel="noopener noreferrer"
            className="bn-enlace"
          >
            {hijos}
          </a>
        );
      }

      return (
        <a key={clave} href={enlaceSeguro.href} className="bn-enlace">
          {hijos}
        </a>
      );
    }

    return null;
  });
}

function renderizarItemLista(bloque, profundidad) {
  const clave = bloque.id || `item-${profundidad}`;
  const props = bloque.props ?? {};
  const tieneHijos =
    Array.isArray(bloque.children) &&
    bloque.children.length > 0 &&
    profundidad < PROFUNDIDAD_MAXIMA_LISTA;

  return (
    <li key={clave} className={clasesBloqueTexto(props, 'bn-lista-item')}>
      {renderizarContenidoEnLinea(bloque.content)}
      {tieneHijos && renderizarListaBloques(bloque.children, profundidad + 1)}
    </li>
  );
}

function renderizarBloque(bloque, indice) {
  if (!bloque || typeof bloque !== 'object') return null;

  const clave = bloque.id || `bloque-${indice}`;
  const props = bloque.props ?? {};

  switch (bloque.type) {
    case 'paragraph': {
      const contenido = renderizarContenidoEnLinea(bloque.content);
      return (
        <p key={clave} className={clasesBloqueTexto(props, 'bn-parrafo')}>
          {contenido}
        </p>
      );
    }

    case 'heading': {
      const nivel = props.level === 3 ? 3 : 2;
      const Etiqueta = nivel === 3 ? 'h3' : 'h2';
      return (
        <Etiqueta
          key={clave}
          className={clasesBloqueTexto(props, `bn-encabezado bn-encabezado-${nivel}`)}
        >
          {renderizarContenidoEnLinea(bloque.content)}
        </Etiqueta>
      );
    }

    case 'quote':
      return (
        <blockquote key={clave} className={clasesBloqueTexto(props, 'bn-cita')}>
          {renderizarContenidoEnLinea(bloque.content)}
        </blockquote>
      );

    case 'image': {
      if (!esUrlMultimediaSegura(props.url)) return null;
      const ancho = Number.isFinite(props.previewWidth) && props.previewWidth > 0 ? props.previewWidth : undefined;
      const textoAlternativo = props.caption || props.name || '';
      const atributosResponsivos = construirAtributosImagen(
        { url: props.url, ancho: props.ancho ?? ancho, variantes: props.variantes },
        '(min-width: 768px) 720px, 100vw',
      );
      return (
        <figure key={clave} className={clasesBloqueTexto(props, 'bn-figura')}>
          <img
            src={props.url}
            {...atributosResponsivos}
            alt={textoAlternativo}
            width={ancho}
            loading="lazy"
            className="bn-imagen"
          />
          {props.caption && <figcaption className="bn-leyenda">{props.caption}</figcaption>}
        </figure>
      );
    }

    case 'video': {
      if (!esUrlMultimediaSegura(props.url)) return null;
      const ancho = Number.isFinite(props.previewWidth) && props.previewWidth > 0 ? props.previewWidth : undefined;
      return (
        <figure key={clave} className={clasesBloqueTexto(props, 'bn-figura')}>
          <video
            controls
            preload="metadata"
            src={props.url}
            width={ancho}
            className="bn-video"
          />
          {props.caption && <figcaption className="bn-leyenda">{props.caption}</figcaption>}
        </figure>
      );
    }

    default:
      return null;
  }
}

function renderizarListaBloques(bloques, profundidad = 0) {
  const elementos = [];
  let i = 0;

  while (i < bloques.length) {
    const actual = bloques[i];

    if (actual?.type === 'bulletListItem' || actual?.type === 'numberedListItem') {
      const tipoLista = actual.type;
      const grupo = [];

      while (i < bloques.length && bloques[i]?.type === tipoLista) {
        grupo.push(bloques[i]);
        i += 1;
      }

      const claveGrupo = `${tipoLista}-${grupo[0]?.id || i}`;
      if (tipoLista === 'bulletListItem') {
        elementos.push(
          <ul key={claveGrupo} className="bn-lista bn-lista-vinetas">
            {grupo.map((item) => renderizarItemLista(item, profundidad))}
          </ul>,
        );
      } else {
        const inicio =
          Number.isInteger(grupo[0]?.props?.start) && grupo[0].props.start > 0
            ? grupo[0].props.start
            : undefined;
        elementos.push(
          <ol key={claveGrupo} start={inicio} className="bn-lista bn-lista-numerada">
            {grupo.map((item) => renderizarItemLista(item, profundidad))}
          </ol>,
        );
      }
    } else {
      const nodo = renderizarBloque(actual, i);
      if (nodo) elementos.push(nodo);
      i += 1;
    }
  }

  return elementos;
}

/**
 * Renderiza el documento BlockNote de una publicación siguiendo el contrato de
 * `docs/api/contenido.md`, sin cargar el editor ni usar HTML sin sanitizar.
 */
function ContenidoBlockNote({ contenido }) {
  if (
    !contenido ||
    contenido.formato !== 'blocknote' ||
    !Array.isArray(contenido.bloques) ||
    contenido.bloques.length === 0
  ) {
    return null;
  }

  return <div className="bn-contenido">{renderizarListaBloques(contenido.bloques)}</div>;
}

export default ContenidoBlockNote;
