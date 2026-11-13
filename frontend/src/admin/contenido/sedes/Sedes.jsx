import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { usePermisos } from '../../permisos/usePermisos.js';
import BannerSoloLectura from '../componentes/BannerSoloLectura.jsx';
import EstadoLista from '../componentes/EstadoLista.jsx';
import { CLAVE_CATALOGOS, obtenerCatalogos } from '../horarios/api.js';
import { CLAVE_SEDES, listarSedes } from './api.js';
import FormularioNuevaSede from './FormularioNuevaSede.jsx';
import FormularioSede from './FormularioSede.jsx';

export default function Sedes() {
  const { puede } = usePermisos();
  const puedeGestionarSedes = puede('sedes.gestionar');
  const puedeEditar = puede('sede.editar') || puedeGestionarSedes;

  const idSelectorSede = useId();
  const [sedeSeleccionadaId, setSedeSeleccionadaId] = useState(null);
  const [creando, setCreando] = useState(false);
  const [aviso, setAviso] = useState('');

  const sedesQuery = useQuery({
    queryKey: CLAVE_SEDES,
    queryFn: listarSedes,
  });

  const catalogosQuery = useQuery({
    queryKey: CLAVE_CATALOGOS,
    queryFn: obtenerCatalogos,
  });

  const sedes = sedesQuery.data ?? [];
  const sedeActiva =
    sedes.find((s) => s.id === sedeSeleccionadaId) ?? sedes[0] ?? null;

  return (
    <section className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-ink">
            {puedeGestionarSedes ? 'Sedes y redes sociales' : 'Datos de la sede'}
          </h1>
          <p className="mt-2 text-muted">
            Información institucional, contacto, configuración del portal y redes sociales.
          </p>
        </div>

        {puedeGestionarSedes && (
          <button
            type="button"
            onClick={() => {
              setAviso('');
              setCreando(true);
            }}
            className="flex items-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark"
          >
            <Plus className="size-4" aria-hidden="true" />
            Nueva sede
          </button>
        )}
      </header>

      {!puedeEditar && <BannerSoloLectura recurso="los datos de la sede" />}

      <p
        role="status"
        className={aviso ? 'mt-4 rounded-md bg-goldPale px-3 py-2 text-sm text-goldDark' : 'sr-only'}
      >
        {aviso}
      </p>

      {puedeGestionarSedes && sedes.length > 1 && (
        <div className="mt-6 flex flex-col gap-1.5 rounded-lg border border-borderSoft bg-white p-4 sm:max-w-md">
          <label htmlFor={idSelectorSede} className="text-xs font-semibold text-muted">
            Sede a editar
          </label>
          <select
            id={idSelectorSede}
            value={sedeActiva?.id ?? ''}
            onChange={(e) => {
              setAviso('');
              setSedeSeleccionadaId(Number(e.target.value));
            }}
            className="rounded-md border border-borderSoft bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-goldDark"
          >
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-6" aria-busy={sedesQuery.isPending}>
        <EstadoLista
          cargando={sedesQuery.isPending}
          error={sedesQuery.error}
          vacio={!sedesQuery.isPending && !sedesQuery.error && !sedeActiva}
          textoCargando="Cargando datos de la sede…"
          textoVacio="No se encontraron sedes."
          onReintentar={() => sedesQuery.refetch()}
        />

        {sedeActiva && (
          <FormularioSede
            key={sedeActiva.id}
            sede={sedeActiva}
            catalogoRedes={catalogosQuery.data?.redesSociales ?? []}
            puedeEditar={puedeEditar}
            puedeGestionarSedes={puedeGestionarSedes}
            onGuardado={(actualizada) =>
              setAviso(`Se guardaron los cambios de «${actualizada.nombre}».`)
            }
          />
        )}
      </div>

      {creando && (
        <FormularioNuevaSede
          sedesExistentes={sedes}
          tiposSede={catalogosQuery.data?.tiposSede ?? []}
          onCerrar={() => setCreando(false)}
          onCreada={(creada) => {
            setCreando(false);
            setSedeSeleccionadaId(creada.id);
            setAviso(`Se creó la sede «${creada.nombre}».`);
          }}
        />
      )}
    </section>
  );
}

