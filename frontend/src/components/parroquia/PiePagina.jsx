import { MapPin, Phone, Mail } from 'lucide-react';
import { anchoContenido } from './ElementosComunes.jsx';
function PiePagina() {
  return <footer className="bg-ink py-14 text-white/75">
    <div className={`${anchoContenido} flex flex-wrap justify-between gap-10`}>
      <div>
        <h2 className="font-display text-3xl text-white font-semibold">Señor de la Exaltación</h2>
        <p className="text-sm text-gold mt-2">Parroquia Pasionista · Obrajes, La Paz</p>
      </div>
      <div className="space-y-2 text-sm">
        <p className="flex items-center gap-2">
          <MapPin size={16} />Calle 8 de Obrajes · La Paz, Bolivia</p>
        <p className="flex items-center gap-2">
          <Phone size={16} />(2) 278 0000 — número de ejemplo</p>
        <p className="flex items-center gap-2">
          <Mail size={16} />Contacto por secretaría parroquial</p>
      </div>
    </div>
    <div className={`${anchoContenido} mt-10 border-t border-white/15 pt-6 text-xs text-white/40`}>Maqueta estática del Sprint 1 · Información demostrativa, sujeta a validación con la parroquia.</div>
  </footer>;
}
export default PiePagina;
