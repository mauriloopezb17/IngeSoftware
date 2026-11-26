import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Inbox, Plus } from 'lucide-react';

import { usePermisos } from '../../permisos/usePermisos.js';
import {
  Aviso,
  Boton,
  CampoSelect,
  EncabezadoPantalla,
  EsqueletoFormulario,
  EstadoVacio,
  useToast,
} from '../../ui/index.js';
import { CLAVE_CATALOGOS, obtenerCatalogos } from '../horarios/api.js';
import { CLAVE_SEDES, listarSedes } from './api.js';
import FormularioNuevaSede from './FormularioNuevaSede.jsx';
import FormularioSede from './FormularioSede.jsx';

export default function Sedes() {
  const { puede } = usePermisos();
  const toast = useToast();
  const puedeGestionarSedes = puede('sedes.gestionar');
  const puedeEditar = puede('sede.editar') || puedeGestionarSedes;

  const [sedeSeleccionadaId, setSedeSeleccionadaId] = useState(null);
  const [creando, setCreando] = useState(false);

  const sedesQuery = useQuery({
    queryKey: CLAVE_SEDES,
    queryFn: () => listarSedes(),
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

      <div className="mt-6" aria-busy={sedesQuery.isPending}>
        {sedesQuery.isPending && (
          <EsqueletoFormulario campos={5} etiqueta="Cargando datos de la sede…" />
        )}

        {sedesQuery.error && (
          <Aviso
            tipo="error"
            accion={
              <Boton variante="secundario" tamano="sm" onClick={() => sedesQuery.refetch()}>
                Reintentar
              </Boton>
            }
          >
            <p>{sedesQuery.error.message || 'No se pudieron cargar los datos.'}</p>
          </Aviso>
        )}

        {!sedesQuery.isPending && !sedesQuery.error && !sedeActiva && (
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
          onCerrar={() => setCreando(false)}
          onCreada={(creada) => {
            setCreando(false);
            setSedeSeleccionadaId(creada.id);
            toast.exito(`Se creó la sede «${creada.nombre}».`);
          }}
        />
      )}
    </section>
  );
}
