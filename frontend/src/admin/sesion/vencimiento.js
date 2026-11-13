// Cuándo vence la sesión del panel. `sesionExpiraEn` (autenticacion.md §2) es la fecha ISO en que vence el JWT:
// el panel avisa unos minutos antes y, al vencer, deja volver a entrar sin salir de la pantalla.
import { useEffect, useState } from 'react';

export const MINUTOS_DE_AVISO = 5;
const MS_MINUTO = 60 * 1000;

// 'activa' | 'por-vencer' (dentro de la ventana de aviso) | 'vencida'.
// Sin fecha válida no se puede saber: se considera activa (la API responde 401 cuando venza de verdad).
export function estadoDeSesion(expiraEn, ahora, avisoMs = MINUTOS_DE_AVISO * MS_MINUTO) {
  const fin = Date.parse(expiraEn);
  if (Number.isNaN(fin)) return { estado: 'activa', restanteMs: Infinity };
  const restanteMs = fin - ahora;
  if (restanteMs <= 0) return { estado: 'vencida', restanteMs: 0 };
  return { estado: restanteMs <= avisoMs ? 'por-vencer' : 'activa', restanteMs };
}

// Estado de la sesión, al día. Fuera de la ventana de aviso solo programa un temporizador hasta que empiece
// (no despierta cada segundo durante 8 horas); dentro de ella actualiza cada segundo para la cuenta atrás.
export function useEstadoDeSesion(expiraEn, avisoMs = MINUTOS_DE_AVISO * MS_MINUTO) {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const fin = Date.parse(expiraEn);
    if (Number.isNaN(fin)) return undefined;

    let temporizador;
    const programar = () => {
      const restante = fin - Date.now();
      if (restante <= 0) return;
      // Hasta que empiece el aviso, un solo temporizador; después, cada segundo (sin pasarse del vencimiento).
      const espera = restante > avisoMs ? restante - avisoMs : Math.min(1000, restante);
      temporizador = setTimeout(() => {
        setAhora(Date.now());
        programar();
      }, espera);
    };
    programar();
    return () => clearTimeout(temporizador);
  }, [expiraEn, avisoMs]);

  // `ahora` solo avanza con los temporizadores: si la sesión se renueva, la nueva fecha ya es posterior.
  return estadoDeSesion(expiraEn, ahora, avisoMs);
}

const HORA = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/La_Paz' });

// "16:31", en hora de Bolivia.
export const formatearHora = (iso) => HORA.format(new Date(iso));

// 272000 -> "4 min 32 s"; 45000 -> "45 s".
export function formatearRestante(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutos = Math.floor(total / 60);
  const segundos = total % 60;
  return minutos > 0 ? `${minutos} min ${String(segundos).padStart(2, '0')} s` : `${segundos} s`;
}
