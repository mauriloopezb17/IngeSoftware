import { Insignia } from '../ui/index.js';
import { situacionDe } from './situacion.js';

// Insignia con la situación de la publicación (borrador, rechazada, programada, publicada...).
export default function InsigniaSituacion({ publicacion }) {
  const { etiqueta, tono } = situacionDe(publicacion);
  return <Insignia variante={tono}>{etiqueta}</Insignia>;
}
