import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarX2, Clock, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';

import CampoSelect from '../componentes/CampoSelect.jsx';
import ConfirmarAccion from '../componentes/ConfirmarAccion.jsx';
import { AvisoExito, AvisoSoloLectura, Cargando, ErrorConsulta } from '../componentes/EstadoConsulta.jsx';
import Paginacion from '../componentes/Paginacion.jsx';
import { usePermisos } from '../permisos/usePermisos.js';
import { CLAVE_CATALOGOS, obtenerCatalogos } from '../publicaciones/api.js';
import { CLAVE_EVENTOS, eliminarEvento, ESTADOS_EVENTO, listarEventos, VISTAS } from './api.js';
import { formatearCuandoEvento } from './formato.js';

const TONO_ESTADO = {
  PUBLICADO: 'bg-green-100 text-green-800',
  BORRADOR: 'bg-stone text-charcoal',
  ARCHIVADO: 'bg-borderSoft/60 text-muted',
};

const insignia = 'inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold';
const botonFila =
  'inline-flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-1.5 text-xs font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark';

function leerFiltros(parametros) {
  const vista = parametros.get('vista');
  const estado = parametros.get('estado');
  const categoria = parametros.get('categoria');
  const pagina = Number.parseInt(parametros.get('pagina'), 10);
  return {
    vista: vista in VISTAS ? vista : 'proximos',
    estado: estado in ESTADOS_EVENTO ? estado : '',
    categoria: /^\d+$/.test(categoria ?? '') ? categoria : '',
    pagina: pagina >= 1 ? pagina : 1,
  };
}

