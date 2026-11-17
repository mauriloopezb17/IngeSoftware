import { useEffect, useEffectEvent, useId, useState } from 'react';
import { Search, X } from 'lucide-react';

import { Boton, CampoSelect } from '../ui/index.js';
import { ORDENES } from './api.js';
import { CLASES } from './tipos.js';

const ESPERA_BUSQUEDA_MS = 400;

// Filtros de la biblioteca: los valores viven en la URL (los controla la página).
// La búsqueda espera un momento tras dejar de escribir antes de consultar.
export default function FiltrosMultimedia({ valores, hayFiltros, onCambiar, onLimpiar }) {
  const idBusqueda = useId();
  const [texto, setTexto] = useState(valores.buscar);

  // Si la búsqueda cambia desde fuera (por ejemplo, «Quitar los filtros» de la página),
  // el campo la refleja. No se toca mientras coincide con lo que la persona está escribiendo.
  const [buscarPrevio, setBuscarPrevio] = useState(valores.buscar);
  if (buscarPrevio !== valores.buscar) {
    setBuscarPrevio(valores.buscar);
    if (texto.trim() !== valores.buscar) setTexto(valores.buscar);
  }

  const aplicarBusqueda = useEffectEvent((buscar) => onCambiar({ buscar }));

  useEffect(() => {
    const buscar = texto.trim();
    if (buscar === valores.buscar) return undefined;
    const temporizador = setTimeout(() => aplicarBusqueda(buscar), ESPERA_BUSQUEDA_MS);
    return () => clearTimeout(temporizador);
  }, [texto, valores.buscar]);

  function limpiar() {
    setTexto('');
    onLimpiar();
  }

  return (
    <form
      role="search"
      aria-label="Filtros de la biblioteca"
      onSubmit={(e) => e.preventDefault()}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={idBusqueda} className="text-sm font-semibold text-ink">
          Buscar
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            id={idBusqueda}
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Nombre o texto alternativo"
            className="min-h-11 w-full rounded-md border border-sand bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted/75 transition-colors duration-150 ease-salida focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
          />
        </div>
      </div>

      <CampoSelect
        etiqueta="Tipo"
        value={valores.clase}
        onChange={(e) => onCambiar({ clase: e.target.value })}
        opciones={[['', 'Todos'], ...Object.entries(CLASES).map(([clave, { etiqueta }]) => [clave, etiqueta])]}
      />
      <CampoSelect
        etiqueta="Uso"
        value={valores.enUso}
        onChange={(e) => onCambiar({ enUso: e.target.value })}
        opciones={[
          ['', 'Todos'],
          ['true', 'En uso'],
          ['false', 'Sin usar'],
        ]}
      />
      <CampoSelect
        etiqueta="Ordenar por"
        value={valores.orden}
        onChange={(e) => onCambiar({ orden: e.target.value })}
        opciones={Object.entries(ORDENES)}
      />

      <Boton variante="secundario" icono={X} onClick={limpiar} disabled={!hayFiltros && !texto}>
        Limpiar filtros
      </Boton>
    </form>
  );
}
