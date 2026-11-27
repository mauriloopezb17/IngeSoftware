import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox, Pencil, Plus } from 'lucide-react';

import { usePermisos } from '../../permisos/usePermisos.js';
import {
  Aviso,
  Boton,
  BotonExportarCsv,
  CampoSelect,
  EncabezadoPantalla,
  EsqueletoFormulario,
  EstadoVacio,
  Insignia,
  TablaListado,
  useFiltrosListado,
  useToast,
} from '../../ui/index.js';
import { CLAVE_CATALOGOS, obtenerCatalogos } from '../horarios/api.js';
import {
  CLAVE_SEDES,
  listarSedes,
  listarSedesPaginadas,
  moverSede,
  obtenerArbolSedes,
} from './api.js';
import ArbolSedes from './ArbolSedes.jsx';
import DialogoMoverSede from './DialogoMoverSede.jsx';
import FormularioNuevaSede from './FormularioNuevaSede.jsx';
import FormularioSede from './FormularioSede.jsx';

const TIPOS_VALIDOS = new Set([
  'PARROQUIA',
  'CAPILLA',
  'COMUNIDAD',
  'COMUNIDAD_PASIONISTA',
]);

function aplanarArbol(arbol) {
  if (!arbol) return [];
  const lista = [];
  for (const parroquia of arbol.parroquias ?? []) {
    lista.push(parroquia);
    for (const capilla of parroquia.capillas ?? []) {
      lista.push(capilla);
      for (const comunidad of capilla.comunidades ?? []) {
        lista.push(comunidad);
      }
    }
    for (const comunidad of parroquia.comunidades ?? []) {
      lista.push(comunidad);
    }
  }
  for (const pasionista of arbol.comunidadesPasionistas ?? []) {
    lista.push(pasionista);
  }
  return lista;
}

