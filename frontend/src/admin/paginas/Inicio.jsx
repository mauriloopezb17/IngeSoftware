import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  CalendarPlus,
  ClipboardCheck,
  FilePen,
  Megaphone,
  MessageSquareWarning,
  Plus,
  ScrollText,
} from 'lucide-react';

import { CLAVE_EVENTOS, listarEventos } from '../eventos/api.js';
import { formatearCuandoEvento } from '../eventos/formato.js';
import TarjetaResumen from '../inicio/TarjetaResumen.jsx';
import { formatearFecha } from '../multimedia/formato.js';
import { usePermisos } from '../permisos/usePermisos.js';
import { CLAVE_PROCLAMAS, listarProclamas } from '../proclamas/api.js';
import { CLAVE_PUBLICACIONES, listarPublicaciones } from '../publicaciones/api.js';
import { useSesion } from '../sesion/SesionContexto.js';
import { Boton } from '../ui/index.js';

const MAX_FILAS = 3;
const enlaceDe = (a, texto) => ({ a, texto });
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

function formatearFechaHoy() {
  const texto = new Intl.DateTimeFormat('es-BO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/La_Paz',
  }).format(new Date());
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

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
      className="font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ink"
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

const ACCESOS_RAPIDOS = [
  { permiso: 'noticias.redactar', a: '/admin/publicaciones/nueva', texto: 'Nueva publicación', icono: Plus },
  { permiso: 'avisos.gestionar', a: '/admin/publicaciones/avisos/nuevo', texto: 'Nuevo aviso', icono: Megaphone },
  { permiso: 'eventos.gestionar', a: '/admin/eventos/nuevo', texto: 'Nuevo evento', icono: CalendarPlus },
  { permiso: 'proclamas.gestionar', a: '/admin/proclamas/nueva', texto: 'Nueva proclama', icono: ScrollText },
];

// Pantalla de inicio del panel (se muestra dentro del layout): saludo y resumen de pendientes según el rol.
// Solo usa endpoints que ya existen; las tarjetas de publicaciones salen de la matriz de permisos.
export default function Inicio() {
  const { usuario } = useSesion();
  const { puede } = usePermisos();
  const apruebaNoticias = puede('noticias.publicar');
  const soloRedacta = puede('noticias.redactar') && !apruebaNoticias; // Marketing
  const accesos = ACCESOS_RAPIDOS.filter((item) => puede(item.permiso));

  return (
    <section className="mx-auto max-w-5xl">
      <header className="border-b border-sand pb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-body text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">Inicio</h1>
          <p className="text-xs font-medium text-muted">{formatearFechaHoy()}</p>
        </div>
        <p className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
          Bienvenido, {usuario?.nombreCompleto}.
        </p>

        {accesos.length > 0 && (
          <nav aria-label="Accesos rápidos de creación" className="mt-5 flex flex-wrap gap-2.5">
            {accesos.map(({ a, texto, icono }) => (
              <Boton key={a} como={Link} to={a} variante="secundario" tamano="sm" icono={icono}>
                {texto}
              </Boton>
            ))}
          </nav>
        )}
      </header>

      <section aria-labelledby="resumen-pendientes" className="mt-8">
        <h2 id="resumen-pendientes" className="font-body text-base font-semibold text-ink">
          Resumen de actividad
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
