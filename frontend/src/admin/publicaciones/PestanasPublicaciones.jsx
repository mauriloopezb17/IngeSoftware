import { NavLink } from 'react-router';

// Noticias y avisos comparten la sección Publicaciones: dos vistas del mismo recurso (admin.md §3).
const PESTANAS = [
  { a: '/admin/publicaciones', texto: 'Noticias y notas de prensa', fin: true },
  { a: '/admin/publicaciones/avisos', texto: 'Avisos', fin: false },
];

export default function PestanasPublicaciones() {
  return (
    <nav aria-label="Tipo de publicación" className="mt-6 flex gap-1 border-b border-borderSoft">
      {PESTANAS.map(({ a, texto, fin }) => (
        <NavLink
          key={a}
          to={a}
          end={fin}
          className={({ isActive }) =>
            `-mb-px rounded-t-md border-b-2 px-4 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-goldDark ${
              isActive ? 'border-goldDark bg-white font-semibold text-ink' : 'border-transparent text-muted hover:text-ink'
            }`
          }
        >
          {texto}
        </NavLink>
      ))}
    </nav>
  );
}
