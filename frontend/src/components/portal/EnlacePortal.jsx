import { Link, useInRouterContext } from 'react-router';

const ANCLAS_HEREDADAS = {
  '#inicio': '/',
  '#nosotros': '/nosotros',
  '#horarios': '/horarios',
  '#sacramentos': '/sacramentos',
  '#agenda': '/calendario',
  '#comunidad': '/comunidad',
  '#comunidades': '/nosotros',
  '#contacto': '/contacto',
  '#video-institucional': '/nosotros',
  '#proclamas': '/proclamas',
  '#vida-parroquial': '/noticias',
  '#noticias': '/noticias',
};

function esEnlaceHttpExterno(destino) {
  return /^https?:\/\//i.test(destino);
}

function esEnlaceEsquemaDirecto(destino) {
  return /^(mailto:|tel:)/i.test(destino);
}

function traducirDestino(to) {
  const destino = (to || '/').trim();
  if (!destino) return '/';

  const anclaNormalizada = destino.startsWith('/#') ? destino.slice(1) : destino;
  if (ANCLAS_HEREDADAS[anclaNormalizada]) {
    return ANCLAS_HEREDADAS[anclaNormalizada];
  }

  return destino;
}

// Enlace del portal que traduce anclas heredadas (#horarios, /#nosotros…) a rutas multipágina.
function EnlacePortal({ to, children, className, onClick, ...resto }) {
  const enRouter = useInRouterContext();
  const destino = traducirDestino(to);

  if (esEnlaceHttpExterno(destino)) {
    return (
      <a
        href={destino}
        className={className}
        onClick={onClick}
        target="_blank"
        rel="noopener noreferrer"
        {...resto}
      >
        {children}
      </a>
    );
  }

  if (esEnlaceEsquemaDirecto(destino) || destino.startsWith('#') || !enRouter) {
    return (
      <a href={destino} className={className} onClick={onClick} {...resto}>
        {children}
      </a>
    );
  }

  return (
    <Link to={destino} className={className} onClick={onClick} {...resto}>
      {children}
    </Link>
  );
}

export default EnlacePortal;
