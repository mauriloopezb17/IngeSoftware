import { situacionDe } from './situacion.js';

const TONOS = {
  neutro: 'bg-stone text-charcoal',
  aviso: 'bg-goldPale text-goldDark',
  exito: 'bg-green-100 text-green-800',
  alerta: 'bg-redParish/10 text-redParish',
  apagado: 'bg-borderSoft/60 text-muted',
};

// Insignia con la situación de la publicación (borrador, rechazada, programada, publicada...).
export default function InsigniaSituacion({ publicacion }) {
  const { etiqueta, tono } = situacionDe(publicacion);

  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONOS[tono]}`}>
      {etiqueta}
    </span>
  );
}
