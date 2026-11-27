import { NavLink } from 'react-router';

// Noticias y avisos comparten la sección Publicaciones: dos vistas del mismo recurso (admin.md §3).
const PESTANAS = [
  { a: '/admin/publicaciones', texto: 'Noticias y notas de prensa', fin: true },
  { a: '/admin/publicaciones/avisos', texto: 'Avisos', fin: false },
];

export default function PestanasPublicaciones() {
  return (
    <nav aria-label="Tipo de publicación" className="mt-6 flex flex-wrap gap-1 border-b border-sand">
      {PESTANAS.map(({ a, texto, fin }) => (
        <NavLink
          key={a}
          to={a}
          end={fin}
          className={({ isActive }) =>
            `-mb-px inline-flex min-h-11 items-center border-b-2 px-4 py-2.5 text-sm transition-colors duration-150 ease-salida focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none ${
              isActive
                ? 'border-gold bg-white font-semibold text-ink'
                : 'border-transparent font-medium text-muted hover:text-ink'
            }`
          }
        >
          {texto}
        </NavLink>
      ))}
    </nav>
  );
}
