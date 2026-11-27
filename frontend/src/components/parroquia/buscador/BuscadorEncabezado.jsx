import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, X } from 'lucide-react';

function esElementoEditable(elemento) {
  if (!elemento) return false;
  const etiqueta = elemento.tagName;
  return (
    etiqueta === 'INPUT' ||
    etiqueta === 'TEXTAREA' ||
    etiqueta === 'SELECT' ||
    elemento.isContentEditable
  );
}

// Campo de búsqueda desplegable para el encabezado de escritorio (atajo '/').
export function BuscadorEncabezado() {
  const navigate = useNavigate();
  const idPanel = useId();
  const idInput = useId();

  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState('');
  const [avisoCorto, setAvisoCorto] = useState(false);

  const contenedorRef = useRef(null);
  const botonRef = useRef(null);
  const inputRef = useRef(null);

  const abrir = () => {
    setAbierto(true);
    setAvisoCorto(false);
  };

  const cerrar = ({ devolverFoco = false } = {}) => {
    setAbierto(false);
    setAvisoCorto(false);
    if (devolverFoco) {
      botonRef.current?.focus();
    }
  };

  useEffect(() => {
    if (abierto) {
      inputRef.current?.focus();
    }
  }, [abierto]);

  useEffect(() => {
    const manejarAtajo = (evento) => {
      if (evento.key !== '/' || evento.ctrlKey || evento.metaKey || evento.altKey) return;
      if (esElementoEditable(document.activeElement)) return;
      evento.preventDefault();
      setAbierto(true);
      setAvisoCorto(false);
    };

    document.addEventListener('keydown', manejarAtajo);
    return () => document.removeEventListener('keydown', manejarAtajo);
  }, []);

  useEffect(() => {
    if (!abierto) return undefined;

    const alClicFuera = (evento) => {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target)) {
        setAbierto(false);
        setAvisoCorto(false);
      }
    };

    const alEscape = (evento) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        setAbierto(false);
        setAvisoCorto(false);
        botonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', alClicFuera);
    document.addEventListener('keydown', alEscape);
    return () => {
      document.removeEventListener('mousedown', alClicFuera);
      document.removeEventListener('keydown', alEscape);
    };
  }, [abierto]);

  const enviar = (evento) => {
    evento.preventDefault();
    const limpio = consulta.trim();
    if (limpio.length < 2) {
      setAvisoCorto(true);
      inputRef.current?.focus();
      return;
    }
    setAbierto(false);
    setAvisoCorto(false);
    navigate(`/buscar?q=${encodeURIComponent(limpio)}`);
  };

  return (
    <div ref={contenedorRef} className="relative hidden lg:block">
      <button
        ref={botonRef}
        type="button"
        onClick={() => (abierto ? cerrar({ devolverFoco: true }) : abrir())}
        aria-label="Buscar"
        aria-expanded={abierto}
        aria-controls={idPanel}
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border border-white/25 px-3.5 py-2 font-body text-button font-semibold text-white transition-colors duration-150 ease-salida hover:border-gold hover:text-gold active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold motion-reduce:transition-none"
      >
        <Search size={17} aria-hidden="true" />
        <span>Buscar</span>
      </button>

      {abierto && (
        <div
          id={idPanel}
          className="absolute top-full right-0 z-[45] mt-2 w-88 origin-top-right rounded-md border border-sand bg-white p-3 text-ink shadow-soft transition-[opacity,transform] duration-150 ease-salida motion-reduce:transition-none"
        >
          <form role="search" aria-label="Buscar en el portal" onSubmit={enviar} className="flex items-center gap-2">
            <label htmlFor={idInput} className="sr-only">
              Buscar en el portal
            </label>
            <input
              ref={inputRef}
              id={idInput}
              type="search"
              enterKeyHint="search"
              value={consulta}
              onChange={(evento) => {
                setConsulta(evento.target.value);
                if (avisoCorto && evento.target.value.trim().length >= 2) {
                  setAvisoCorto(false);
                }
              }}
              placeholder="Buscar noticias, sacramentos…"
              className="min-h-11 min-w-0 flex-1 rounded-sm border border-sand bg-white px-3 py-2 font-body text-meta text-ink placeholder:text-muted focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
            />
            <button
              type="submit"
              aria-label="Enviar búsqueda"
              className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm bg-gold text-ink transition-colors duration-150 ease-salida hover:bg-gold-dark active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none"
            >
              <Search size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => cerrar({ devolverFoco: true })}
              aria-label="Cerrar buscador"
              className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-sand text-muted transition-colors duration-150 ease-salida hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </form>

          {avisoCorto && (
            <p role="status" className="mt-2 font-body text-meta text-danger">
              Escribe al menos 2 letras para buscar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Campo de búsqueda integrado al inicio del menú móvil.
export function BuscadorMovil({ alNavegar }) {
  const navigate = useNavigate();
  const idInput = useId();
  const inputRef = useRef(null);
  const [consulta, setConsulta] = useState('');
  const [avisoCorto, setAvisoCorto] = useState(false);

  const enviar = (evento) => {
    evento.preventDefault();
    const limpio = consulta.trim();
    if (limpio.length < 2) {
      setAvisoCorto(true);
      inputRef.current?.focus();
      return;
    }
    setAvisoCorto(false);
    alNavegar?.();
    navigate(`/buscar?q=${encodeURIComponent(limpio)}`);
  };

  return (
    <form role="search" aria-label="Buscar en el portal" onSubmit={enviar} className="mb-4">
      <label htmlFor={idInput} className="sr-only">
        Buscar en el portal
      </label>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          id={idInput}
          type="search"
          enterKeyHint="search"
          value={consulta}
          onChange={(evento) => {
            setConsulta(evento.target.value);
            if (avisoCorto && evento.target.value.trim().length >= 2) {
              setAvisoCorto(false);
            }
          }}
          placeholder="Buscar en el portal…"
          className="min-h-11 min-w-0 flex-1 rounded-sm border border-white/25 bg-ink-soft px-3.5 py-2 font-body text-body text-white placeholder:text-muted-on-dark focus-visible:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        />
        <button
          type="submit"
          aria-label="Buscar"
          className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm bg-gold text-ink transition-colors duration-150 ease-salida hover:bg-gold-dark active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold motion-reduce:transition-none"
        >
          <Search size={20} aria-hidden="true" />
        </button>
      </div>
      {avisoCorto && (
        <p role="status" className="mt-2 font-body text-meta text-gold">
          Escribe al menos 2 letras para buscar.
        </p>
      )}
    </form>
  );
}