export default function Sedes() {
  const { puede } = usePermisos();
  const toast = useToast();
  const queryClient = useQueryClient();
  const puedeGestionarSedes = puede('sedes.gestionar');
  const puedeEditar = puede('sede.editar') || puedeGestionarSedes;

  const [vista, setVista] = useState('listado');
  const [sedeSeleccionadaId, setSedeSeleccionadaId] = useState(null);
  const [creando, setCreando] = useState(false);
  const [sedeParaMover, setSedeParaMover] = useState(null);
  const [moviendoId, setMoviendoId] = useState(null);

  const configFiltros = useMemo(
    () => ({
      tipo: { defecto: '', validar: (v) => TIPOS_VALIDOS.has(v) },
      activo: { defecto: '', validar: (v) => v === 'true' || v === 'false' },
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
    porPagina: 15,
  });

  const sedesListadoQuery = useQuery({
    queryKey: [...CLAVE_SEDES, 'lista', filtrosActivos],
    queryFn: ({ signal }) => listarSedesPaginadas(filtrosActivos, signal),
    placeholderData: keepPreviousData,
    enabled: puedeGestionarSedes,
  });

  const sedesPropiaQuery = useQuery({
    queryKey: CLAVE_SEDES,
    queryFn: () => listarSedes(),
    enabled: !puedeGestionarSedes,
  });

  const sedesArbolQuery = useQuery({
    queryKey: [...CLAVE_SEDES, 'arbol'],
    queryFn: () => obtenerArbolSedes(),
    enabled: puedeGestionarSedes,
  });

  const catalogosQuery = useQuery({
    queryKey: CLAVE_CATALOGOS,
    queryFn: () => obtenerCatalogos(),
  });

  const sedes = useMemo(
    () =>
      puedeGestionarSedes
        ? (sedesListadoQuery.data?.datos ?? [])
        : (sedesPropiaQuery.data ?? []),
    [puedeGestionarSedes, sedesListadoQuery.data?.datos, sedesPropiaQuery.data],
  );
  const sedesParaPadres = useMemo(() => {
    const delArbol = aplanarArbol(sedesArbolQuery.data);
    return delArbol.length > 0 ? delArbol : sedes;
  }, [sedesArbolQuery.data, sedes]);
  const sedeActiva =
    sedesParaPadres.find((s) => s.id === sedeSeleccionadaId) ??
    sedes.find((s) => s.id === sedeSeleccionadaId) ??
    sedes[0] ??
    null;

  async function reordenarHermanas(hermanas, indiceActual, indiceDestino) {
    if (indiceDestino < 0 || indiceDestino >= hermanas.length) return;
    const reordenadas = [...hermanas];
    const [movida] = reordenadas.splice(indiceActual, 1);
    reordenadas.splice(indiceDestino, 0, movida);

    setMoviendoId(movida.id);
    try {
      await Promise.all(
        reordenadas.map((s, orden) =>
          moverSede(s.id, { sedePadreId: s.sedePadre?.id ?? null, orden }),
        ),
      );
      await queryClient.invalidateQueries({ queryKey: CLAVE_SEDES });
      toast.exito(`Se actualizó el orden de «${movida.nombre}».`);
    } catch (err) {
      toast.error(err?.message || 'No se pudo actualizar el orden.');
    } finally {
      setMoviendoId(null);
    }
  }

  const columnas = [
    {
      id: 'sede',
      encabezado: 'Sede',
      render: (sede) => (
        <div>
          <p className="font-semibold text-ink">{sede.nombre}</p>
          <p className="mt-0.5 text-xs text-muted">/{sede.slug}</p>
        </div>
      ),
    },
    {
      id: 'tipo',
      encabezado: 'Tipo',
      render: (sede) => sede.tipo?.nombre ?? '—',
    },
    {
      id: 'estado',
      encabezado: 'Estado',
      render: (sede) => (
        <Insignia variante={sede.activo === false ? 'archivado' : 'publicado'}>
          {sede.activo === false ? 'Inactiva' : 'Activa'}
        </Insignia>
      ),
    },
    {
      id: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      claseCelda: 'text-right sm:w-px sm:whitespace-nowrap',
      render: (sede) => (
        <Boton
          variante={sedeActiva?.id === sede.id ? 'primario' : 'secundario'}
          tamano="sm"
          icono={Pencil}
          onClick={() => setSedeSeleccionadaId(sede.id)}
          aria-label={`Editar «${sede.nombre}»`}
        >
          {sedeActiva?.id === sede.id ? 'Editando' : 'Editar'}
        </Boton>
      ),
    },
  ];

  const cargandoSedes = puedeGestionarSedes
    ? sedesListadoQuery.isPending
    : sedesPropiaQuery.isPending;
  const errorSedes = puedeGestionarSedes
    ? sedesListadoQuery.error
    : sedesPropiaQuery.error;
  const reintentarSedes = puedeGestionarSedes
    ? sedesListadoQuery.refetch
    : sedesPropiaQuery.refetch;

  return (
    <section className="mx-auto max-w-5xl">
      <EncabezadoPantalla
        titulo={puedeGestionarSedes ? 'Sedes y redes sociales' : 'Datos de la sede'}
        descripcion="Información institucional, contacto, configuración del portal y redes sociales."
        acciones={
          <>
            <BotonExportarCsv
              recurso="sedes"
              permiso="sedes.exportar"
              filtros={filtrosActivos}
            />
            {puedeGestionarSedes && (
              <Boton
                variante="primario"
                icono={Plus}
                onClick={() => setCreando(true)}
              >
                Nueva sede
              </Boton>
            )}
          </>
        }
      />

      {!puedeEditar && (
        <Aviso tipo="soloLectura" className="mt-4">
          <p>
            <strong className="font-semibold text-ink">Solo lectura:</strong> tu rol puede consultar los datos de la
            sede, pero no realizar cambios.
          </p>
        </Aviso>
      )}

      {puedeGestionarSedes && (
        <div role="tablist" aria-label="Vista de sedes" className="mt-6 flex gap-2 border-b border-sand">
          <button
            type="button"
            role="tab"
            aria-selected={vista === 'listado'}
            onClick={() => setVista('listado')}
            className={`min-h-11 border-b-2 px-4 text-sm font-semibold transition-colors ${
              vista === 'listado'
                ? 'border-gold text-ink'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Listado
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={vista === 'jerarquia'}
            onClick={() => setVista('jerarquia')}
            className={`min-h-11 border-b-2 px-4 text-sm font-semibold transition-colors ${
              vista === 'jerarquia'
                ? 'border-gold text-ink'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Jerarquía
          </button>
        </div>
      )}

      {puedeGestionarSedes && vista === 'listado' && (
        <div className="mt-6">
          <TablaListado
            caption="Sedes"
            nombrePaginacion="Paginación de sedes"
            columnas={columnas}
            datos={sedes}
            paginacion={sedesListadoQuery.data?.paginacion}
            onCambiarPagina={setPagina}
            cargando={sedesListadoQuery.isPending}
            tenue={sedesListadoQuery.isPlaceholderData}
            error={
              sedesListadoQuery.isError
                ? sedesListadoQuery.error?.message || 'No se pudieron cargar las sedes.'
                : null
            }
            onReintentar={sedesListadoQuery.refetch}
            busqueda={busqueda}
            onCambiarBusqueda={setBusqueda}
            placeholderBusqueda="Nombre o dirección"
            filtrosExtra={
              <>
                <div className="min-w-[150px]">
                  <CampoSelect
                    etiqueta="Tipo"
                    value={valores.tipo}
                    onChange={(e) => actualizarFiltro('tipo', e.target.value)}
                  >
                    <option value="">Todos los tipos</option>
                    <option value="PARROQUIA">Parroquia</option>
                    <option value="CAPILLA">Capilla</option>
                    <option value="COMUNIDAD">Comunidad</option>
                    <option value="COMUNIDAD_PASIONISTA">Comunidad pasionista</option>
                  </CampoSelect>
                </div>
                <div className="min-w-[140px]">
                  <CampoSelect
                    etiqueta="Estado"
                    value={valores.activo}
                    onChange={(e) => actualizarFiltro('activo', e.target.value)}
                  >
                    <option value="">Todas</option>
                    <option value="true">Activas</option>
                    <option value="false">Inactivas</option>
                  </CampoSelect>
                </div>
              </>
            }
            hayFiltrosActivos={hayFiltrosActivos}
            onLimpiarFiltros={limpiarFiltros}
            vacio={{
              icono: Inbox,
              titulo: 'No se encontraron sedes.',
            }}
            vacioConFiltros={{
              icono: Inbox,
              titulo: 'No se encontraron sedes con estos filtros.',
            }}
          />
        </div>
      )}

      {puedeGestionarSedes && vista === 'jerarquia' && (
        <div className="mt-6" aria-busy={sedesArbolQuery.isPending}>
          {sedesArbolQuery.isPending ? (
            <EsqueletoFormulario campos={4} etiqueta="Cargando jerarquía de sedes…" />
          ) : sedesArbolQuery.isError ? (
            <Aviso
              tipo="error"
              accion={
                <Boton variante="secundario" tamano="sm" onClick={() => sedesArbolQuery.refetch()}>
                  Reintentar
                </Boton>
              }
            >
              <p>{sedesArbolQuery.error?.message || 'No se pudo cargar la jerarquía de sedes.'}</p>
            </Aviso>
          ) : (
            <ArbolSedes
              arbol={sedesArbolQuery.data}
              sedeActivaId={sedeActiva?.id ?? null}
              puedeGestionarSedes={puedeGestionarSedes}
              moviendoId={moviendoId}
              onReordenar={reordenarHermanas}
              onMover={(sede) => setSedeParaMover(sede)}
              onEditar={(id) => setSedeSeleccionadaId(id)}
            />
          )}
        </div>
      )}

      {puedeGestionarSedes && sedes.length > 1 && (
        <div className="mt-6 rounded-lg border border-sand bg-white p-4 sm:max-w-md">
          <CampoSelect
            etiqueta="Sede a editar"
            value={sedeActiva?.id ?? ''}
            onChange={(e) => setSedeSeleccionadaId(Number(e.target.value))}
          >
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </CampoSelect>
        </div>
      )}

      <div className="mt-6" aria-busy={cargandoSedes}>
        {!puedeGestionarSedes && cargandoSedes && (
          <EsqueletoFormulario campos={5} etiqueta="Cargando datos de la sede…" />
        )}

        {!puedeGestionarSedes && errorSedes && (
          <Aviso
            tipo="error"
            accion={
              <Boton variante="secundario" tamano="sm" onClick={() => reintentarSedes()}>
                Reintentar
              </Boton>
            }
          >
            <p>{errorSedes.message || 'No se pudieron cargar los datos.'}</p>
          </Aviso>
        )}

        {!puedeGestionarSedes && !cargandoSedes && !errorSedes && !sedeActiva && (
          <EstadoVacio icono={Inbox} titulo="No se encontraron sedes." />
        )}

        {sedeActiva && (
          <FormularioSede
            key={sedeActiva.id}
            sede={sedeActiva}
            catalogoRedes={catalogosQuery.data?.redesSociales ?? []}
            puedeEditar={puedeEditar}
            puedeGestionarSedes={puedeGestionarSedes}
            onGuardado={(actualizada) => {
              toast.exito(`Se guardaron los cambios de «${actualizada.nombre}».`);
            }}
          />
        )}
      </div>

      {creando && (
        <FormularioNuevaSede
          sedesExistentes={sedesParaPadres}
          tiposSede={catalogosQuery.data?.tiposSede ?? []}
          onCreada={(nueva) => {
            setCreando(false);
            setSedeSeleccionadaId(nueva.id);
            toast.exito(`Se creó la sede «${nueva.nombre}».`);
          }}
          onCerrar={() => setCreando(false)}
        />
      )}

      {sedeParaMover && (
        <DialogoMoverSede
          sede={sedeParaMover}
          sedesExistentes={sedesParaPadres}
          onMovida={(actualizada) => {
            setSedeParaMover(null);
            toast.exito(`Se actualizó la ubicación de «${actualizada.nombre}».`);
          }}
          onCerrar={() => setSedeParaMover(null)}
        />
      )}
    </section>
  );
}
