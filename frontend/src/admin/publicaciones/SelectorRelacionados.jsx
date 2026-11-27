import { useId, useState } from 'react';
import { Search, X } from 'lucide-react';

const MAX_POR_TIPO = 10;

const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/**
 * Selector múltiple accesible con búsqueda y chips para relacionar noticias
 * con sacramentos/servicios y grupos pastorales de la sede.
 */
export default function SelectorRelacionados({
  servicios = [],
  grupos = [],
  serviciosSeleccionados = [],
  gruposSeleccionados = [],
  alCambiarServicios,
  alCambiarGrupos,
  cargando = false,
}) {
  const buscadorId = useId();
  const [busqueda, setBusqueda] = useState('');

  const idsServicios = new Set(serviciosSeleccionados.map((s) => s.id));
  const idsGrupos = new Set(gruposSeleccionados.map((g) => g.id));

  const termino = normalizar(busqueda.trim());
  const filtrar = (lista) =>
    termino ? lista.filter((item) => normalizar(item.nombre).includes(termino)) : lista;

  const serviciosFiltrados = filtrar(servicios);
  const gruposFiltrados = filtrar(grupos);

  const alternar = (item, seleccionados, ids, alCambiar) => {
    if (ids.has(item.id)) {
      alCambiar(seleccionados.filter((s) => s.id !== item.id));
      return;
    }
    if (seleccionados.length >= MAX_POR_TIPO) return;
    alCambiar([...seleccionados, { id: item.id, slug: item.slug, nombre: item.nombre }]);
  };

  return (
    <div className="flex flex-col gap-3">
      {(serviciosSeleccionados.length > 0 || gruposSeleccionados.length > 0) && (
        <ul className="flex flex-wrap gap-2" aria-label="Elementos relacionados seleccionados">
          {serviciosSeleccionados.map((servicio) => (
            <li key={`servicio-${servicio.id}`}>
              <button
                type="button"
                onClick={() =>
                  alCambiarServicios(serviciosSeleccionados.filter((s) => s.id !== servicio.id))
                }
                aria-label={`Quitar ${servicio.nombre}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-sand bg-panel px-3 py-1.5 text-sm font-medium text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <span className="text-xs text-muted">Sacramento:</span>
                <span>{servicio.nombre}</span>
                <X className="size-3.5 text-muted" aria-hidden="true" />
              </button>
            </li>
          ))}
          {gruposSeleccionados.map((grupo) => (
            <li key={`grupo-${grupo.id}`}>
              <button
                type="button"
                onClick={() =>
                  alCambiarGrupos(gruposSeleccionados.filter((g) => g.id !== grupo.id))
                }
                aria-label={`Quitar ${grupo.nombre}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-sand bg-panel px-3 py-1.5 text-sm font-medium text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <span className="text-xs text-muted">Grupo:</span>
                <span>{grupo.nombre}</span>
                <X className="size-3.5 text-muted" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <label htmlFor={buscadorId} className="sr-only">
          Buscar sacramento o grupo
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          id={buscadorId}
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar sacramento o grupo…"
          className="min-h-11 w-full rounded-md border border-sand bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        />
      </div>

      {cargando ? (
        <p className="text-sm text-muted">Cargando sacramentos y grupos…</p>
      ) : serviciosFiltrados.length === 0 && gruposFiltrados.length === 0 ? (
        <p className="rounded-md border border-sand bg-panel px-3 py-3 text-sm text-muted">
          {termino
            ? 'No hay sacramentos ni grupos que coincidan con la búsqueda.'
            : 'No hay sacramentos ni grupos disponibles en esta sede.'}
        </p>
      ) : (
        <div className="grid max-h-56 gap-4 overflow-y-auto rounded-md border border-sand bg-panel p-3 sm:grid-cols-2">
          <div role="group" aria-label="Sacramentos y servicios">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              Sacramentos y servicios ({serviciosSeleccionados.length}/{MAX_POR_TIPO})
            </p>
            {serviciosFiltrados.length === 0 ? (
              <p className="text-xs text-muted">Sin coincidencias.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {serviciosFiltrados.map((servicio) => {
                  const marcado = idsServicios.has(servicio.id);
                  const deshabilitado = !marcado && serviciosSeleccionados.length >= MAX_POR_TIPO;
                  return (
                    <label
                      key={servicio.id}
                      className={`flex min-h-11 cursor-pointer items-center gap-2 rounded px-2 text-sm text-ink hover:bg-white ${
                        deshabilitado ? 'cursor-not-allowed opacity-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        disabled={deshabilitado}
                        onChange={() =>
                          alternar(servicio, serviciosSeleccionados, idsServicios, alCambiarServicios)
                        }
                        className="size-4 accent-ink"
                      />
                      <span>{servicio.nombre}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div role="group" aria-label="Grupos pastorales">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              Grupos pastorales ({gruposSeleccionados.length}/{MAX_POR_TIPO})
            </p>
            {gruposFiltrados.length === 0 ? (
              <p className="text-xs text-muted">Sin coincidencias.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {gruposFiltrados.map((grupo) => {
                  const marcado = idsGrupos.has(grupo.id);
                  const deshabilitado = !marcado && gruposSeleccionados.length >= MAX_POR_TIPO;
                  return (
                    <label
                      key={grupo.id}
                      className={`flex min-h-11 cursor-pointer items-center gap-2 rounded px-2 text-sm text-ink hover:bg-white ${
                        deshabilitado ? 'cursor-not-allowed opacity-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        disabled={deshabilitado}
                        onChange={() =>
                          alternar(grupo, gruposSeleccionados, idsGrupos, alCambiarGrupos)
                        }
                        className="size-4 accent-ink"
                      />
                      <span>{grupo.nombre}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