function TarjetaEvento({ evento, editable, onEliminar }) {
  const { titulo, categoria, estado, lugar, finalizado } = evento;
  return (
    <li>
      <article
        aria-labelledby={`evento-${evento.id}`}
        className={`flex flex-col gap-3 rounded-lg border border-borderSoft bg-white p-4 sm:flex-row sm:items-start sm:justify-between ${
          finalizado ? 'opacity-75' : ''
        }`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${insignia} bg-stone text-charcoal`}>
              <span
                aria-hidden="true"
                className="mr-1.5 inline-block size-2 rounded-full align-middle"
                style={{ backgroundColor: categoria?.colorHex ?? '#888' }}
              />
              {categoria?.nombre ?? 'Sin categoría'}
            </span>
            <span className={`${insignia} ${TONO_ESTADO[estado.codigo] ?? TONO_ESTADO.BORRADOR}`}>{estado.nombre}</span>
            {finalizado && (
              <span className={`${insignia} bg-redParish/10 text-redParish`} title="Ya no se muestra en el portal (RF-09)">
                Finalizado
              </span>
            )}
          </div>
          <h2 id={`evento-${evento.id}`} className="mt-2 break-words font-semibold text-ink">
            {titulo}
          </h2>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-charcoal">
            <Clock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
            {formatearCuandoEvento(evento)}
          </p>
          {lugar && (
            <p className="mt-1 flex items-start gap-1.5 text-sm text-charcoal">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
              {lugar}
            </p>
          )}
        </div>

        {editable && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link to={`/admin/eventos/${evento.id}/editar`} aria-label={`Editar «${titulo}»`} className={botonFila}>
              <Pencil className="size-3.5" aria-hidden="true" /> Editar
            </Link>
            <button type="button" onClick={() => onEliminar(evento)} aria-label={`Eliminar «${titulo}»`} className={botonFila}>
              <Trash2 className="size-3.5" aria-hidden="true" /> Eliminar
            </button>
          </div>
        )}
      </article>
    </li>
  );
}

// Calendario parroquial: próximos, finalizados (RF-09: ya no se ven en el portal) o todos.
export default function ListadoEventos() {
  const [parametros, setParametros] = useSearchParams();
  const filtros = leerFiltros(parametros);
  const { puede } = usePermisos();
  const editable = puede('eventos.gestionar');
  const clienteConsultas = useQueryClient();
  const ubicacion = useLocation();
  const [aviso, setAviso] = useState(ubicacion.state?.aviso ?? '');
  const [porEliminar, setPorEliminar] = useState(null);

  const catalogos = useQuery({ queryKey: CLAVE_CATALOGOS, queryFn: obtenerCatalogos, staleTime: 5 * 60 * 1000 });
  const { data, isPending, isError, error, isPlaceholderData, refetch } = useQuery({
    queryKey: [...CLAVE_EVENTOS, 'lista', filtros],
    queryFn: ({ signal }) => listarEventos(filtros, signal),
    placeholderData: keepPreviousData,
  });

  const eliminar = useMutation({
    mutationFn: (evento) => eliminarEvento(evento.id),
    onSuccess: (_, evento) => {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_EVENTOS });
      setAviso(`Se eliminó el evento «${evento.titulo}».`);
      setPorEliminar(null);
    },
  });

  function cambiar(cambios) {
    const siguiente = { ...filtros, pagina: 1, ...cambios };
    const nuevos = new URLSearchParams();
    if (siguiente.vista !== 'proximos') nuevos.set('vista', siguiente.vista);
    if (siguiente.estado) nuevos.set('estado', siguiente.estado);
    if (siguiente.categoria) nuevos.set('categoria', siguiente.categoria);
    if (siguiente.pagina > 1) nuevos.set('pagina', String(siguiente.pagina));
    setParametros(nuevos, { replace: true });
  }

  const eventos = data?.datos ?? [];
  const categorias = catalogos.data?.categoriasEvento ?? [];

  return (
    <section className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-ink">Eventos</h1>
          <p className="mt-2 text-muted">Calendario parroquial. Los eventos se publican directamente, sin revisión.</p>
        </div>
        {editable && (
          <Link
            to="/admin/eventos/nuevo"
            className="flex items-center gap-2 rounded-md bg-gold px-4 py-2.5 font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark"
          >
            <Plus className="size-4" aria-hidden="true" /> Nuevo evento
          </Link>
        )}
      </header>

      {!editable && <AvisoSoloLectura>Tu rol puede consultar el calendario, pero no modificarlo.</AvisoSoloLectura>}
      <AvisoExito>{aviso}</AvisoExito>

      <div className="mt-6 flex flex-col gap-4 rounded-lg border border-borderSoft bg-white p-4 sm:flex-row sm:items-end">
        <div role="group" aria-label="Mostrar eventos" className="flex rounded-md border border-borderSoft p-0.5">
          {Object.entries(VISTAS).map(([clave, { etiqueta }]) => (
            <button
              key={clave}
              type="button"
              aria-pressed={filtros.vista === clave}
              onClick={() => cambiar({ vista: clave })}
              className={`flex-1 rounded px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-goldDark ${
                filtros.vista === clave ? 'bg-gold text-ink' : 'hover:bg-stone'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3">
          <CampoSelect
            etiqueta="Categoría"
            value={filtros.categoria}
            onChange={(e) => cambiar({ categoria: e.target.value })}
            opciones={[['', 'Todas'], ...categorias.map((c) => [String(c.id), c.nombre])]}
          />
          <CampoSelect
            etiqueta="Estado"
            value={filtros.estado}
            onChange={(e) => cambiar({ estado: e.target.value })}
            opciones={[['', 'Todos'], ...Object.entries(ESTADOS_EVENTO)]}
          />
        </div>
      </div>

      <div className="mt-6" aria-busy={isPending || isPlaceholderData}>
        {isPending && <Cargando texto="Cargando eventos…" />}
        {isError && !data && <ErrorConsulta texto="No se pudieron cargar los eventos" error={error} onReintentar={refetch} />}

        {data && (
          <>
            <p className="mb-3 text-sm text-muted" aria-live="polite">
              {data.paginacion.total} {data.paginacion.total === 1 ? 'evento' : 'eventos'}
            </p>
            {eventos.length ? (
              <ul aria-label="Eventos" className={`flex flex-col gap-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
                {eventos.map((evento) => (
                  <TarjetaEvento key={evento.id} evento={evento} editable={editable} onEliminar={setPorEliminar} />
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-borderSoft bg-white py-12 text-center text-muted">
                <CalendarX2 className="size-10" aria-hidden="true" />
                <p>No hay eventos con estos filtros.</p>
              </div>
            )}
            <Paginacion paginacion={data.paginacion} nombre="Paginación de eventos" onCambiar={(pagina) => cambiar({ pagina })} />
          </>
        )}
      </div>

      {porEliminar && (
        <ConfirmarAccion
          titulo={`¿Eliminar «${porEliminar.titulo}»?`}
          pendiente={eliminar.isPending}
          error={eliminar.error}
          onConfirmar={() => eliminar.mutate(porEliminar)}
          onCancelar={() => {
            eliminar.reset();
            setPorEliminar(null);
          }}
        >
          Se quitará del calendario y del portal. Si solo quieres ocultarlo, edítalo y cámbialo a «Archivado».
        </ConfirmarAccion>
      )}
    </section>
  );
}
