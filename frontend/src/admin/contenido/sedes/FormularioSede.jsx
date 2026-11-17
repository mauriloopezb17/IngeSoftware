import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Plus, Trash2, X } from 'lucide-react';

import SelectorImagenes from '../../multimedia/SelectorImagenes.jsx';
import { Aviso, Boton, CampoArea, CampoCasilla, CampoSelect, CampoTexto } from '../../ui/index.js';
import { extraerErroresApi } from '../componentes/errores.js';
import { actualizarSede, CLAVE_SEDES } from './api.js';

export default function FormularioSede({
  sede,
  catalogoRedes,
  puedeEditar,
  puedeGestionarSedes,
  onGuardado,
}) {
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
          <Aviso tipo="error">
            <p>{errorGeneral}</p>
          </Aviso>
        )}

        <fieldset className="rounded-lg border border-sand bg-white p-5 sm:p-6">
          <legend className="px-1 font-body text-lg font-semibold text-ink">
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
                <div className="flex flex-wrap items-center gap-4 rounded-lg border border-sand bg-panel p-3">
                  <img
                    src={imagenPortada.url}
                    alt={imagenPortada.textoAlternativo || nombre || 'Portada de la sede'}
                    className="h-20 w-32 rounded-md object-cover"
                  />
                  {puedeEditar && (
                    <div className="flex flex-wrap gap-2">
                      <Boton
                        variante="secundario"
                        tamano="sm"
                        onClick={() => setSelectorAbierto(true)}
                        disabled={isPending}
                      >
                        Cambiar imagen
                      </Boton>
                      <Boton
                        variante="peligro"
                        tamano="sm"
                        icono={X}
                        onClick={() => setImagenPortada(null)}
                        disabled={isPending}
                      >
                        Quitar imagen
                      </Boton>
                    </div>
                  )}
                </div>
              ) : (
                puedeEditar && (
                  <div>
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      icono={ImagePlus}
                      onClick={() => setSelectorAbierto(true)}
                      disabled={isPending}
                    >
                      Elegir imagen
                    </Boton>
                  </div>
                )
              )}
            </div>

            {puedeGestionarSedes && (
              <CampoCasilla
                etiqueta="Sede activa en el portal"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                disabled={deshabilitado}
              />
            )}
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-sand bg-white p-5 sm:p-6">
          <legend className="px-1 font-body text-lg font-semibold text-ink">
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

        <fieldset className="rounded-lg border border-sand bg-white p-5 sm:p-6">
          <legend className="px-1 font-body text-lg font-semibold text-ink">
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

        <fieldset className="rounded-lg border border-sand bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <legend className="px-1 font-body text-lg font-semibold text-ink">
              Redes sociales
            </legend>
            {puedeEditar && (
              <Boton
                variante="secundario"
                tamano="sm"
                icono={Plus}
                onClick={agregarRed}
                disabled={isPending || catalogoRedes.length === 0}
              >
                Agregar red social
              </Boton>
            )}
          </div>

          {redes.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No hay redes sociales configuradas.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3" aria-label="Redes sociales de la sede">
              {redes.map((red, i) => (
                <li
                  key={i}
                  className="grid gap-3 rounded-md border border-sand bg-panel p-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end"
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
                    <Boton
                      variante="secundario"
                      onClick={() => quitarRed(i)}
                      disabled={isPending}
                      aria-label={`Quitar red social ${i + 1}`}
                    >
                      <Trash2 className="size-4 text-danger" aria-hidden="true" />
                    </Boton>
                  )}
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        {puedeEditar && (
          <div className="flex justify-end">
            <Boton type="submit" variante="primario" cargando={isPending}>
              {isPending ? 'Guardando…' : 'Guardar cambios'}
            </Boton>
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
