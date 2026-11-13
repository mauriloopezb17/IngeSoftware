import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';

import CampoTexto from '../../componentes/CampoTexto.jsx';
import SelectorImagenes from '../../multimedia/SelectorImagenes.jsx';
import CampoArea from '../componentes/CampoArea.jsx';
import CampoSelect from '../componentes/CampoSelect.jsx';
import { extraerErroresApi } from '../componentes/errores.js';
import { actualizarSede, CLAVE_SEDES } from './api.js';

export default function FormularioSede({
  sede,
  catalogoRedes,
  puedeEditar,
  puedeGestionarSedes,
  onGuardado,
}) {
  const idActivo = useId();
  const queryClient = useQueryClient();

  const [nombre, setNombre] = useState(sede.nombre ?? '');
  const [slug, setSlug] = useState(sede.slug ?? '');
  const [activo, setActivo] = useState(sede.activo ?? true);
  const [direccion, setDireccion] = useState(sede.direccion ?? '');
  const [telefono, setTelefono] = useState(sede.telefono ?? '');
  const [whatsapp, setWhatsapp] = useState(sede.whatsapp ?? '');
  const [correo, setCorreo] = useState(sede.correo ?? '');
  const [latitud, setLatitud] = useState(
    sede.ubicacion?.latitud != null ? String(sede.ubicacion.latitud) : '',
  );
  const [longitud, setLongitud] = useState(
    sede.ubicacion?.longitud != null ? String(sede.ubicacion.longitud) : '',
  );
  const [imagenPortada, setImagenPortada] = useState(sede.imagenPortada ?? null);
  const [selectorAbierto, setSelectorAbierto] = useState(false);

  const cfg = sede.configuracion ?? {};
  const [textoBarraSuperior, setTextoBarraSuperior] = useState(cfg.textoBarraSuperior ?? '');
  const [textoWhatsapp, setTextoWhatsapp] = useState(cfg.textoWhatsapp ?? '');
  const [enlaceComoLlegar, setEnlaceComoLlegar] = useState(cfg.enlaceComoLlegar ?? '');
  const [enlaceMessenger, setEnlaceMessenger] = useState(cfg.enlaceMessenger ?? '');
  const [textoMessenger, setTextoMessenger] = useState(cfg.textoMessenger ?? '');
  const [descripcionPie, setDescripcionPie] = useState(cfg.descripcionPie ?? '');
  const [textoCopyright, setTextoCopyright] = useState(cfg.textoCopyright ?? '');
  const [textoCreditos, setTextoCreditos] = useState(cfg.textoCreditos ?? '');
  const [horariosIntroduccion, setHorariosIntroduccion] = useState(cfg.horariosIntroduccion ?? '');
  const [horariosWhatsappSecretaria, setHorariosWhatsappSecretaria] = useState(
    cfg.horariosWhatsappSecretaria ?? '',
  );
  const [notaConfesiones, setNotaConfesiones] = useState(
    cfg.horariosNotas?.confesionesAdoracion ?? '',
  );
  const [notaSecretaria, setNotaSecretaria] = useState(cfg.horariosNotas?.secretaria ?? '');

  const [redes, setRedes] = useState(() =>
    (sede.redesSociales ?? []).map((r) => ({ redSocialId: String(r.id), url: r.url })),
  );

  const [erroresCampo, setErroresCampo] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: (cuerpo) => actualizarSede(sede.id, cuerpo),
    onSuccess: (actualizada) => {
      queryClient.invalidateQueries({ queryKey: CLAVE_SEDES });
      onGuardado(actualizada);
    },
    onError: (err) => {
      const { general, campos } = extraerErroresApi(err);
      setErroresCampo(campos);
      setErrorGeneral(general);
    },
  });

  const deshabilitado = !puedeEditar || isPending;

  function agregarRed() {
    const primera = catalogoRedes[0]?.id ?? '';
    setRedes((prev) => [...prev, { redSocialId: String(primera), url: '' }]);
  }

  function actualizarRed(indice, campo, valor) {
    setRedes((prev) => prev.map((r, i) => (i === indice ? { ...r, [campo]: valor } : r)));
  }

  function quitarRed(indice) {
    setRedes((prev) => prev.filter((_, i) => i !== indice));
  }

  function enviar(evento) {
    evento.preventDefault();
    if (!puedeEditar) return;
    setErroresCampo({});
    setErrorGeneral('');

    const tieneLat = latitud.trim() !== '';
    const tieneLon = longitud.trim() !== '';

    const cuerpo = {
      nombre: nombre.trim(),
      direccion: direccion.trim() || null,
      telefono: telefono.trim() || null,
      whatsapp: whatsapp.trim() || null,
      correo: correo.trim() || null,
      imagenPortadaId: imagenPortada?.id ?? null,
      configuracion: {
        textoBarraSuperior: textoBarraSuperior.trim() || null,
        textoWhatsapp: textoWhatsapp.trim() || null,
        enlaceComoLlegar: enlaceComoLlegar.trim() || null,
        enlaceMessenger: enlaceMessenger.trim() || null,
        textoMessenger: textoMessenger.trim() || null,
        descripcionPie: descripcionPie.trim() || null,
        textoCopyright: textoCopyright.trim() || null,
        textoCreditos: textoCreditos.trim() || null,
        horariosIntroduccion: horariosIntroduccion.trim() || null,
        horariosWhatsappSecretaria: horariosWhatsappSecretaria.trim() || null,
        horariosNotas:
          notaConfesiones.trim() || notaSecretaria.trim()
            ? {
                confesionesAdoracion: notaConfesiones.trim() || null,
                secretaria: notaSecretaria.trim() || null,
              }
            : null,
      },
      redesSociales: redes.map((r) => ({
        redSocialId: Number(r.redSocialId),
        url: r.url.trim(),
      })),
    };

    if (tieneLat && tieneLon) {
      cuerpo.latitud = Number(latitud);
      cuerpo.longitud = Number(longitud);
    } else if (tieneLat !== tieneLon) {
      if (tieneLat) cuerpo.latitud = Number(latitud);
      else cuerpo.longitud = Number(longitud);
    } else {
      cuerpo.latitud = null;
      cuerpo.longitud = null;
    }

    if (puedeGestionarSedes) {
      cuerpo.slug = slug.trim();
      cuerpo.activo = activo;
    }

    mutate(cuerpo);
  }

  return (
    <>
      <form onSubmit={enviar} noValidate className="flex flex-col gap-6">
        {errorGeneral && (
          <p
            role="alert"
            className="rounded-md border border-redParish/30 bg-redParish/5 px-3 py-2 text-sm text-redParish"
          >
            {errorGeneral}
          </p>
        )}

        <fieldset className="rounded-lg border border-borderSoft bg-white p-5">
          <legend className="px-1 font-display text-2xl font-semibold text-ink">
            Datos generales
          </legend>
          <div className="mt-3 flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoTexto
                etiqueta="Nombre de la sede"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={120}
                error={erroresCampo.nombre}
                disabled={deshabilitado}
              />
              {puedeGestionarSedes && (
                <CampoTexto
                  etiqueta="Slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  error={erroresCampo.slug}
                  disabled={deshabilitado}
                />
              )}
            </div>

            <CampoTexto
              etiqueta="Dirección"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              maxLength={255}
              error={erroresCampo.direccion}
              disabled={deshabilitado}
            />

            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-ink">Imagen de portada</span>
              {imagenPortada ? (
                <div className="flex flex-wrap items-center gap-4 rounded-lg border border-borderSoft bg-cream/40 p-3">
                  <img
                    src={imagenPortada.url}
                    alt={imagenPortada.textoAlternativo || nombre || 'Portada de la sede'}
                    className="h-20 w-32 rounded-md object-cover"
                  />
                  {puedeEditar && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectorAbierto(true)}
                        disabled={isPending}
                        className="rounded-md border border-borderSoft bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-stone"
                      >
                        Cambiar imagen
                      </button>
                      <button
                        type="button"
                        onClick={() => setImagenPortada(null)}
                        disabled={isPending}
                        className="flex items-center gap-1 rounded-md border border-redParish/30 bg-white px-3 py-1.5 text-sm font-medium text-redParish hover:bg-redParish/5"
                      >
                        <X className="size-4" aria-hidden="true" />
                        Quitar imagen
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                puedeEditar && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setSelectorAbierto(true)}
                      disabled={isPending}
                      className="flex items-center gap-2 rounded-md border border-borderSoft bg-white px-3.5 py-2 text-sm font-medium text-ink hover:bg-stone"
                    >
                      <ImagePlus className="size-4 text-goldDark" aria-hidden="true" />
                      Elegir imagen
                    </button>
                  </div>
                )
              )}
            </div>

            {puedeGestionarSedes && (
              <label htmlFor={idActivo} className="flex items-center gap-2.5 text-sm font-medium text-ink">
                <input
                  id={idActivo}
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  disabled={deshabilitado}
                  className="size-4 rounded border-borderSoft accent-goldDark"
                />
                Sede activa en el portal
              </label>
            )}
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-borderSoft bg-white p-5">
          <legend className="px-1 font-display text-2xl font-semibold text-ink">
            Contacto y ubicación
          </legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <CampoTexto
              etiqueta="Teléfono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              error={erroresCampo.telefono}
              disabled={deshabilitado}
            />
            <CampoTexto
              etiqueta="WhatsApp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+591 71234567"
              error={erroresCampo.whatsapp}
              disabled={deshabilitado}
            />
            <CampoTexto
              etiqueta="Correo electrónico"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              error={erroresCampo.correo}
              disabled={deshabilitado}
            />
            <div className="grid grid-cols-2 gap-3">
              <CampoTexto
                etiqueta="Latitud"
                value={latitud}
                onChange={(e) => setLatitud(e.target.value)}
                error={erroresCampo.latitud}
                disabled={deshabilitado}
              />
              <CampoTexto
                etiqueta="Longitud"
                value={longitud}
                onChange={(e) => setLongitud(e.target.value)}
                error={erroresCampo.longitud}
                disabled={deshabilitado}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-borderSoft bg-white p-5">
          <legend className="px-1 font-display text-2xl font-semibold text-ink">
            Configuración del portal
          </legend>
          <div className="mt-3 flex flex-col gap-4">
            <CampoTexto
              etiqueta="Aviso en la barra superior"
              value={textoBarraSuperior}
              onChange={(e) => setTextoBarraSuperior(e.target.value)}
              disabled={deshabilitado}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoTexto
                etiqueta="Etiqueta de WhatsApp"
                value={textoWhatsapp}
                onChange={(e) => setTextoWhatsapp(e.target.value)}
                disabled={deshabilitado}
              />
              <CampoTexto
                etiqueta="Enlace «Cómo llegar»"
                value={enlaceComoLlegar}
                onChange={(e) => setEnlaceComoLlegar(e.target.value)}
                disabled={deshabilitado}
              />
              <CampoTexto
                etiqueta="Enlace de Messenger"
                value={enlaceMessenger}
                onChange={(e) => setEnlaceMessenger(e.target.value)}
                disabled={deshabilitado}
              />
              <CampoTexto
                etiqueta="Texto de Messenger"
                value={textoMessenger}
                onChange={(e) => setTextoMessenger(e.target.value)}
                disabled={deshabilitado}
              />
            </div>

            <CampoArea
              etiqueta="Introducción de horarios"
              value={horariosIntroduccion}
              onChange={(e) => setHorariosIntroduccion(e.target.value)}
              rows={2}
              disabled={deshabilitado}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <CampoTexto
                etiqueta="Nota de confesiones y adoración"
                value={notaConfesiones}
                onChange={(e) => setNotaConfesiones(e.target.value)}
                disabled={deshabilitado}
              />
              <CampoTexto
                etiqueta="Nota de secretaría"
                value={notaSecretaria}
                onChange={(e) => setNotaSecretaria(e.target.value)}
                disabled={deshabilitado}
              />
              <CampoTexto
                etiqueta="WhatsApp de secretaría (horarios)"
                value={horariosWhatsappSecretaria}
                onChange={(e) => setHorariosWhatsappSecretaria(e.target.value)}
                disabled={deshabilitado}
              />
            </div>

            <CampoArea
              etiqueta="Descripción del pie de página"
              value={descripcionPie}
              onChange={(e) => setDescripcionPie(e.target.value)}
              rows={2}
              disabled={deshabilitado}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoTexto
                etiqueta="Texto de copyright"
                value={textoCopyright}
                onChange={(e) => setTextoCopyright(e.target.value)}
                disabled={deshabilitado}
              />
              <CampoTexto
                etiqueta="Texto de créditos"
                value={textoCreditos}
                onChange={(e) => setTextoCreditos(e.target.value)}
                disabled={deshabilitado}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-borderSoft bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <legend className="px-1 font-display text-2xl font-semibold text-ink">
              Redes sociales
            </legend>
            {puedeEditar && (
              <button
                type="button"
                onClick={agregarRed}
                disabled={isPending || catalogoRedes.length === 0}
                className="flex items-center gap-1 rounded-md border border-borderSoft bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Agregar red social
              </button>
            )}
          </div>

          {redes.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No hay redes sociales configuradas.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3" aria-label="Redes sociales de la sede">
              {redes.map((red, i) => (
                <li
                  key={i}
                  className="grid gap-3 rounded-md border border-borderSoft bg-cream/40 p-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end"
                >
                  <CampoSelect
                    etiqueta={`Red social ${i + 1}`}
                    value={red.redSocialId}
                    onChange={(e) => actualizarRed(i, 'redSocialId', e.target.value)}
                    error={erroresCampo[`redesSociales.${i}.redSocialId`]}
                    disabled={deshabilitado}
                  >
                    {catalogoRedes.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </option>
                    ))}
                  </CampoSelect>

                  <CampoTexto
                    etiqueta={`URL ${i + 1}`}
                    value={red.url}
                    onChange={(e) => actualizarRed(i, 'url', e.target.value)}
                    placeholder="https://..."
                    error={erroresCampo[`redesSociales.${i}.url`]}
                    disabled={deshabilitado}
                  />

                  {puedeEditar && (
                    <button
                      type="button"
                      onClick={() => quitarRed(i)}
                      disabled={isPending}
                      aria-label={`Quitar red social ${i + 1}`}
                      className="flex items-center justify-center rounded-md border border-redParish/30 bg-white p-2.5 text-redParish hover:bg-redParish/5"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        {puedeEditar && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {isPending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </form>

      {selectorAbierto && (
        <SelectorImagenes
          titulo="Elegir imagen de portada"
          onCerrar={() => setSelectorAbierto(false)}
          onSeleccionar={(elegida) => {
            setImagenPortada(elegida);
            setSelectorAbierto(false);
          }}
        />
      )}
    </>
  );
}

