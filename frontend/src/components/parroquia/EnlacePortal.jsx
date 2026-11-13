import { Link, useInRouterContext } from 'react-router';

function esEnlaceExterno(destino) {
  return /^(https?:\/\/|mailto:|tel:)/i.test(destino);
}

function esAncla(destino) {
  return destino.startsWith('#') || destino.startsWith('/#');
}

function EnlacePortal({ to, children, className, onClick, ...resto }) {
  const enRouter = useInRouterContext();
  const destino = to || '/';

  if (!enRouter || esEnlaceExterno(destino) || esAncla(destino)) {
    const externo = esEnlaceExterno(destino);
    return (
      <a
        href={destino}
        className={className}
        onClick={onClick}
        target={externo ? '_blank' : undefined}
        rel={externo ? 'noopener noreferrer' : undefined}
        {...resto}
      >
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

