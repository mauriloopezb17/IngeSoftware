// Tabla accesible del panel con desplazamiento horizontal en móvil, caption y encabezados claros.
export function Tabla({
  caption,
  captionVisible = false,
  encabezados,
  children,
  claseTabla = 'min-w-[640px]',
  tenue = false,
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-sand bg-white">
      <table className={`w-full border-collapse text-left text-sm ${claseTabla} ${tenue ? 'opacity-60' : ''}`}>
        {caption && (
          <caption className={captionVisible ? 'border-b border-sand bg-panel px-4 py-2 text-left text-xs text-muted' : 'sr-only'}>
            {caption}
          </caption>
        )}
        <thead>
          <tr className="border-b border-sand bg-panel text-xs font-semibold uppercase tracking-wide text-muted">
            {encabezados.map((encabezado, indice) => {
              const texto = typeof encabezado === 'object' && encabezado !== null && 'texto' in encabezado ? encabezado.texto : encabezado;
              const clase = typeof encabezado === 'object' && encabezado !== null && 'clase' in encabezado ? encabezado.clase : '';
              return (
                <th key={typeof texto === 'string' ? texto : indice} scope="col" className={`px-4 py-3 ${clase}`}>
                  {texto}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-sand bg-white">{children}</tbody>
      </table>
    </div>
  );
}

export function FilaTabla({ className = '', children, ...props }) {
  return (
    <tr className={`transition-colors duration-150 ease-salida hover:bg-panel/70 motion-reduce:transition-none ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function CeldaTabla({ className = '', children, ...props }) {
  return (
    <td className={`px-4 py-3 align-top text-ink ${className}`} {...props}>
      {children}
    </td>
  );
}
