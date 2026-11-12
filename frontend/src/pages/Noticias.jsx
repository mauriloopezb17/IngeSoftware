import { Link } from 'react-router';

// Página provisional: el listado real se implementa en la rama feature/web-noticias.
function Noticias() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 font-body">
      <h1 className="serif-title text-4xl">Noticias</h1>
      <p className="mt-4 text-muted">Estamos preparando esta sección.</p>
      <Link to="/" className="mt-8 inline-block font-semibold text-goldDark underline">
        Volver al inicio
      </Link>
    </main>
  );
}

export default Noticias;
