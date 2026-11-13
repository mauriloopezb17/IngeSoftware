import { useEffect, useEffectEvent, useId, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox, Pencil, Plus, Search, Trash2 } from 'lucide-react';

import ConfirmarAccion from '../componentes/ConfirmarAccion.jsx';
import { AvisoExito, AvisoSoloLectura, Cargando, ErrorConsulta } from '../componentes/EstadoConsulta.jsx';
import Paginacion from '../componentes/Paginacion.jsx';
import { formatearFecha } from '../multimedia/formato.js';
import { usePermisos } from '../permisos/usePermisos.js';
import { CLAVE_PROCLAMAS, eliminarProclama, listarProclamas, VISTAS } from './api.js';
import { estaPublicada, formatearDia, ordinal } from './fechas.js';

const estiloControl =
  'w-full rounded-md border border-borderSoft bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-goldDark';
const botonFila =
  'inline-flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-1.5 text-xs font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark';

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
    <div className="flex flex-1 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-muted">
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
          className={`${estiloControl} pl-9`}
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
      <article aria-labelledby={`proclama-${proclama.id}`} className="flex flex-col gap-3 rounded-lg border border-borderSoft bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {vigente ? (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">Vigente</span>
            ) : (
              <span className="rounded-full bg-borderSoft/60 px-2.5 py-0.5 text-xs font-semibold text-muted">
                {new Date(fechaMatrimonio) > new Date() ? 'Aún sin publicar' : 'Celebrada'}
              </span>
            )}
          </div>
          <h2 id={`proclama-${proclama.id}`} className="mt-2 break-words font-semibold text-ink">
            {nombres}
          </h2>
          <p className="mt-1 text-sm text-charcoal">Matrimonio: {formatearFecha(fechaMatrimonio)}</p>
          {publicaciones.length ? (
            <ul aria-label={`Publicaciones de ${nombres}`} className="mt-2 flex flex-wrap gap-2">
              {publicaciones.map((pub) => (
                <li
                  key={pub.numero}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    estaPublicada(pub) ? 'bg-goldPale text-goldDark' : 'bg-stone text-muted'
                  }`}
                >
                  {ordinal(pub.numero)} · {formatearDia(pub.fecha)}
                  {estaPublicada(pub) ? '' : ' (programada)'}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-muted">Sin publicaciones todavía.</p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            to={`/admin/proclamas/${proclama.id}/editar`}
            aria-label={`${editable ? 'Editar' : 'Ver'} «${nombres}»`}
            className={botonFila}
          >
            <Pencil className="size-3.5" aria-hidden="true" /> {editable ? 'Editar' : 'Ver'}
          </Link>
          {editable && (
            <button type="button" onClick={() => onEliminar(proclama)} aria-label={`Eliminar «${nombres}»`} className={botonFila}>
              <Trash2 className="size-3.5" aria-hidden="true" /> Eliminar
            </button>
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
  const ubicacion = useLocation();
  const [aviso, setAviso] = useState(ubicacion.state?.aviso ?? '');
  const [porEliminar, setPorEliminar] = useState(null);
  const idAnio = useId();

  const { data, isPending, isError, error, isPlaceholderData, refetch } = useQuery({
    queryKey: [...CLAVE_PROCLAMAS, 'lista', filtros],
    queryFn: ({ signal }) => listarProclamas(filtros, signal),
    placeholderData: keepPreviousData,
  });

  const eliminar = useMutation({
    mutationFn: (proclama) => eliminarProclama(proclama.id),
    onSuccess: (_, proclama) => {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_PROCLAMAS });
      setAviso(`Se eliminó la proclama de ${proclama.contrayente1} y ${proclama.contrayente2}.`);
      setPorEliminar(null);
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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-ink">Proclamas</h1>
          <p className="mt-2 text-muted">Proclamas matrimoniales y su historial de publicaciones.</p>
        </div>
        {editable && (
          <Link
            to="/admin/proclamas/nueva"
            className="flex items-center gap-2 rounded-md bg-gold px-4 py-2.5 font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark"
          >
            <Plus className="size-4" aria-hidden="true" /> Nueva proclama
          </Link>
        )}
      </header>

      {!editable && <AvisoSoloLectura>Tu rol puede consultar las proclamas, pero no modificarlas.</AvisoSoloLectura>}
      <AvisoExito>{aviso}</AvisoExito>

      <div className="mt-6 flex flex-col gap-4 rounded-lg border border-borderSoft bg-white p-4 lg:flex-row lg:items-end">
        <div role="group" aria-label="Mostrar proclamas" className="flex rounded-md border border-borderSoft p-0.5">
          {Object.entries(VISTAS).map(([clave, { etiqueta }]) => (
            <button
              key={clave}
              type="button"
              aria-pressed={filtros.vista === clave}
              onClick={() => cambiar({ vista: clave })}
              className={`flex-1 rounded px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-goldDark ${
                filtros.vista === clave ? 'bg-gold text-ink' : 'hover:bg-stone'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
        <Buscador valor={filtros.buscar} onBuscar={(buscar) => cambiar({ buscar })} />
        <div className="flex flex-col gap-1 lg:w-32">
          <label htmlFor={idAnio} className="text-xs font-semibold text-muted">
            Año del matrimonio
          </label>
          <input
            id={idAnio}
            type="number"
            inputMode="numeric"
            min="2000"
            max="2100"
            value={filtros.anio}
            onChange={(e) => cambiar({ anio: e.target.value })}
            className={estiloControl}
          />
        </div>
      </div>

      <div className="mt-6" aria-busy={isPending || isPlaceholderData}>
        {isPending && <Cargando texto="Cargando proclamas…" />}
        {isError && !data && <ErrorConsulta texto="No se pudieron cargar las proclamas" error={error} onReintentar={refetch} />}
        {data && (
          <>
            <p className="mb-3 text-sm text-muted" aria-live="polite">
              {data.paginacion.total} {data.paginacion.total === 1 ? 'proclama' : 'proclamas'}
            </p>
            {proclamas.length ? (
              <ul aria-label="Proclamas" className={`flex flex-col gap-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
                {proclamas.map((proclama) => (
                  <FilaProclama key={proclama.id} proclama={proclama} editable={editable} onEliminar={setPorEliminar} />
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-borderSoft bg-white py-12 text-center text-muted">
                <Inbox className="size-10" aria-hidden="true" />
                <p>No hay proclamas con estos filtros.</p>
              </div>
            )}
            <Paginacion paginacion={data.paginacion} nombre="Paginación de proclamas" onCambiar={(pagina) => cambiar({ pagina })} />
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
