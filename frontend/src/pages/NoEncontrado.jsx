import { ArrowLeft } from 'lucide-react';

import { BotonEnlace, Contenedor, Eyebrow } from '../components/portal/index.js';

function NoEncontrado() {
  return (
    <section className="py-16 md:py-28">
      <title>Página no encontrada | Parroquia Señor de la Exaltación</title>
      <meta
        name="description"
        content="La dirección que buscas no existe o fue movida en el portal de la Parroquia Señor de la Exaltación."
      />

      <Contenedor>
        <div className="max-w-2xl">
          <Eyebrow className="mb-4">Error 404</Eyebrow>
          <h1 className="font-display text-h1 font-semibold text-ink">Página no encontrada</h1>
          <p className="mt-4 max-w-prose font-body text-lead text-muted">
            La dirección que buscas no existe o fue movida. Puedes volver al inicio o consultar
            nuestros horarios y noticias.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <BotonEnlace to="/" variante="primario">
              <ArrowLeft size={16} aria-hidden="true" />
              Volver al inicio
            </BotonEnlace>
            <BotonEnlace to="/horarios" variante="secundario">
              Ver horarios de misa
            </BotonEnlace>
          </div>
        </div>
      </Contenedor>
    </section>
  );
}

export default NoEncontrado;
