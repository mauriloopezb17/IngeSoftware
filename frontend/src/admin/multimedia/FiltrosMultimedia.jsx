import { useEffect, useEffectEvent, useId, useState } from 'react';
import { Search, X } from 'lucide-react';

import { ORDENES } from './api.js';
import { CLASES } from './tipos.js';

const ESPERA_BUSQUEDA_MS = 400;

const estiloControl =
  'w-full rounded-md border border-borderSoft bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-goldDark';

function Selector({ etiqueta, valor, opciones, onChange }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-muted">
        {etiqueta}
      </label>
      <select id={id} value={valor} onChange={(e) => onChange(e.target.value)} className={estiloControl}>
        {opciones.map(([clave, texto]) => (
          <option key={clave} value={clave}>
            {texto}
          </option>
        ))}
      </select>
    </div>
  );
}

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
    <form role="search" aria-label="Filtros de la biblioteca" onSubmit={(e) => e.preventDefault()} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
      <div className="flex flex-col gap-1">
        <label htmlFor={idBusqueda} className="text-xs font-semibold text-muted">
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
            className={`${estiloControl} pl-9`}
          />
        </div>
      </div>

      <Selector
        etiqueta="Tipo"
        valor={valores.clase}
        onChange={(clase) => onCambiar({ clase })}
        opciones={[['', 'Todos'], ...Object.entries(CLASES).map(([clave, { etiqueta }]) => [clave, etiqueta])]}
      />
      <Selector
        etiqueta="Uso"
        valor={valores.enUso}
        onChange={(enUso) => onCambiar({ enUso })}
        opciones={[
          ['', 'Todos'],
          ['true', 'En uso'],
          ['false', 'Sin usar'],
        ]}
      />
      <Selector
        etiqueta="Ordenar por"
        valor={valores.orden}
        onChange={(orden) => onCambiar({ orden })}
        opciones={Object.entries(ORDENES)}
      />

      <button
        type="button"
        onClick={limpiar}
        disabled={!hayFiltros && !texto}
        className="flex items-center justify-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-2 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
      >
        <X className="size-4" aria-hidden="true" /> Limpiar filtros
      </button>
    </form>
  );
}
