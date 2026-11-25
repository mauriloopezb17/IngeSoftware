import Eyebrow from './Eyebrow.jsx';
import Reveal from './Reveal.jsx';
import RevealTitulo from './RevealTitulo.jsx';

// Cabecera de sección: eyebrow (mb-4), título con máscara por líneas (text-h2), bajada (max-w-prose) y acción opcional.
function EncabezadoSeccion({
  eyebrow,
  titulo,
  bajada,
  oscuro = false,
  centrado = false,
  nivel = 'h2',
  accion = null,
  className = '',
}) {
  const Etiqueta = nivel === 'h3' ? 'h3' : 'h2';
  const colorTitulo = oscuro ? 'text-white' : 'text-ink';
  const colorBajada = oscuro ? 'text-muted-on-dark' : 'text-muted';

  const bloqueTexto = (
    <div className={centrado ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && (
        <Eyebrow oscuro={oscuro} centrado={centrado} className="mb-4">
          {eyebrow}
        </Eyebrow>
      )}

      <RevealTitulo
        as={Etiqueta}
        retraso={eyebrow ? 100 : 0}
        duracion={900}
        className={`font-display text-h2 font-semibold text-balance ${colorTitulo}`}
      >
        {titulo}
      </RevealTitulo>

      {bajada && (
        <Reveal variante="arriba" retraso={150}>
          <p
            className={`mt-4 max-w-prose font-body text-lead text-pretty ${colorBajada} ${
              centrado ? 'mx-auto' : ''
            }`.trim()}
          >
            {bajada}
          </p>
        </Reveal>
      )}
    </div>
  );

  if (accion && !centrado) {
    return (
      <div
        className={`mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between ${className}`.trim()}
      >
        {bloqueTexto}
        <div className="shrink-0">{accion}</div>
      </div>
    );
  }

  return (
    <div className={`mb-12 ${className}`.trim()}>
      {bloqueTexto}
      {accion && centrado && <div className="mt-6 flex justify-center">{accion}</div>}
    </div>
  );
}

export default EncabezadoSeccion;
