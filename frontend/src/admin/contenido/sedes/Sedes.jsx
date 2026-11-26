import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Inbox, Pencil, Plus } from 'lucide-react';

import { usePermisos } from '../../permisos/usePermisos.js';
import {
  Aviso,
  Boton,
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
import { CLAVE_SEDES, listarSedes, listarSedesPaginadas } from './api.js';
import FormularioNuevaSede from './FormularioNuevaSede.jsx';
import FormularioSede from './FormularioSede.jsx';

export default function Sedes() {
  const { puede } = usePermisos();
  const toast = useToast();
  const puedeGestionarSedes = puede('sedes.gestionar');
  const puedeEditar = puede('sede.editar') || puedeGestionarSedes;

  const [sedeSeleccionadaId, setSedeSeleccionadaId] = useState(null);
  const [creando, setCreando] = useState(false);

  const configFiltros = useMemo(
    () => ({
      tipo: { defecto: '', validar: (v) => v === 'PARROQUIA' || v === 'CAPILLA' },
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

  const catalogosQuery = useQuery({
    queryKey: CLAVE_CATALOGOS,
    queryFn: () => obtenerCatalogos(),
  });

  const sedes = puedeGestionarSedes
    ? (sedesListadoQuery.data?.datos ?? [])
    : (sedesPropiaQuery.data ?? []);
  const sedeActiva =
    sedes.find((s) => s.id === sedeSeleccionadaId) ?? sedes[0] ?? null;

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
          puedeGestionarSedes && (
            <Boton
              variante="primario"
              icono={Plus}
              onClick={() => setCreando(true)}
            >
              Nueva sede
            </Boton>
          )
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
          sedesExistentes={sedes}
          tiposSede={catalogosQuery.data?.tiposSede ?? []}
          onCreada={(nueva) => {
            setCreando(false);
            setSedeSeleccionadaId(nueva.id);
            toast.exito(`Se creó la sede «${nueva.nombre}».`);
          }}
          onCerrar={() => setCreando(false)}
        />
      )}
    </section>
  );
}
