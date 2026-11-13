import { Loader2 } from 'lucide-react';

// Avance de una subida (0 a 100 de lo enviado). Al llegar a 100 el servidor todavía procesa el archivo
// (las imágenes se convierten a WebP), así que se avisa con «Procesando…» en lugar de un 100 % que parece terminado.
// Usa <progress> (rol progressbar nativo, con su valor anunciado a los lectores de pantalla).
export default function BarraProgreso({ nombre, progreso }) {
  const enviado = Math.max(0, Math.min(100, Math.round(progreso ?? 0)));
  const procesando = enviado >= 100;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <progress
        value={enviado}
        max={100}
        aria-label={`Progreso de subida de ${nombre}`}
        aria-valuetext={procesando ? 'Enviado, procesando en el servidor' : `${enviado} %`}
        className="h-2 w-full overflow-hidden rounded-full accent-goldDark"
      />
      <p className="flex items-center gap-1.5 text-xs text-muted" aria-hidden="true">
        {procesando ? (
          <>
            <Loader2 className="size-3 animate-spin" /> Procesando…
          </>
        ) : (
          `${enviado} %`
        )}
      </p>
    </div>
  );
}
