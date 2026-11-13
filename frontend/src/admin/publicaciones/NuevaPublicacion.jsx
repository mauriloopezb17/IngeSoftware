import { usePermisos } from '../permisos/usePermisos.js';
import SinPermiso from '../componentes/SinPermiso.jsx';
import FormularioPublicacion from './FormularioPublicacion.jsx';

// /admin/publicaciones/nueva. Quien no puede redactar noticias (por ejemplo, Secretaría) ve «sin permiso».
export default function NuevaPublicacion() {
  const { puede } = usePermisos();
  if (!puede('noticias.redactar')) return <SinPermiso />;

  return (
    <section className="mx-auto max-w-6xl">
      <header>
        <h1 className="font-display text-4xl font-semibold text-ink">Nueva publicación</h1>
        <p className="mt-2 text-muted">Redacta una noticia o una nota de prensa. Se guarda como borrador.</p>
      </header>
      <FormularioPublicacion />
    </section>
  );
}
