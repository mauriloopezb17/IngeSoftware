import SinPermiso from '../componentes/SinPermiso.jsx';
import { usePermisos } from '../permisos/usePermisos.js';
import { TIPO_AVISO } from './api.js';
import FormularioPublicacion from './FormularioPublicacion.jsx';

// /admin/publicaciones/avisos/nuevo. Es el mismo formulario de las noticias, con el tipo fijado en AVISO.
// Quien no tiene avisos.gestionar (Marketing) ve «sin permiso».
export default function NuevoAviso() {
  const { puede } = usePermisos();
  if (!puede('avisos.gestionar')) return <SinPermiso />;

  return (
    <section className="mx-auto max-w-6xl">
      <header>
        <h1 className="font-display text-4xl font-semibold text-ink">Nuevo aviso</h1>
        <p className="mt-2 text-muted">
          Se publica directamente, sin revisión. Para programarlo, indica una fecha de publicación futura.
        </p>
      </header>
      <FormularioPublicacion tipoInicial={TIPO_AVISO} />
    </section>
  );
}
