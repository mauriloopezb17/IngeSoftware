import { useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

import logoBlanco from '../../assets/parroquia/logos/logo-horizontal-blanco.svg';
import logoColor from '../../assets/parroquia/logos/logo-horizontal-color.svg';
import { ErrorApi } from '../../services/clienteHttp.js';
import { useSesion } from '../sesion/SesionContexto.js';
import { Aviso, Boton, CampoTexto } from '../ui/index.js';
import EmblemaParroquia from './EmblemaParroquia.jsx';

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
    <main className="grid min-h-screen bg-panel font-body text-ink lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink px-12 py-14 text-white lg:flex">
        <EmblemaParroquia
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -bottom-16 h-[32rem] w-auto text-gold/[0.09]"
        />
        <div className="relative z-10">
          <img
            src={logoBlanco}
            alt="Parroquia Señor de la Exaltación"
            width={239}
            height={134}
            className="h-14 w-auto"
          />
        </div>
        <div className="relative z-10 max-w-md">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">
            Misioneros Pasionistas · Obrajes, La Paz
          </p>
          <p className="mt-4 font-display text-4xl font-semibold leading-tight text-white">
            Gestión editorial y vida parroquial en un solo lugar.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-on-dark">
            Publica noticias, horarios de celebración, eventos, proclamas y boletines mensuales del portal parroquial.
          </p>
        </div>
        <p className="relative z-10 text-xs text-muted-on-dark">
          Acceso restringido al equipo pastoral y administrativo autorizado.
        </p>
      </aside>

      <div className="relative flex items-center justify-center overflow-hidden px-4 py-10 sm:px-8">
        <EmblemaParroquia
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 h-[28rem] w-auto -translate-x-1/2 -translate-y-1/2 text-ink/[0.06] lg:hidden"
        />
        <div className="relative z-10 w-full max-w-md rounded-lg border border-sand bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5 lg:hidden">
            <img
              src={logoColor}
              alt="Parroquia Señor de la Exaltación"
              width={239}
              height={134}
              className="h-11 w-auto"
            />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Parroquia Señor de la Exaltación
          </p>
          <h1 className="mt-1.5 font-body text-2xl font-semibold tracking-tight text-ink">
            Panel de gestión
          </h1>
          <p className="mt-2 text-sm text-muted">
            Inicia sesión con tu cuenta para gestionar el contenido del portal.
          </p>

          {cargando ? (
            <p role="status" className="mt-8 flex items-center gap-2 text-sm text-muted">
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Comprobando la sesión…
            </p>
          ) : (
            <form onSubmit={enviar} noValidate className="mt-7 flex flex-col gap-5">
              {errorGeneral && (
                <Aviso tipo="error">
                  <p>{errorGeneral}</p>
                </Aviso>
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
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted transition-colors duration-150 ease-salida hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none"
                  >
                    {verContrasena ? (
                      <EyeOff className="size-5" aria-hidden="true" />
                    ) : (
                      <Eye className="size-5" aria-hidden="true" />
                    )}
                  </button>
                }
              />

              <Boton type="submit" variante="primario" cargando={enviando} className="w-full">
                {enviando ? 'Entrando…' : 'Iniciar sesión'}
              </Boton>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
