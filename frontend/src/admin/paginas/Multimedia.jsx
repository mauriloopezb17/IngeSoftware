import { useMemo, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';

import Paginacion from '../componentes/Paginacion.jsx';
import { ORDENES, POR_PAGINA } from '../multimedia/api.js';
import FiltrosMultimedia from '../multimedia/FiltrosMultimedia.jsx';
import { contarArchivos } from '../multimedia/formato.js';
import SubidaArchivos from '../multimedia/SubidaArchivos.jsx';
import TarjetaArchivo from '../multimedia/TarjetaArchivo.jsx';
import { CLASES } from '../multimedia/tipos.js';
import { useBiblioteca } from '../multimedia/useBiblioteca.js';
import VistaPreviaArchivo from '../multimedia/VistaPreviaArchivo.jsx';
import { usePermisos } from '../permisos/usePermisos.js';
import {
  Aviso,
  Boton,
  BotonExportarCsv,
  EncabezadoPantalla,
  EsqueletoTarjetas,
  EstadoVacio,
  useFiltrosListado,
  useToast,
} from '../ui/index.js';

const ORDEN_INICIAL = '-fechaSubida';

export default function Multimedia() {
  const configFiltros = useMemo(
    () => ({
      buscar: { defecto: '' },
      clase: { defecto: '', validar: (v) => v in CLASES },
      enUso: { defecto: '', validar: (v) => v === 'true' || v === 'false' },
    }),
    [],
  );

  const {
    valores,
    orden,
    setOrden,
    setPagina,
    actualizarFiltros,
    limpiarFiltros,
    hayFiltrosActivos,
    filtrosActivos,
  } = useFiltrosListado({
    filtros: configFiltros,
    ordenDefecto: ORDEN_INICIAL,
    ordenesValidos: Object.keys(ORDENES),
    porPagina: POR_PAGINA,
    conBusqueda: false,
  });

  const consulta = useBiblioteca(filtrosActivos);
  const [abierto, setAbierto] = useState(null);
  const inicioRef = useRef(null);
  const { puede } = usePermisos();
  const toast = useToast();

  const filtrosVista = useMemo(
    () => ({
      buscar: filtrosActivos.buscar ?? '',
      clase: valores.clase,
      enUso: valores.enUso,
      orden,
      pagina: filtrosActivos.pagina,
    }),
    [filtrosActivos.buscar, filtrosActivos.pagina, valores.clase, valores.enUso, orden],
  );

  function cambiar(cambios) {
    if ('orden' in cambios) {
      setOrden(cambios.orden);
      return;
    }
    actualizarFiltros(cambios);
  }

  const { data, isPending, isError, error, isPlaceholderData, refetch } = consulta;
  const archivos = data?.datos ?? [];

  return (
    <section className="mx-auto max-w-6xl">
      <EncabezadoPantalla
        titulo="Multimedia"
        descripcion="Imágenes, videos y documentos de la sede."
        headingRef={inicioRef}
        acciones={
          <BotonExportarCsv
            recurso="multimedia"
            permiso="multimedia.exportar"
            filtros={filtrosActivos}
          />
        }
      />

      {puede('multimedia.subir') && <SubidaArchivos />}

      <div className="mt-6 rounded-lg border border-sand bg-white p-4">
        <FiltrosMultimedia
          valores={filtrosVista}
          hayFiltros={hayFiltrosActivos}
          onCambiar={cambiar}
          onLimpiar={limpiarFiltros}
        />
      </div>

      <div className="mt-6" aria-busy={isPending || isPlaceholderData}>
        {isPending && (
          <EsqueletoTarjetas cantidad={4} columnas="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" etiqueta="Cargando archivos…" />
        )}

        {isError && !data && (
          <Aviso
            tipo="error"
            accion={
              <Boton variante="secundario" tamano="sm" onClick={() => refetch()}>
                Reintentar
              </Boton>
            }
          >
            <p>No se pudo cargar la biblioteca: {error.message}</p>
          </Aviso>
        )}

        {data && (
          <>
            <p className="mb-3 text-sm tabular-nums text-muted" aria-live="polite">
              {contarArchivos(data.paginacion.total)}
              {hayFiltrosActivos && ' con estos filtros'}
            </p>

            {archivos.length ? (
              <ul
                className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 ${isPlaceholderData ? 'opacity-60' : ''}`}
                aria-label="Archivos"
              >
                {archivos.map((archivo) => (
                  <TarjetaArchivo
                    key={archivo.id}
                    archivo={archivo}
                    onAbrir={(a) => setAbierto(a)}
                  />
                ))}
              </ul>
            ) : (
              <EstadoVacio
                icono={ImageOff}
                titulo={
                  hayFiltrosActivos
                    ? 'No hay archivos que coincidan con los filtros.'
                    : 'Todavía no hay archivos en la biblioteca.'
                }
                descripcion={
                  hayFiltrosActivos
                    ? 'Prueba quitar alguno de los filtros o buscar con otro término.'
                    : 'Sube una imagen, un video o un PDF para empezar a usarlos en el portal.'
                }
                accion={
                  hayFiltrosActivos && (
                    <Boton variante="primario" onClick={limpiarFiltros}>
                      Quitar los filtros
                    </Boton>
                  )
                }
              />
            )}

            <Paginacion
              paginacion={data.paginacion}
              nombre="Paginación de la biblioteca"
              onCambiar={(pagina) => {
                setPagina(pagina);
                setTimeout(() => inicioRef.current?.focus(), 0);
              }}
            />
          </>
        )}
      </div>

      {abierto && (
        <VistaPreviaArchivo
          archivo={abierto}
          onCerrar={() => setAbierto(null)}
          onCambio={setAbierto}
          onEliminado={(eliminado) => {
            setAbierto(null);
            toast.exito(`Se eliminó «${eliminado.nombreOriginal}».`);
            setTimeout(() => inicioRef.current?.focus(), 0);
          }}
        />
      )}
    </section>
  );
}
