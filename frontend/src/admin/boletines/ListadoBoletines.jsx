import { useId, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FileText, Inbox, Pencil, Plus, Trash2 } from 'lucide-react';

import ConfirmarAccion from '../componentes/ConfirmarAccion.jsx';
import { AvisoExito, AvisoSoloLectura, Cargando, ErrorConsulta } from '../componentes/EstadoConsulta.jsx';
import { useEnfocarAviso } from '../componentes/useEnfocarAviso.js';
import Paginacion from '../componentes/Paginacion.jsx';
import { formatearFecha, formatearTamano } from '../multimedia/formato.js';
import { usePermisos } from '../permisos/usePermisos.js';
import { CLAVE_BOLETINES, eliminarBoletin, formatearPeriodo, listarBoletines } from './api.js';

const botonFila =
  'inline-flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-1.5 text-xs font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark';

function leerFiltros(parametros) {
  const anio = parametros.get('anio') ?? '';
  const pagina = Number.parseInt(parametros.get('pagina'), 10);
  return { anio: /^\d{4}$/.test(anio) ? anio : '', pagina: pagina >= 1 ? pagina : 1 };
}

export default function ListadoBoletines() {
  const [parametros, setParametros] = useSearchParams();
  const filtros = leerFiltros(parametros);
  const { puede } = usePermisos();
  const editable = puede('boletines.gestionar');
  const clienteConsultas = useQueryClient();
  const ubicacion = useLocation();
  const [aviso, setAviso] = useState(ubicacion.state?.aviso ?? '');
  const avisoRef = useEnfocarAviso(aviso); // tras eliminar, el foco pasa al mensaje (la fila y su botón desaparecen)
  const [porEliminar, setPorEliminar] = useState(null);
  const idAnio = useId();

  const { data, isPending, isError, error, isPlaceholderData, refetch } = useQuery({
    queryKey: [...CLAVE_BOLETINES, 'lista', filtros],
    queryFn: ({ signal }) => listarBoletines(filtros, signal),
    placeholderData: keepPreviousData,
  });

  const eliminar = useMutation({
    mutationFn: (boletin) => eliminarBoletin(boletin.id),
    onSuccess: (_, boletin) => {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_BOLETINES });
      setAviso(`Se eliminó el boletín «${boletin.titulo}». Su PDF sigue en la biblioteca multimedia.`);
      setPorEliminar(null);
    },
  });

  function cambiar(cambios) {
    const siguiente = { ...filtros, pagina: 1, ...cambios };
    const nuevos = new URLSearchParams();
    if (siguiente.anio) nuevos.set('anio', siguiente.anio);
    if (siguiente.pagina > 1) nuevos.set('pagina', String(siguiente.pagina));
    setParametros(nuevos, { replace: true });
  }

  const boletines = data?.datos ?? [];

  return (
    <section className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-ink">Boletines</h1>
          <p className="mt-2 text-muted">Boletines parroquiales en PDF. Se publican directamente, sin revisión.</p>
        </div>
        {editable && (
          <Link
            to="/admin/boletines/nuevo"
            className="flex items-center gap-2 rounded-md bg-gold px-4 py-2.5 font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark"
          >
            <Plus className="size-4" aria-hidden="true" /> Nuevo boletín
          </Link>
        )}
      </header>

      {!editable && <AvisoSoloLectura>Tu rol puede consultar los boletines, pero no modificarlos.</AvisoSoloLectura>}
      <AvisoExito ref={avisoRef}>{aviso}</AvisoExito>

      <div className="mt-6 flex flex-col gap-1 rounded-lg border border-borderSoft bg-white p-4 sm:w-56">
        <label htmlFor={idAnio} className="text-xs font-semibold text-muted">
          Año
        </label>
        <input
          id={idAnio}
          type="number"
          inputMode="numeric"
          min="2000"
          max="2100"
          value={filtros.anio}
          onChange={(e) => cambiar({ anio: e.target.value })}
          placeholder="Todos"
          className="w-full rounded-md border border-borderSoft bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-goldDark"
        />
      </div>

      <div className="mt-6" aria-busy={isPending || isPlaceholderData}>
        {isPending && <Cargando texto="Cargando boletines…" />}
        {isError && !data && <ErrorConsulta texto="No se pudieron cargar los boletines" error={error} onReintentar={refetch} />}
        {data && (
          <>
            <p className="mb-3 text-sm text-muted" aria-live="polite">
              {data.paginacion.total} {data.paginacion.total === 1 ? 'boletín' : 'boletines'}
            </p>
            {boletines.length ? (
              <ul aria-label="Boletines" className={`flex flex-col gap-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
                {boletines.map((boletin) => (
                  <li key={boletin.id}>
                    <article
                      aria-labelledby={`boletin-${boletin.id}`}
                      className="flex flex-col gap-3 rounded-lg border border-borderSoft bg-white p-4 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase text-goldDark">{formatearPeriodo(boletin.periodo)}</p>
                        <h2 id={`boletin-${boletin.id}`} className="mt-1 break-words font-semibold text-ink">
                          {boletin.titulo}
                        </h2>
                        <p className="mt-1 flex items-start gap-1.5 text-sm text-charcoal">
                          <FileText className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
                          <span className="break-words">
                            {boletin.archivo.nombreOriginal} · {formatearTamano(boletin.archivo.tamanoBytes)}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Publicado el {formatearFecha(boletin.fechaPublicacion)} por {boletin.publicadoPor.nombreCompleto}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <a
                          href={boletin.archivo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Abrir el PDF de «${boletin.titulo}» (se abre en otra pestaña)`}
                          className={botonFila}
                        >
                          <ExternalLink className="size-3.5" aria-hidden="true" /> Abrir PDF
                        </a>
                        {editable && (
                          <>
                            <Link to={`/admin/boletines/${boletin.id}/editar`} aria-label={`Editar «${boletin.titulo}»`} className={botonFila}>
                              <Pencil className="size-3.5" aria-hidden="true" /> Editar
                            </Link>
                            <button type="button" onClick={() => setPorEliminar(boletin)} aria-label={`Eliminar «${boletin.titulo}»`} className={botonFila}>
                              <Trash2 className="size-3.5" aria-hidden="true" /> Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-borderSoft bg-white py-12 text-center text-muted">
                <Inbox className="size-10" aria-hidden="true" />
                <p>{filtros.anio ? 'No hay boletines de ese año.' : 'Todavía no hay boletines.'}</p>
              </div>
            )}
            <Paginacion paginacion={data.paginacion} nombre="Paginación de boletines" onCambiar={(pagina) => cambiar({ pagina })} />
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
          Deja de verse en el portal. El PDF no se borra: queda en la biblioteca multimedia, sin uso.
        </ConfirmarAccion>
      )}
    </section>
  );
}
