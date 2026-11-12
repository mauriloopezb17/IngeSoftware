import { Link, useParams } from 'react-router';

// Página provisional: el detalle real se implementa en la rama feature/web-noticias.
function NoticiaDetalle() {
  const { slug } = useParams();

  return (
    <main className="mx-auto max-w-3xl px-6 py-24 font-body">
      <h1 className="serif-title text-4xl">Noticia</h1>
      <p className="mt-4 text-muted">Contenido de «{slug}» próximamente.</p>
      <Link to="/noticias" className="mt-8 inline-block font-semibold text-goldDark underline">
        Ver todas las noticias
      </Link>
    </main>
  );
}

export default NoticiaDetalle;
