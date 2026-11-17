import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
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
import { Aviso, Boton, EncabezadoPantalla, EsqueletoTarjetas, EstadoVacio, useToast } from '../ui/index.js';

const ORDEN_INICIAL = '-fechaSubida';

// Los filtros viven en la URL (se conservan al recargar). Un valor desconocido se descarta.
function leerFiltros(parametros) {
  const clase = parametros.get('clase');
  const enUso = parametros.get('enUso');
  const orden = parametros.get('orden');
  const pagina = Number.parseInt(parametros.get('pagina'), 10);

  return {
    buscar: parametros.get('buscar')?.trim() ?? '',
    clase: clase in CLASES ? clase : '',
    enUso: enUso === 'true' || enUso === 'false' ? enUso : '',
    orden: orden in ORDENES ? orden : ORDEN_INICIAL,
    pagina: pagina >= 1 ? pagina : 1,
  };
}

export default function Multimedia() {
  const [parametros, setParametros] = useSearchParams();
  const filtros = leerFiltros(parametros);
  const consulta = useBiblioteca(filtros);
  const [abierto, setAbierto] = useState(null);
  const [aviso, setAviso] = useState('');
  const inicioRef = useRef(null);
  const { puede } = usePermisos();
  const toast = useToast();

  const hayFiltros = Boolean(filtros.buscar || filtros.clase || filtros.enUso || filtros.orden !== ORDEN_INICIAL);

  // Cambiar un filtro vuelve a la primera página.
  function cambiar(cambios) {
    const siguiente = { ...filtros, pagina: 1, ...cambios };
    const nuevos = new URLSearchParams();
    if (siguiente.buscar) nuevos.set('buscar', siguiente.buscar);
    if (siguiente.clase) nuevos.set('clase', siguiente.clase);
    if (siguiente.enUso) nuevos.set('enUso', siguiente.enUso);
    if (siguiente.orden !== ORDEN_INICIAL) nuevos.set('orden', siguiente.orden);
    if (siguiente.pagina > 1) nuevos.set('pagina', String(siguiente.pagina));
    setParametros(nuevos, { replace: true });
  }

  const { data, isPending, isError, error, isPlaceholderData, refetch } = consulta;
  const archivos = data?.datos ?? [];

  return (
    <section className="mx-auto max-w-6xl">
      <EncabezadoPantalla
        titulo="Multimedia"
        descripcion="Imágenes, videos y documentos de la sede."
        headingRef={inicioRef}
      />

      {aviso ? (
        <Aviso tipo="exito" className="mt-4">
          {aviso}
        </Aviso>
      ) : (
        <p role="status" className="sr-only" />
      )}

      {puede('multimedia.subir') && <SubidaArchivos />}

      <div className="mt-6 rounded-lg border border-sand bg-white p-4">
        <FiltrosMultimedia
          valores={filtros}
          hayFiltros={hayFiltros}
          onCambiar={cambiar}
          onLimpiar={() => setParametros(new URLSearchParams(), { replace: true })}
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
              {hayFiltros && ' con estos filtros'}
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
                    onAbrir={(a) => {
                      setAviso('');
                      setAbierto(a);
                    }}
                  />
                ))}
              </ul>
            ) : (
              <EstadoVacio
                icono={ImageOff}
                titulo={
                  hayFiltros
                    ? 'No hay archivos que coincidan con los filtros.'
                    : 'Todavía no hay archivos en la biblioteca.'
                }
                descripcion={
                  hayFiltros
                    ? 'Limpia los filtros para volver a ver toda la biblioteca.'
                    : 'Sube imágenes, videos o documentos PDF desde la zona superior.'
                }
                accion={
                  hayFiltros && (
                    <Boton
                      variante="primario"
                      onClick={() => setParametros(new URLSearchParams(), { replace: true })}
                    >
                      Quitar los filtros
                    </Boton>
                  )
                }
              />
            )}

            <Paginacion
              paginacion={{ ...data.paginacion, porPagina: POR_PAGINA }}
              onCambiar={(pagina) => cambiar({ pagina })}
              nombre="Paginación de la biblioteca"
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
            const mensaje = `Se eliminó «${eliminado.nombreOriginal}».`;
            setAviso(mensaje);
            toast.exito(mensaje);
            // La tarjeta desaparece: el foco pasa al inicio de la sección para no perderse.
            setTimeout(() => inicioRef.current?.focus(), 0);
          }}
        />
      )}
    </section>
  );
}
