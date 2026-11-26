import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FileText, Inbox, Pencil, Plus, Trash2 } from 'lucide-react';

import ConfirmarAccion from '../componentes/ConfirmarAccion.jsx';
import { formatearFecha, formatearTamano } from '../multimedia/formato.js';
import { usePermisos } from '../permisos/usePermisos.js';
import {
  Aviso,
  Boton,
  CampoTexto,
  EncabezadoPantalla,
  Insignia,
  TablaListado,
  useFiltrosListado,
  useToast,
} from '../ui/index.js';
import { CLAVE_BOLETINES, eliminarBoletin, formatearPeriodo, listarBoletines } from './api.js';

export default function ListadoBoletines() {
  const { puede } = usePermisos();
  const editable = puede('boletines.gestionar');
  const clienteConsultas = useQueryClient();
  const toast = useToast();
  const tituloRef = useRef(null);
  const [porEliminar, setPorEliminar] = useState(null);

  const configFiltros = useMemo(
    () => ({
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
    queryKey: [...CLAVE_BOLETINES, 'lista', filtrosActivos],
    queryFn: ({ signal }) => listarBoletines(filtrosActivos, signal),
    placeholderData: keepPreviousData,
  });

  const eliminar = useMutation({
    mutationFn: (boletin) => eliminarBoletin(boletin.id),
    onSuccess: (_, boletin) => {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_BOLETINES });
      toast.exito(`Se eliminó el boletín «${boletin.titulo}». Su PDF sigue en la biblioteca multimedia.`);
      setPorEliminar(null);
      setTimeout(() => tituloRef.current?.focus(), 0);
    },
  });

  const boletines = data?.datos ?? [];

  const columnas = [
    {
      id: 'boletin',
      encabezado: 'Boletín',
      render: (boletin) => (
        <div>
          <Insignia variante="programado">{formatearPeriodo(boletin.periodo)}</Insignia>
          <p className="mt-2 font-semibold text-ink">{boletin.titulo}</p>
          <p className="mt-1 text-xs text-muted">
            Publicado el {formatearFecha(boletin.fechaPublicacion)} por {boletin.publicadoPor.nombreCompleto}
          </p>
        </div>
      ),
    },
    {
      id: 'archivo',
      encabezado: 'Archivo PDF',
      render: (boletin) => (
        <p className="flex items-start gap-1.5 text-sm text-ink">
          <FileText className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
          <span className="break-words">
            {boletin.archivo.nombreOriginal} · {formatearTamano(boletin.archivo.tamanoBytes)}
          </span>
        </p>
      ),
    },
    {
      id: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      claseCelda: 'text-right sm:w-px sm:whitespace-nowrap',
      render: (boletin) => (
        <div className="flex flex-wrap justify-end gap-2">
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
      ),
    },
  ];

  return (
    <section className="mx-auto max-w-5xl">
      <EncabezadoPantalla
        titulo="Boletines"
        descripcion="Boletines parroquiales en PDF. Se publican directamente, sin revisión."
        headingRef={tituloRef}
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

      <div className="mt-6">
        <TablaListado
          caption="Boletines"
          columnas={columnas}
          datos={boletines}
          paginacion={data?.paginacion}
          onCambiarPagina={setPagina}
          cargando={isPending}
          tenue={isPlaceholderData}
          error={isError && !data ? `No se pudieron cargar los boletines: ${error.message}` : null}
          onReintentar={refetch}
          busqueda={busqueda}
          onCambiarBusqueda={setBusqueda}
          placeholderBusqueda="Título del boletín"
          filtrosExtra={
            <div className="w-48">
              <CampoTexto
                etiqueta="Año"
                type="number"
                inputMode="numeric"
                min="2000"
                max="2100"
                value={valores.anio}
                onChange={(e) => actualizarFiltro('anio', e.target.value)}
                placeholder="Todos"
              />
            </div>
          }
          hayFiltrosActivos={hayFiltrosActivos}
          onLimpiarFiltros={limpiarFiltros}
          vacio={{
            icono: Inbox,
            titulo: 'Todavía no hay boletines.',
            descripcion: 'Sube y publica el primer boletín parroquial en PDF.',
            accion:
              editable && (
                <Boton como={Link} to="/admin/boletines/nuevo" variante="primario" icono={Plus}>
                  Nuevo boletín
                </Boton>
              ),
          }}
          vacioConFiltros={{
            icono: Inbox,
            titulo: 'No hay boletines de ese año.',
            descripcion: 'Prueba quitando el filtro de año para ver todos los boletines.',
          }}
        />
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
