import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox, Pencil, Plus, Search, Trash2 } from 'lucide-react';

import ConfirmarAccion from '../componentes/ConfirmarAccion.jsx';
import Paginacion from '../componentes/Paginacion.jsx';
import { formatearFecha } from '../multimedia/formato.js';
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
import { CLAVE_PROCLAMAS, eliminarProclama, listarProclamas, VISTAS } from './api.js';
import { estaPublicada, formatearDia, ordinal } from './fechas.js';

function leerFiltros(parametros) {
  const vista = parametros.get('vista');
  const anio = parametros.get('anio') ?? '';
  const pagina = Number.parseInt(parametros.get('pagina'), 10);
  return {
    vista: vista in VISTAS ? vista : 'vigentes',
    buscar: parametros.get('buscar')?.trim() ?? '',
    anio: /^\d{4}$/.test(anio) ? anio : '',
    pagina: pagina >= 1 ? pagina : 1,
  };
}

function Buscador({ valor, onBuscar }) {
  const id = useId();
  const [texto, setTexto] = useState(valor);
  const aplicar = useEffectEvent(onBuscar);

  useEffect(() => {
    const buscar = texto.trim();
    if (buscar === valor) return undefined;
    const t = setTimeout(() => aplicar(buscar), 400);
    return () => clearTimeout(t);
  }, [texto, valor]);

  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        Buscar por nombre
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          id={id}
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Nombre de un contrayente"
          className="min-h-11 w-full rounded-md border border-sand bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted/75 transition-colors duration-150 ease-salida focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
        />
      </div>
    </div>
  );
}

function FilaProclama({ proclama, editable, onEliminar }) {
  const { contrayente1, contrayente2, fechaMatrimonio, publicaciones, vigente } = proclama;
  const nombres = `${contrayente1} y ${contrayente2}`;
  return (
    <li>
      <article
        aria-labelledby={`proclama-${proclama.id}`}
        className="flex flex-col gap-3 rounded-lg border border-sand bg-white p-5 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {vigente ? (
              <Insignia variante="publicado">Vigente</Insignia>
            ) : (
              <Insignia variante="archivado">
                {new Date(fechaMatrimonio) > new Date() ? 'Aún sin publicar' : 'Celebrada'}
              </Insignia>
            )}
          </div>
          <h2 id={`proclama-${proclama.id}`} className="mt-2.5 break-words text-base font-semibold text-ink">
            {nombres}
          </h2>
          <p className="mt-1 text-sm text-ink">Matrimonio: {formatearFecha(fechaMatrimonio)}</p>
          {publicaciones.length ? (
            <ul aria-label={`Publicaciones de ${nombres}`} className="mt-2.5 flex flex-wrap gap-2">
              {publicaciones.map((pub) => (
                <li key={pub.numero}>
                  <Insignia variante={estaPublicada(pub) ? 'programado' : 'archivado'}>
                    {ordinal(pub.numero)} · {formatearDia(pub.fecha)}
                    {estaPublicada(pub) ? '' : ' (programada)'}
                  </Insignia>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-muted">Sin publicaciones todavía.</p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
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
              onClick={() => onEliminar(proclama)}
              aria-label={`Eliminar «${nombres}»`}
            >
              Eliminar
            </Boton>
          )}
        </div>
      </article>
    </li>
  );
}

export default function ListadoProclamas() {
  const [parametros, setParametros] = useSearchParams();
  const filtros = leerFiltros(parametros);
  const { puede } = usePermisos();
  const editable = puede('proclamas.gestionar');
  const clienteConsultas = useQueryClient();
  const toast = useToast();
  const tituloRef = useRef(null);
  const [porEliminar, setPorEliminar] = useState(null);

  const { data, isPending, isError, error, isPlaceholderData, refetch } = useQuery({
    queryKey: [...CLAVE_PROCLAMAS, 'lista', filtros],
    queryFn: ({ signal }) => listarProclamas(filtros, signal),
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

  function cambiar(cambios) {
    const siguiente = { ...filtros, pagina: 1, ...cambios };
    const nuevos = new URLSearchParams();
    if (siguiente.vista !== 'vigentes') nuevos.set('vista', siguiente.vista);
    if (siguiente.buscar) nuevos.set('buscar', siguiente.buscar);
    if (siguiente.anio) nuevos.set('anio', siguiente.anio);
    if (siguiente.pagina > 1) nuevos.set('pagina', String(siguiente.pagina));
    setParametros(nuevos, { replace: true });
  }

  const proclamas = data?.datos ?? [];

  return (
    <section className="mx-auto max-w-5xl">
      <EncabezadoPantalla
        titulo="Proclamas"
        descripcion="Proclamas matrimoniales y su historial de publicaciones."
        headingRef={tituloRef}
        acciones={
          editable && (
            <Boton como={Link} to="/admin/proclamas/nueva" variante="primario" icono={Plus}>
              Nueva proclama
            </Boton>
          )
        }
      />

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

      <div className="mt-6 flex flex-col gap-4 rounded-lg border border-sand bg-white p-4 lg:flex-row lg:items-end">
        <div role="group" aria-label="Mostrar proclamas" className="flex rounded-md border border-sand bg-panel p-0.5">
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
        <Buscador valor={filtros.buscar} onBuscar={(buscar) => cambiar({ buscar })} />
        <div className="lg:w-36">
          <CampoTexto
            etiqueta="Año del matrimonio"
            type="number"
            inputMode="numeric"
            min="2000"
            max="2100"
            value={filtros.anio}
            onChange={(e) => cambiar({ anio: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-6" aria-busy={isPending || isPlaceholderData}>
        {isPending && <EsqueletoTarjetas cantidad={3} columnas="grid-cols-1" etiqueta="Cargando proclamas…" />}
        {isError && !data && (
          <Aviso
            tipo="error"
            accion={
              <Boton variante="secundario" tamano="sm" onClick={() => refetch()}>
                Reintentar
              </Boton>
            }
          >
            <p>No se pudieron cargar las proclamas: {error.message}</p>
          </Aviso>
        )}
        {data && (
          <>
            <p className="mb-3 text-sm tabular-nums text-muted" aria-live="polite">
              {data.paginacion.total} {data.paginacion.total === 1 ? 'proclama' : 'proclamas'}
            </p>
            {proclamas.length ? (
              <ul aria-label="Proclamas" className={`flex flex-col gap-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
                {proclamas.map((proclama) => (
                  <FilaProclama key={proclama.id} proclama={proclama} editable={editable} onEliminar={setPorEliminar} />
                ))}
              </ul>
            ) : (
              <EstadoVacio
                icono={Inbox}
                titulo="No hay proclamas con estos filtros."
                descripcion="Ajusta el filtro de año o crea una proclama matrimonial."
                accion={
                  editable && (
                    <Boton como={Link} to="/admin/proclamas/nueva" variante="primario" icono={Plus}>
                      Nueva proclama
                    </Boton>
                  )
                }
              />
            )}
            <Paginacion
              paginacion={data.paginacion}
              nombre="Paginación de proclamas"
              onCambiar={(pagina) => cambiar({ pagina })}
            />
          </>
        )}
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
