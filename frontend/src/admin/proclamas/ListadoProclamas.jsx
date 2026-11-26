import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox, Pencil, Plus, Trash2 } from 'lucide-react';

import ConfirmarAccion from '../componentes/ConfirmarAccion.jsx';
import { formatearFecha } from '../multimedia/formato.js';
import { usePermisos } from '../permisos/usePermisos.js';
import {
  Aviso,
  Boton,
  BotonExportarCsv,
  CampoTexto,
  EncabezadoPantalla,
  Insignia,
  TablaListado,
  useFiltrosListado,
  useToast,
} from '../ui/index.js';
import { CLAVE_PROCLAMAS, eliminarProclama, listarProclamas, VISTAS } from './api.js';
import { estaPublicada, formatearDia, ordinal } from './fechas.js';
import PestanasProclamas from './PestanasProclamas.jsx';

export default function ListadoProclamas() {
  const { puede } = usePermisos();
  const editable = puede('proclamas.gestionar');
  const clienteConsultas = useQueryClient();
  const toast = useToast();
  const tituloRef = useRef(null);
  const [porEliminar, setPorEliminar] = useState(null);

  const configFiltros = useMemo(
    () => ({
      vista: { defecto: 'vigentes', validar: (v) => v in VISTAS },
      anio: { defecto: '', validar: (v) => /^\d{4}$/.test(v) },
    }),
    [],
  );

  const {
    valores,
    busqueda,
    setBusqueda,
    setPagina,
    actualizarFiltro,
    limpiarFiltros,
    hayFiltrosActivos,
    filtrosActivos,
  } = useFiltrosListado({
    filtros: configFiltros,
  });

  const { data, isPending, isError, error, isPlaceholderData, refetch } = useQuery({
    queryKey: [...CLAVE_PROCLAMAS, 'lista', filtrosActivos],
    queryFn: ({ signal }) => listarProclamas(filtrosActivos, signal),
    placeholderData: keepPreviousData,
  });

  const eliminar = useMutation({
    mutationFn: (proclama) => eliminarProclama(proclama.id),
    onSuccess: (_, proclama) => {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_PROCLAMAS });
      toast.exito(`Se eliminó la proclama de ${proclama.contrayente1} y ${proclama.contrayente2}.`);
      setPorEliminar(null);
      setTimeout(() => tituloRef.current?.focus(), 0);
    },
  });

  const proclamas = data?.datos ?? [];

  const columnas = [
    {
      id: 'contrayentes',
      encabezado: 'Contrayentes',
      render: (proclama) => {
        const nombres = `${proclama.contrayente1} y ${proclama.contrayente2}`;
        return (
          <div>
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              {proclama.vigente ? (
                <Insignia variante="publicado">Vigente</Insignia>
              ) : (
                <Insignia variante="archivado">
                  {new Date(proclama.fechaMatrimonio) > new Date() ? 'Aún sin publicar' : 'Celebrada'}
                </Insignia>
              )}
            </div>
            <p className="font-semibold text-ink">{nombres}</p>
            <p className="mt-1 text-xs text-muted">Matrimonio: {formatearFecha(proclama.fechaMatrimonio)}</p>
          </div>
        );
      },
    },
    {
      id: 'publicaciones',
      encabezado: 'Publicaciones',
      render: (proclama) => {
        const nombres = `${proclama.contrayente1} y ${proclama.contrayente2}`;
        return proclama.publicaciones.length ? (
          <ul aria-label={`Publicaciones de ${nombres}`} className="flex flex-wrap gap-2">
            {proclama.publicaciones.map((pub) => (
              <li key={pub.numero}>
                <Insignia variante={estaPublicada(pub) ? 'programado' : 'archivado'}>
                  {ordinal(pub.numero)} · {formatearDia(pub.fecha)}
                  {estaPublicada(pub) ? '' : ' (programada)'}
                </Insignia>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-xs text-muted">Sin publicaciones todavía.</span>
        );
      },
    },
    {
      id: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      claseCelda: 'text-right sm:w-px sm:whitespace-nowrap',
      render: (proclama) => {
        const nombres = `${proclama.contrayente1} y ${proclama.contrayente2}`;
        return (
          <div className="flex flex-wrap justify-end gap-2">
            <Boton
              como={Link}
              to={`/admin/proclamas/${proclama.id}/editar`}
              variante="secundario"
              tamano="sm"
              icono={Pencil}
              aria-label={`${editable ? 'Editar' : 'Ver'} «${nombres}»`}
            >
              {editable ? 'Editar' : 'Ver'}
            </Boton>
            {editable && (
              <Boton
                variante="secundario"
                tamano="sm"
                icono={Trash2}
                onClick={() => setPorEliminar(proclama)}
                aria-label={`Eliminar «${nombres}»`}
              >
                Eliminar
              </Boton>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <section className="mx-auto max-w-5xl">
      <EncabezadoPantalla
        titulo="Proclamas"
        descripcion="Proclamas matrimoniales y su historial de publicaciones."
        headingRef={tituloRef}
        acciones={
          <>
            <BotonExportarCsv
              recurso="proclamas"
              permiso="proclamas.exportar"
              filtros={filtrosActivos}
            />
            {editable && (
              <Boton como={Link} to="/admin/proclamas/nueva" variante="primario" icono={Plus}>
                Nueva proclama
              </Boton>
            )}
          </>
        }
      />

      <PestanasProclamas />

      {!editable && (
        <Aviso tipo="soloLectura" className="mt-4">
          <p>
            <strong className="font-semibold text-ink">Solo lectura.</strong>{' '}
            {puede('proclamas.detalle')
              ? 'Tu rol no puede crear ni eliminar proclamas, pero puedes abrir cada una para editar su página pública.'
              : 'Tu rol puede consultar las proclamas, pero no modificarlas.'}
          </p>
        </Aviso>
      )}

      <div className="mt-6">
        <TablaListado
          caption="Proclamas"
          columnas={columnas}
          datos={proclamas}
          paginacion={data?.paginacion}
          onCambiarPagina={setPagina}
          cargando={isPending}
          tenue={isPlaceholderData}
          error={isError && !data ? `No se pudieron cargar las proclamas: ${error.message}` : null}
          onReintentar={refetch}
          busqueda={busqueda}
          onCambiarBusqueda={setBusqueda}
          etiquetaBusqueda="Buscar por nombre"
          placeholderBusqueda="Nombre de un contrayente"
          filtrosExtra={
            <>
              <div role="group" aria-label="Mostrar proclamas" className="flex rounded-md border border-sand bg-panel p-0.5">
                {Object.entries(VISTAS).map(([clave, { etiqueta }]) => (
                  <button
                    key={clave}
                    type="button"
                    aria-pressed={valores.vista === clave}
                    onClick={() => actualizarFiltro('vista', clave)}
                    className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors duration-150 ease-salida focus-visible:outline-2 focus-visible:outline-ink motion-reduce:transition-none ${
                      valores.vista === clave ? 'bg-gold font-semibold text-ink' : 'text-ink hover:bg-white'
                    }`}
                  >
                    {etiqueta}
                  </button>
                ))}
              </div>
              <div className="w-36">
                <CampoTexto
                  etiqueta="Año del matrimonio"
                  type="number"
                  inputMode="numeric"
                  min="2000"
                  max="2100"
                  value={valores.anio}
                  onChange={(e) => actualizarFiltro('anio', e.target.value)}
                />
              </div>
            </>
          }
          hayFiltrosActivos={hayFiltrosActivos}
          onLimpiarFiltros={limpiarFiltros}
          vacio={{
            icono: Inbox,
            titulo: 'No hay proclamas con estos filtros.',
            descripcion: 'Ajusta el filtro de año o crea una proclama matrimonial.',
            accion:
              editable && (
                <Boton como={Link} to="/admin/proclamas/nueva" variante="primario" icono={Plus}>
                  Nueva proclama
                </Boton>
              ),
          }}
          vacioConFiltros={{
            icono: Inbox,
            titulo: 'No hay proclamas con estos filtros.',
            descripcion: 'Ajusta el filtro de año o crea una proclama matrimonial.',
          }}
        />
      </div>

      {porEliminar && (
        <ConfirmarAccion
          titulo={`¿Eliminar la proclama de ${porEliminar.contrayente1} y ${porEliminar.contrayente2}?`}
          pendiente={eliminar.isPending}
          error={eliminar.error}
          onConfirmar={() => eliminar.mutate(porEliminar)}
          onCancelar={() => {
            eliminar.reset();
            setPorEliminar(null);
          }}
        >
          Se elimina con todas sus publicaciones. Solo es posible si ninguna publicación llegó todavía a su fecha: el
          historial es público.
        </ConfirmarAccion>
      )}
    </section>
  );
}
