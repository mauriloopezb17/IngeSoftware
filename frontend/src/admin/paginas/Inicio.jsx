import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ClipboardCheck, FilePen, MessageSquareWarning, ScrollText } from 'lucide-react';

import { listarEventos, CLAVE_EVENTOS } from '../eventos/api.js';
import { formatearCuandoEvento } from '../eventos/formato.js';
import TarjetaResumen from '../inicio/TarjetaResumen.jsx';
import { formatearFecha } from '../multimedia/formato.js';
import { usePermisos } from '../permisos/usePermisos.js';
import { CLAVE_PROCLAMAS, listarProclamas } from '../proclamas/api.js';
import { CLAVE_PUBLICACIONES, listarPublicaciones } from '../publicaciones/api.js';
import { useSesion } from '../sesion/SesionContexto.js';

const MAX_FILAS = 3;
const enlaceDe = (a, texto) => ({ a, texto });
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// Quien aprueba (Párroco, Administrador): lo que espera su revisión.
function TarjetaEnRevision() {
  const consulta = useQuery({
    queryKey: [...CLAVE_PUBLICACIONES, 'inicio', 'en-revision'],
    queryFn: ({ signal }) => listarPublicaciones({ estado: 'EN_REVISION', pagina: 1, porPagina: MAX_FILAS }, signal),
  });
  const total = consulta.data?.paginacion.total ?? 0;

  return (
    <TarjetaResumen
      id="resumen-en-revision"
      titulo="En revisión"
      icono={ClipboardCheck}
      consulta={consulta}
      cantidad={plural(total, 'publicación', 'publicaciones')}
      vacio="No hay publicaciones esperando tu revisión."
      filas={(consulta.data?.datos ?? []).map((p) => ({
        clave: p.id,
        contenido: (
          <>
            <span className="font-medium">{p.titulo}</span>
            <span className="text-muted"> · {p.autor.nombreCompleto}</span>
          </>
        ),
      }))}
      enlace={enlaceDe('/admin/publicaciones/revision', 'Abrir la bandeja de revisión')}
    />
  );
}

// Marketing: sus borradores y las que el Párroco rechazó (BORRADOR con observación de la revisión).
function TarjetasDeMarketing() {
  const consulta = useQuery({
    queryKey: [...CLAVE_PUBLICACIONES, 'inicio', 'mis-borradores'],
    queryFn: ({ signal }) => listarPublicaciones({ estado: 'BORRADOR', autor: 'yo', pagina: 1, porPagina: 50 }, signal),
  });
  const propias = consulta.data?.datos ?? [];
  const rechazadas = propias.filter((p) => p.revision?.observacion);
  const borradores = propias.filter((p) => !p.revision?.observacion);
  const enlaceEditar = (p) => (
    <Link
      to={`/admin/publicaciones/${p.id}/editar`}
      className="font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-goldDark"
    >
      {p.titulo}
    </Link>
  );

  return (
    <>
      <TarjetaResumen
        id="resumen-borradores"
        titulo="Mis borradores"
        icono={FilePen}
        consulta={consulta}
        cantidad={plural(borradores.length, 'borrador', 'borradores')}
        vacio="No tienes borradores pendientes."
        filas={borradores.slice(0, MAX_FILAS).map((p) => ({ clave: p.id, contenido: enlaceEditar(p) }))}
        enlace={enlaceDe('/admin/publicaciones?estado=BORRADOR&autor=yo', 'Ver mis borradores')}
      />
      <TarjetaResumen
        id="resumen-rechazadas"
        titulo="Rechazadas"
        icono={MessageSquareWarning}
        consulta={consulta}
        cantidad={plural(rechazadas.length, 'rechazada', 'rechazadas')}
        vacio="Ninguna de tus publicaciones fue rechazada."
        filas={rechazadas.slice(0, MAX_FILAS).map((p) => ({
          clave: p.id,
          contenido: (
            <>
              {enlaceEditar(p)}
              <span className="block text-xs text-muted">{p.revision.observacion}</span>
            </>
          ),
        }))}
        enlace={enlaceDe('/admin/publicaciones?estado=BORRADOR&autor=yo', 'Corregirlas')}
      />
    </>
  );
}

// Eventos que se muestran en el portal y aún no terminan.
function TarjetaProximosEventos() {
  const consulta = useQuery({
    queryKey: [...CLAVE_EVENTOS, 'inicio', 'proximos'],
    queryFn: ({ signal }) => listarEventos({ vista: 'proximos', estado: 'PUBLICADO', pagina: 1, porPagina: MAX_FILAS }, signal),
  });
  const total = consulta.data?.paginacion.total ?? 0;

  return (
    <TarjetaResumen
      id="resumen-eventos"
      titulo="Próximos eventos"
      icono={CalendarDays}
      consulta={consulta}
      cantidad={plural(total, 'evento', 'eventos')}
      vacio="No hay eventos próximos publicados."
      filas={(consulta.data?.datos ?? []).map((e) => ({
        clave: e.id,
        contenido: (
          <>
            <span className="font-medium">{e.titulo}</span>
            <span className="block text-xs text-muted">{formatearCuandoEvento(e)}</span>
          </>
        ),
      }))}
      enlace={enlaceDe('/admin/eventos', 'Ver el calendario')}
    />
  );
}

function TarjetaProclamasVigentes() {
  const consulta = useQuery({
    queryKey: [...CLAVE_PROCLAMAS, 'inicio', 'vigentes'],
    queryFn: ({ signal }) => listarProclamas({ vista: 'vigentes', pagina: 1, porPagina: MAX_FILAS }, signal),
  });
  const total = consulta.data?.paginacion.total ?? 0;

  return (
    <TarjetaResumen
      id="resumen-proclamas"
      titulo="Proclamas vigentes"
      icono={ScrollText}
      consulta={consulta}
      cantidad={plural(total, 'proclama', 'proclamas')}
      vacio="No hay proclamas vigentes."
      filas={(consulta.data?.datos ?? []).map((p) => ({
        clave: p.id,
        contenido: (
          <>
            <span className="font-medium">
              {p.contrayente1} y {p.contrayente2}
            </span>
            <span className="block text-xs text-muted">
              {p.numeroProclama ? `${p.numeroProclama}.ª proclama · ` : ''}Matrimonio: {formatearFecha(p.fechaMatrimonio)}
            </span>
          </>
        ),
      }))}
      enlace={enlaceDe('/admin/proclamas', 'Ver las proclamas')}
    />
  );
}

// Pantalla de inicio del panel (se muestra dentro del layout): saludo y resumen de pendientes según el rol.
// Solo usa endpoints que ya existen; las tarjetas de publicaciones salen de la matriz de permisos.
export default function Inicio() {
  const { usuario } = useSesion();
  const { puede } = usePermisos();
  const apruebaNoticias = puede('noticias.publicar');
  const soloRedacta = puede('noticias.redactar') && !apruebaNoticias; // Marketing

  return (
    <section className="mx-auto max-w-5xl">
      <h1 className="font-display text-4xl font-semibold text-ink">Inicio</h1>
      <p className="mt-4 text-muted">Bienvenido, {usuario?.nombreCompleto}.</p>

      <section aria-labelledby="resumen-pendientes" className="mt-8">
        <h2 id="resumen-pendientes" className="font-display text-2xl font-semibold text-ink">
          Resumen
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apruebaNoticias && <TarjetaEnRevision />}
          {soloRedacta && <TarjetasDeMarketing />}
          <TarjetaProximosEventos />
          <TarjetaProclamasVigentes />
        </div>
      </section>
    </section>
  );
}
