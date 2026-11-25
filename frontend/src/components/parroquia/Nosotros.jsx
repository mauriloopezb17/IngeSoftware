import {
  EncabezadoSeccion,
  EnlaceFlecha,
  Reveal,
  RevealImagen,
  Seccion,
} from '../portal/index.js';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';
import { usePagina } from '../../hooks/index.js';

function Nosotros() {
  const { data: pagina, isPending, isError, refetch } = usePagina('nosotros');

  const bloques = pagina?.bloques ?? [];
  const textoImagen = bloques.find((bloque) => bloque.tipo === 'texto_imagen')?.contenido;
  const cita = bloques.find((bloque) => bloque.tipo === 'cita')?.contenido;
  const parroco = bloques.find((bloque) => bloque.tipo === 'tarjetas')?.contenido?.items?.[0];
  const parrafos = textoImagen?.texto ? textoImagen.texto.split('\n\n') : [];

  return (
    <Seccion id="nosotros" fondo="blanco">
      {isPending ? (
        <CargandoSeccion alturaMinima={360} etiqueta="Cargando sección nosotros" />
      ) : isError ? (
        <ErrorSeccion
          mensaje="No pudimos cargar la información de nuestra parroquia."
          onReintentar={refetch}
        />
      ) : !textoImagen && !cita && !parroco ? (
        <SinResultados mensaje="No hay información disponible en esta sección." />
      ) : (
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          {textoImagen?.url_imagen && (
            <div className="lg:col-span-6">
              <div className="group overflow-hidden rounded-md border border-sand bg-cream">
                <RevealImagen lado="izquierda">
                  <img
                    src={textoImagen.url_imagen}
                    alt={textoImagen.texto_alternativo || textoImagen.titulo}
                    className="foto-hover aspect-[4/3] w-full object-cover"
                    loading="lazy"
                  />
                </RevealImagen>

                {textoImagen.tarjeta && (
                  <div className="border-t border-sand px-6 py-4">
                    {textoImagen.tarjeta.etiqueta && (
                      <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.2em] text-muted">
                        {textoImagen.tarjeta.etiqueta}
                      </p>
                    )}
                    <p className="mt-1 font-display text-h3 font-semibold text-ink">
                      {textoImagen.tarjeta.titulo}
                    </p>
                    {textoImagen.tarjeta.descripcion && (
                      <p className="mt-1 font-body text-meta text-muted">
                        {textoImagen.tarjeta.descripcion}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <Reveal
            variante={textoImagen?.url_imagen ? 'derecha' : 'arriba'}
            className={textoImagen?.url_imagen ? 'lg:col-span-6' : 'lg:col-span-10'}
          >
            {textoImagen && (
              <>
                <EncabezadoSeccion
                  eyebrow={textoImagen.etiqueta || 'Quiénes somos'}
                  titulo={textoImagen.titulo}
                  className="mb-6"
                />

                <div className="space-y-4">
                  {parrafos.map((parrafo, indice) => (
                    <p key={indice} className="max-w-prose font-body text-body text-muted">
                      {parrafo}
                    </p>
                  ))}
                </div>
              </>
            )}

            {cita?.texto && (
              <blockquote className="mt-8 border-l-2 border-gold pl-5">
                <p className="font-display text-h3 italic text-ink">“{cita.texto}”</p>
                {cita.autor && (
                  <cite className="mt-2 block font-body text-meta not-italic text-muted">— {cita.autor}</cite>
                )}
              </blockquote>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-6 border-t border-sand pt-6">
              {parroco && (
                <div className="flex items-center gap-4">
                  {parroco.url_imagen && (
                    <img
                      src={parroco.url_imagen}
                      alt={parroco.texto_alternativo || parroco.titulo}
                      width={56}
                      height={56}
                      className="size-14 rounded-full border border-sand object-cover"
                      loading="lazy"
                    />
                  )}
                  <div>
                    <p className="font-display text-h3 font-semibold text-ink">{parroco.titulo}</p>
                    {parroco.subtitulo && (
                      <p className="font-body text-meta text-muted">{parroco.subtitulo}</p>
                    )}
                  </div>
                </div>
              )}

              <EnlaceFlecha to="/nosotros">Conoce nuestra historia</EnlaceFlecha>
            </div>
          </Reveal>
        </div>
      )}
    </Seccion>
  );
}

export default Nosotros;
