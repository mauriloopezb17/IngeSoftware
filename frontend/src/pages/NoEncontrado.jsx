import { Link } from 'react-router';

function NoEncontrado() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 font-body">
      <p className="eyebrow">Error 404</p>
      <h1 className="serif-title mt-4 text-4xl">Página no encontrada</h1>
      <p className="mt-4 text-muted">La dirección que buscas no existe o fue movida.</p>
      <Link to="/" className="mt-8 inline-block font-semibold text-goldDark underline">
        Volver al inicio
      </Link>
    </main>
  );
}

export default NoEncontrado;
