import { useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

import { ErrorApi } from '../../services/clienteHttp.js';
import CampoTexto from '../componentes/CampoTexto.jsx';
import { useSesion } from '../sesion/SesionContexto.js';

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RUTA_INICIAL = '/admin/inicio';

// Solo se vuelve a rutas internas del panel (nunca a otro sitio ni al propio login).
function rutaDestino(desde) {
  const valida = typeof desde === 'string' && /^\/admin(\/|$)/.test(desde) && !/^\/admin\/login/.test(desde);
  return valida ? desde : RUTA_INICIAL;
}

function validar({ correo, contrasena }) {
  const errores = {};
  if (!correo) errores.correo = 'Escribe tu correo.';
  else if (correo.length > 120) errores.correo = 'El correo puede tener hasta 120 caracteres.';
  else if (!REGEX_CORREO.test(correo)) errores.correo = 'Escribe un correo válido, por ejemplo nombre@parroquia.org.';
  if (!contrasena) errores.contrasena = 'Escribe tu contraseña.';
  else if (contrasena.length > 200) errores.contrasena = 'La contraseña puede tener hasta 200 caracteres.';
  return errores;
}

export default function InicioSesion() {
  const { usuario, cargando, iniciarSesion } = useSesion();
  const location = useLocation();

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [verContrasena, setVerContrasena] = useState(false);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);

  const refCorreo = useRef(null);
  const refContrasena = useRef(null);

  // Con sesión abierta se vuelve a donde se quería ir (o al inicio del panel).
  if (usuario) return <Navigate to={rutaDestino(location.state?.desde)} replace />;

  function enfocarPrimerError(errs) {
    if (errs.correo) refCorreo.current?.focus();
    else if (errs.contrasena) refContrasena.current?.focus();
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (enviando) return;

    const datos = { correo: correo.trim(), contrasena };
    const erroresLocales = validar(datos);
    setErrorGeneral('');
    setErrores(erroresLocales);
    if (Object.keys(erroresLocales).length) {
      enfocarPrimerError(erroresLocales);
      return;
    }

    setEnviando(true);
    try {
      await iniciarSesion(datos);
      // Al abrirse la sesión, este componente redirige solo (ver arriba).
    } catch (error) {
      if (error instanceof ErrorApi && error.estado === 400 && error.detalles?.length) {
        const delServidor = {};
        for (const { campo, mensaje } of error.detalles) delServidor[campo] ??= mensaje;
        setErrores(delServidor);
        enfocarPrimerError(delServidor);
      } else {
        setErrorGeneral(error instanceof ErrorApi ? error.message : 'No se pudo iniciar sesión.');
        setContrasena('');
        refContrasena.current?.focus();
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-10 font-body">
      <div className="w-full max-w-md rounded-lg border border-borderSoft bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-goldDark">
          Parroquia Señor de la Exaltación
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-ink">Panel de administración</h1>
        <p className="mt-2 text-sm text-muted">Inicia sesión con tu cuenta para gestionar el contenido del portal.</p>

        {cargando ? (
          <p role="status" className="mt-8 flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Comprobando la sesión…
          </p>
        ) : (
          <form onSubmit={enviar} noValidate className="mt-8 flex flex-col gap-5">
            {errorGeneral && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-redParish/30 bg-redParish/5 px-3 py-2.5 text-sm text-redParish"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{errorGeneral}</span>
              </div>
            )}

            <CampoTexto
              etiqueta="Correo electrónico"
              type="email"
              name="correo"
              autoComplete="username"
              inputMode="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              error={errores.correo}
              ref={refCorreo}
            />

            <CampoTexto
              etiqueta="Contraseña"
              type={verContrasena ? 'text' : 'password'}
              name="contrasena"
              autoComplete="current-password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              error={errores.contrasena}
              ref={refContrasena}
              lado={
                <button
                  type="button"
                  onClick={() => setVerContrasena((v) => !v)}
                  aria-label={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={verContrasena}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-goldDark"
                >
                  {verContrasena ? (
                    <EyeOff className="size-5" aria-hidden="true" />
                  ) : (
                    <Eye className="size-5" aria-hidden="true" />
                  )}
                </button>
              }
            />

            <button
              type="submit"
              disabled={enviando}
              className="flex items-center justify-center gap-2 rounded-md bg-gold px-4 py-2.5 font-semibold text-ink transition-colors hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {enviando && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {enviando ? 'Entrando…' : 'Iniciar sesión'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
