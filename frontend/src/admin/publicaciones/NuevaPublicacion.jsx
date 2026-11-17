import SinPermiso from '../componentes/SinPermiso.jsx';
import { usePermisos } from '../permisos/usePermisos.js';
import { EncabezadoPantalla } from '../ui/index.js';
import FormularioPublicacion from './FormularioPublicacion.jsx';

// /admin/publicaciones/nueva. Quien no puede redactar noticias (por ejemplo, Secretaría) ve «sin permiso».
export default function NuevaPublicacion() {
  const { puede } = usePermisos();
  if (!puede('noticias.redactar')) return <SinPermiso />;

  return (
    <section className="mx-auto max-w-3xl">
      <EncabezadoPantalla
        titulo="Nueva publicación"
        descripcion="Redacta una noticia o una nota de prensa. Se guarda como borrador."
      />
      <FormularioPublicacion />
    </section>
  );
}
