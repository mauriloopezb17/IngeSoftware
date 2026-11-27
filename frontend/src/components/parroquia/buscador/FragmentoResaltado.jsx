// Renderiza fragmentos de texto con coincidencias resaltadas sin inyectar HTML.
function FragmentoResaltado({ segmentos = [] }) {
  if (!Array.isArray(segmentos) || segmentos.length === 0) return null;

  return (
    <p className="mt-2 font-body text-meta leading-relaxed text-muted">
      {segmentos.map((segmento, indice) =>
        segmento.resaltado ? (
          <mark
            key={`${indice}-${segmento.texto}`}
            className="rounded-sm bg-gold-soft px-0.5 font-semibold text-ink"
          >
            {segmento.texto}
          </mark>
        ) : (
          <span key={`${indice}-${segmento.texto}`}>{segmento.texto}</span>
        ),
      )}
    </p>
  );
}

export default FragmentoResaltado;
