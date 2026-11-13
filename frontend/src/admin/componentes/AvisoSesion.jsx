import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Clock, Loader2, LogOut, TriangleAlert } from 'lucide-react';

import { useSesion } from '../sesion/SesionContexto.js';
import { formatearHora, formatearRestante, MINUTOS_DE_AVISO, useEstadoDeSesion } from '../sesion/vencimiento.js';

const MS_MENSAJE_RENOVADA = 8000;

const botonPrimario =
  'flex items-center justify-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-60';
const botonSecundario =
  'flex items-center justify-center gap-2 rounded-md border border-borderSoft bg-white px-4 py-2 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark disabled:opacity-60';

// Aviso de la sesión del panel (autenticacion.md: la cookie vence a las `sesionExpiraEn`):
//  * unos minutos antes de que venza, avisa con la hora y una cuenta atrás, sin tapar ni bloquear nada: se puede
//    seguir trabajando y guardar. «Renovar sesión» pide la contraseña del mismo usuario y emite una sesión nueva;
//  * al vencer (por la hora o porque la API respondió 401), ofrece volver a entrar sin salir de la pantalla.
//    Lo que no se guardó sigue ahí y se puede guardar después de entrar. Solo «Ir al inicio de sesión» sale.
// No es un diálogo modal: así se puede seguir copiando o guardando mientras tanto.
export default function AvisoSesion() {
  const { usuario, sesionVencida, renovarSesion, cerrarSesion } = useSesion();
  const navegar = useNavigate();
  const idContrasena = useId();
  const campo = useRef(null);

  const { estado: porTiempo, restanteMs } = useEstadoDeSesion(usuario?.sesionExpiraEn);
  const vencida = sesionVencida || porTiempo === 'vencida';
  const porVencer = !vencida && porTiempo === 'por-vencer';

  const [pidiendoContrasena, setPidiendoContrasena] = useState(false);
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [renovada, setRenovada] = useState(false);

  // Al pedir la contraseña desde «Renovar sesión», el foco pasa al campo (lo pidió la persona).
  useEffect(() => {
    if (pidiendoContrasena && porVencer) campo.current?.focus();
  }, [pidiendoContrasena, porVencer]);

  // El mensaje «Sesión renovada» se retira solo.
  useEffect(() => {
    if (!renovada) return undefined;
    const t = setTimeout(() => setRenovada(false), MS_MENSAJE_RENOVADA);
    return () => clearTimeout(t);
  }, [renovada]);

  if (!usuario) return null;

  async function renovar(evento) {
    evento.preventDefault();
    if (!contrasena) {
      setError('Escribe tu contraseña.');
      campo.current?.focus();
      return;
    }
    setEnviando(true);
    setError('');
    try {
      await renovarSesion(contrasena);
      setContrasena('');
      setPidiendoContrasena(false);
      setRenovada(true);
    } catch (e) {
      setError(e.message);
      campo.current?.focus();
    } finally {
      setEnviando(false);
    }
  }

  async function irAlLogin() {
    await cerrarSesion();
    navegar('/admin/login', { replace: true });
  }

  if (renovada && !vencida && !porVencer) {
    return (
      <p
        role="status"
        className="fixed inset-x-3 bottom-3 z-50 rounded-md border border-borderSoft bg-white px-4 py-3 text-sm shadow-lg sm:left-auto sm:right-4 sm:max-w-sm"
      >
        Sesión renovada. Vence a las {formatearHora(usuario.sesionExpiraEn)}.
      </p>
    );
  }
  if (!vencida && !porVencer) return null;

  const mostrarFormulario = vencida || pidiendoContrasena;

  return (
    <section
      aria-label="Estado de la sesión"
      className={`fixed inset-x-3 bottom-3 z-50 rounded-lg border bg-white p-4 text-sm shadow-lg sm:left-auto sm:right-4 sm:max-w-md ${
        vencida ? 'border-redParish/40' : 'border-goldDark/50'
      }`}
    >
      {/* El texto del aviso no cambia: así se anuncia una sola vez. La cuenta atrás es solo visual. */}
      <div role="alert" className="flex items-start gap-2">
        {vencida ? (
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-redParish" aria-hidden="true" />
        ) : (
          <Clock className="mt-0.5 size-4 shrink-0 text-goldDark" aria-hidden="true" />
        )}
        <p>
          {vencida ? (
            <>
              <strong className="font-semibold">Tu sesión venció.</strong> Lo que no guardaste sigue en esta pantalla:
              vuelve a entrar para poder guardarlo.
            </>
          ) : (
            <>
              <strong className="font-semibold">Tu sesión vence a las {formatearHora(usuario.sesionExpiraEn)}</strong>{' '}
              (en menos de {MINUTOS_DE_AVISO} minutos). Guarda tu trabajo o renueva la sesión.
            </>
          )}
        </p>
      </div>
      {porVencer && (
        <p aria-hidden="true" className="mt-1 pl-6 text-xs text-muted">
          Quedan {formatearRestante(restanteMs)}
        </p>
      )}

      {mostrarFormulario ? (
        <form onSubmit={renovar} noValidate className="mt-3 flex flex-col gap-2">
          <label htmlFor={idContrasena} className="text-xs font-semibold text-muted">
            Contraseña de {usuario.correo}
          </label>
          <input
            id={idContrasena}
            ref={campo}
            type="password"
            autoComplete="current-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${idContrasena}-error` : undefined}
            className={`rounded-md border bg-white px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-goldDark ${
              error ? 'border-redParish' : 'border-borderSoft'
            }`}
          />
          {error && (
            <p id={`${idContrasena}-error`} role="alert" className="text-sm text-redParish">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={enviando} className={botonPrimario}>
              {enviando && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {vencida ? 'Volver a entrar' : 'Renovar sesión'}
            </button>
            {vencida ? (
              <button type="button" onClick={irAlLogin} disabled={enviando} className={botonSecundario}>
                <LogOut className="size-4" aria-hidden="true" /> Ir al inicio de sesión
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPidiendoContrasena(false);
                  setError('');
                }}
                disabled={enviando}
                className={botonSecundario}
              >
                Ahora no
              </button>
            )}
          </div>
          {vencida && (
            <p className="text-xs text-muted">Si sales ahora, se pierde lo que no guardaste.</p>
          )}
        </form>
      ) : (
        <div className="mt-3">
          <button type="button" onClick={() => setPidiendoContrasena(true)} className={botonPrimario}>
            Renovar sesión
          </button>
        </div>
      )}
    </section>
  );
}
