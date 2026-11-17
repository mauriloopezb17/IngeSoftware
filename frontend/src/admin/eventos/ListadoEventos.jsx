import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarX2, Clock, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';

import ConfirmarAccion from '../componentes/ConfirmarAccion.jsx';
import Paginacion from '../componentes/Paginacion.jsx';
import { useEnfocarAviso } from '../componentes/useEnfocarAviso.js';
import { usePermisos } from '../permisos/usePermisos.js';
import { CLAVE_CATALOGOS, obtenerCatalogos } from '../publicaciones/api.js';
import {
  Aviso,
  Boton,
  CampoSelect,
  EncabezadoPantalla,
  EsqueletoTarjetas,
  EstadoVacio,
  Insignia,
  useToast,
} from '../ui/index.js';
import { CLAVE_EVENTOS, eliminarEvento, ESTADOS_EVENTO, listarEventos, VISTAS } from './api.js';
import { formatearCuandoEvento } from './formato.js';

const VARIANTE_ESTADO = {
  PUBLICADO: 'publicado',
  BORRADOR: 'borrador',
  ARCHIVADO: 'archivado',
};

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
        className={`flex flex-col gap-3 rounded-lg border border-sand bg-white p-5 sm:flex-row sm:items-start sm:justify-between ${
          finalizado ? 'opacity-75' : ''
        }`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Insignia variante="borrador">
              <span
                aria-hidden="true"
                className="mr-1.5 inline-block size-2 rounded-full"
                style={{ backgroundColor: categoria?.colorHex ?? '#6b625d' }}
              />
              {categoria?.nombre ?? 'Sin categoría'}
            </Insignia>
            <Insignia variante={VARIANTE_ESTADO[estado.codigo] ?? 'borrador'}>{estado.nombre}</Insignia>
            {finalizado && (
              <Insignia variante="rechazado">
                <span title="Ya no se muestra en el portal (RF-09)">Finalizado</span>
              </Insignia>
            )}
          </div>
          <h2 id={`evento-${evento.id}`} className="mt-2.5 break-words text-base font-semibold text-ink">
            {titulo}
          </h2>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-ink">
            <Clock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
            {formatearCuandoEvento(evento)}
          </p>
          {lugar && (
            <p className="mt-1 flex items-start gap-1.5 text-sm text-muted">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
              {lugar}
            </p>
          )}
        </div>

        {editable && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <Boton
              como={Link}
              to={`/admin/eventos/${evento.id}/editar`}
              variante="secundario"
              tamano="sm"
              icono={Pencil}
              aria-label={`Editar «${titulo}»`}
            >
              Editar
            </Boton>
            <Boton
              variante="secundario"
              tamano="sm"
              icono={Trash2}
              onClick={() => onEliminar(evento)}
              aria-label={`Eliminar «${titulo}»`}
            >
              Eliminar
            </Boton>
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
  const toast = useToast();
  const [aviso, setAviso] = useState(ubicacion.state?.aviso ?? '');
  const avisoRef = useEnfocarAviso(aviso); // tras eliminar, el foco pasa al mensaje (la fila y su botón desaparecen)
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
      const mensaje = `Se eliminó el evento «${evento.titulo}».`;
      setAviso(mensaje);
      toast.exito(mensaje);
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
      <EncabezadoPantalla
        titulo="Eventos"
        descripcion="Calendario parroquial. Los eventos se publican directamente, sin revisión."
        acciones={
          editable && (
            <Boton como={Link} to="/admin/eventos/nuevo" variante="primario" icono={Plus}>
              Nuevo evento
            </Boton>
          )
        }
      />

      {!editable && (
        <Aviso tipo="soloLectura" className="mt-4">
          <p>
            <strong className="font-semibold text-ink">Solo lectura.</strong> Tu rol puede consultar el calendario, pero no
            modificarlo.
          </p>
        </Aviso>
      )}
      {aviso && (
        <Aviso
          ref={avisoRef}
          tipo="exito"
          tabIndex={-1}
          className="mt-4 outline-none focus-visible:outline-2 focus-visible:outline-ink"
        >
          {aviso}
        </Aviso>
      )}

      <div className="mt-6 flex flex-col gap-4 rounded-lg border border-sand bg-white p-4 sm:flex-row sm:items-end">
        <div role="group" aria-label="Mostrar eventos" className="flex rounded-md border border-sand bg-panel p-0.5">
          {Object.entries(VISTAS).map(([clave, { etiqueta }]) => (
            <button
              key={clave}
              type="button"
              aria-pressed={filtros.vista === clave}
              onClick={() => cambiar({ vista: clave })}
              className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors duration-150 ease-salida focus-visible:outline-2 focus-visible:outline-ink motion-reduce:transition-none ${
                filtros.vista === clave ? 'bg-gold font-semibold text-ink' : 'text-ink hover:bg-white'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
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
        {isPending && <EsqueletoTarjetas cantidad={3} columnas="grid-cols-1" etiqueta="Cargando eventos…" />}
        {isError && !data && (
          <Aviso
            tipo="error"
            accion={
              <Boton variante="secundario" tamano="sm" onClick={() => refetch()}>
                Reintentar
              </Boton>
            }
          >
            <p>No se pudieron cargar los eventos: {error.message}</p>
          </Aviso>
        )}

        {data && (
          <>
            <p className="mb-3 text-sm tabular-nums text-muted" aria-live="polite">
              {data.paginacion.total} {data.paginacion.total === 1 ? 'evento' : 'eventos'}
            </p>
            {eventos.length ? (
              <ul aria-label="Eventos" className={`flex flex-col gap-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
                {eventos.map((evento) => (
                  <TarjetaEvento key={evento.id} evento={evento} editable={editable} onEliminar={setPorEliminar} />
                ))}
              </ul>
            ) : (
              <EstadoVacio
                icono={CalendarX2}
                titulo="No hay eventos con estos filtros."
                descripcion="Ajusta los filtros o crea un evento nuevo para el calendario."
                accion={
                  editable && (
                    <Boton como={Link} to="/admin/eventos/nuevo" variante="primario" icono={Plus}>
                      Nuevo evento
                    </Boton>
                  )
                }
              />
            )}
            <Paginacion
              paginacion={data.paginacion}
              nombre="Paginación de eventos"
              onCambiar={(pagina) => cambiar({ pagina })}
            />
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
