import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArchiveRestore, Archive, Rocket, Trash2 } from 'lucide-react';

import ConfirmarAccion from '../componentes/ConfirmarAccion.jsx';
import {
  archivarPublicacion,
  CLAVE_PUBLICACIONES,
  eliminarPublicacion,
  publicarPublicacion,
  restaurarPublicacion,
} from './api.js';
import { situacionDe } from './situacion.js';

const boton =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-1.5 text-xs font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark';

// Cada acción: botón, confirmación y llamada. Los botones salen de `acciones` (lo que la API dice que
// esta sesión puede hacer): el componente no decide permisos.
const ACCIONES = {
  PUBLICAR: {
    texto: 'Publicar',
    icono: Rocket,
    peligro: false,
    titulo: (p) => `¿Publicar «${p.titulo}»?`,
    detalle: (p) =>
      p.fechaPublicacion && new Date(p.fechaPublicacion) > new Date()
        ? 'Quedará programada: se verá en el portal desde su fecha de publicación.'
        : 'Se verá en el portal de inmediato, sin revisión.',
    ejecutar: (p) => publicarPublicacion(p.id),
    exito: (p) => `«${p.titulo}» se publicó.`,
  },
  ARCHIVAR: {
    texto: 'Archivar',
    icono: Archive,
    peligro: false,
    titulo: (p) => `¿Archivar «${p.titulo}»?`,
    detalle: () => 'Dejará de verse en el portal y quedará guardada como historial. Podrás restaurarla.',
    ejecutar: (p) => archivarPublicacion(p.id),
    exito: (p) => `«${p.titulo}» se archivó.`,
  },
  RESTAURAR: {
    texto: 'Restaurar',
    icono: ArchiveRestore,
    peligro: false,
    titulo: (p) => `¿Restaurar «${p.titulo}»?`,
    detalle: () => 'Vuelve a borrador. Para que regrese al portal habrá que publicarla de nuevo.',
    ejecutar: (p) => restaurarPublicacion(p.id),
    exito: (p) => `«${p.titulo}» volvió a borrador.`,
  },
  ELIMINAR: {
    texto: 'Eliminar',
    icono: Trash2,
    peligro: true,
    titulo: (p) => `¿Eliminar «${p.titulo}»?`,
    detalle: () => 'Se elimina definitivamente. Esta acción no se puede deshacer.',
    ejecutar: (p) => eliminarPublicacion(p.id),
    exito: (p) => `«${p.titulo}» se eliminó.`,
  },
};

const ORDEN = ['PUBLICAR', 'ARCHIVAR', 'RESTAURAR', 'ELIMINAR'];

// Botones de estado de una publicación (publicar, archivar, restaurar, eliminar). `alTerminar(mensaje)`
// se llama tras una acción exitosa, para mostrar el aviso en la pantalla.
export default function AccionesEstado({ publicacion, alTerminar }) {
  const clienteConsultas = useQueryClient();
  const [pendiente, setPendiente] = useState(null); // clave de la acción en confirmación

  const mutacion = useMutation({
    mutationFn: (clave) => ACCIONES[clave].ejecutar(publicacion),
    onSuccess: (_, clave) => {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_PUBLICACIONES });
      setPendiente(null);
      alTerminar?.(ACCIONES[clave].exito(publicacion));
    },
  });

  const disponibles = ORDEN.filter((clave) => publicacion.acciones.includes(clave));
  if (!disponibles.length) return null;
  const accion = pendiente ? ACCIONES[pendiente] : null;
  const { etiqueta } = situacionDe(publicacion);

  return (
    <>
      {disponibles.map((clave) => {
        const { texto, icono: Icono } = ACCIONES[clave];
        return (
          <button
            key={clave}
            type="button"
            onClick={() => setPendiente(clave)}
            aria-label={`${texto} «${publicacion.titulo}»`}
            className={boton}
          >
            <Icono className="size-3.5" aria-hidden="true" /> {texto}
          </button>
        );
      })}

      {accion && (
        <ConfirmarAccion
          titulo={accion.titulo(publicacion)}
          textoConfirmar={accion.texto}
          peligro={accion.peligro}
          pendiente={mutacion.isPending}
          error={mutacion.error}
          onConfirmar={() => mutacion.mutate(pendiente)}
          onCancelar={() => {
            mutacion.reset();
            setPendiente(null);
          }}
        >
          <p>{accion.detalle(publicacion)}</p>
          <p className="mt-2 text-xs text-muted">Situación actual: {etiqueta}.</p>
        </ConfirmarAccion>
      )}
    </>
  );
}
