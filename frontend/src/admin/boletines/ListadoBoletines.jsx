import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FileText, Inbox, Pencil, Plus, Trash2 } from 'lucide-react';

import ConfirmarAccion from '../componentes/ConfirmarAccion.jsx';
import Paginacion from '../componentes/Paginacion.jsx';
import { useEnfocarAviso } from '../componentes/useEnfocarAviso.js';
import { formatearFecha, formatearTamano } from '../multimedia/formato.js';
import { usePermisos } from '../permisos/usePermisos.js';
import {
  Aviso,
  Boton,
  CampoTexto,
  EncabezadoPantalla,
  EsqueletoTarjetas,
  EstadoVacio,
  Insignia,
  useToast,
} from '../ui/index.js';
import { CLAVE_BOLETINES, eliminarBoletin, formatearPeriodo, listarBoletines } from './api.js';

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
  const toast = useToast();
  const [aviso, setAviso] = useState(ubicacion.state?.aviso ?? '');
  const avisoRef = useEnfocarAviso(aviso); // tras eliminar, el foco pasa al mensaje (la fila y su botón desaparecen)
  const [porEliminar, setPorEliminar] = useState(null);

  const { data, isPending, isError, error, isPlaceholderData, refetch } = useQuery({
    queryKey: [...CLAVE_BOLETINES, 'lista', filtros],
    queryFn: ({ signal }) => listarBoletines(filtros, signal),
    placeholderData: keepPreviousData,
  });

  const eliminar = useMutation({
    mutationFn: (boletin) => eliminarBoletin(boletin.id),
    onSuccess: (_, boletin) => {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_BOLETINES });
      const mensaje = `Se eliminó el boletín «${boletin.titulo}». Su PDF sigue en la biblioteca multimedia.`;
      setAviso(mensaje);
      toast.exito(mensaje);
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
      <EncabezadoPantalla
        titulo="Boletines"
        descripcion="Boletines parroquiales en PDF. Se publican directamente, sin revisión."
        acciones={
          editable && (
            <Boton como={Link} to="/admin/boletines/nuevo" variante="primario" icono={Plus}>
              Nuevo boletín
            </Boton>
          )
        }
      />

      {!editable && (
        <Aviso tipo="soloLectura" className="mt-4">
          <p>
            <strong className="font-semibold text-ink">Solo lectura.</strong> Tu rol puede consultar los boletines, pero no
            modificarlos.
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

      <div className="mt-6 rounded-lg border border-sand bg-white p-4 sm:w-60">
        <CampoTexto
          etiqueta="Año"
          type="number"
          inputMode="numeric"
          min="2000"
          max="2100"
          value={filtros.anio}
          onChange={(e) => cambiar({ anio: e.target.value })}
          placeholder="Todos"
        />
      </div>

      <div className="mt-6" aria-busy={isPending || isPlaceholderData}>
        {isPending && <EsqueletoTarjetas cantidad={3} columnas="grid-cols-1" etiqueta="Cargando boletines…" />}
        {isError && !data && (
          <Aviso
            tipo="error"
            accion={
              <Boton variante="secundario" tamano="sm" onClick={() => refetch()}>
                Reintentar
              </Boton>
            }
          >
            <p>No se pudieron cargar los boletines: {error.message}</p>
          </Aviso>
        )}
        {data && (
          <>
            <p className="mb-3 text-sm tabular-nums text-muted" aria-live="polite">
              {data.paginacion.total} {data.paginacion.total === 1 ? 'boletín' : 'boletines'}
            </p>
            {boletines.length ? (
              <ul aria-label="Boletines" className={`flex flex-col gap-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
                {boletines.map((boletin) => (
                  <li key={boletin.id}>
                    <article
                      aria-labelledby={`boletin-${boletin.id}`}
                      className="flex flex-col gap-3 rounded-lg border border-sand bg-white p-5 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0">
                        <Insignia variante="programado">{formatearPeriodo(boletin.periodo)}</Insignia>
                        <h2 id={`boletin-${boletin.id}`} className="mt-2 break-words text-base font-semibold text-ink">
                          {boletin.titulo}
                        </h2>
                        <p className="mt-1 flex items-start gap-1.5 text-sm text-ink">
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
                        <Boton
                          como="a"
                          href={boletin.archivo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          variante="secundario"
                          tamano="sm"
                          icono={ExternalLink}
                          aria-label={`Abrir el PDF de «${boletin.titulo}» (se abre en otra pestaña)`}
                        >
                          Abrir PDF
                        </Boton>
                        {editable && (
                          <>
                            <Boton
                              como={Link}
                              to={`/admin/boletines/${boletin.id}/editar`}
                              variante="secundario"
                              tamano="sm"
                              icono={Pencil}
                              aria-label={`Editar «${boletin.titulo}»`}
                            >
                              Editar
                            </Boton>
                            <Boton
                              variante="secundario"
                              tamano="sm"
                              icono={Trash2}
                              onClick={() => setPorEliminar(boletin)}
                              aria-label={`Eliminar «${boletin.titulo}»`}
                            >
                              Eliminar
                            </Boton>
                          </>
                        )}
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            ) : (
              <EstadoVacio
                icono={Inbox}
                titulo={filtros.anio ? 'No hay boletines de ese año.' : 'Todavía no hay boletines.'}
                descripcion="Sube y publica el primer boletín parroquial en PDF."
                accion={
                  editable && (
                    <Boton como={Link} to="/admin/boletines/nuevo" variante="primario" icono={Plus}>
                      Nuevo boletín
                    </Boton>
                  )
                }
              />
            )}
            <Paginacion
              paginacion={data.paginacion}
              nombre="Paginación de boletines"
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
          Deja de verse en el portal. El PDF no se borra: queda en la biblioteca multimedia, sin uso.
        </ConfirmarAccion>
      )}
    </section>
  );
}
