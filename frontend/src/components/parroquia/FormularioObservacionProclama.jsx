import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Send } from 'lucide-react';

import { SEDE_ACTUAL } from '../../config/sede.js';
import {
  enviarObservacionProclama,
  obtenerVerificacionObservacion,
} from '../../services/portal.js';

function validarCampo(nombre, valores) {
  const valor = (valores[nombre] ?? '').trim();
  if (nombre === 'nombreCompleto') {
    const limpio = valor.replace(/\s+/g, ' ');
    if (limpio.length === 0) return '';
    if (limpio.length < 3) return 'Si escribes tu nombre, debe tener al menos 3 caracteres.';
    if (limpio.length > 120) return 'Puede tener hasta 120 caracteres.';
    return '';
  }
  if (nombre === 'correo') {
    if (!valor) return '';
    if (valor.length > 120) return 'Puede tener hasta 120 caracteres.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) return 'Escribe un correo electrónico válido.';
    return '';
  }
  if (nombre === 'telefono') {
    if (!valor) return '';
    if (valor.length > 30) return 'Puede tener hasta 30 caracteres.';
    if (!/^\+?[\d\s-]+$/.test(valor)) return 'Solo puede contener +, dígitos, espacios y guiones.';
    const digitos = valor.replace(/\D/g, '').length;
    if (digitos < 7 || digitos > 15) return 'Debe tener entre 7 y 15 dígitos.';
    return '';
  }
  if (nombre === 'mensaje') {
    if (valor.length < 10) return 'Escribe al menos 10 caracteres.';
    if (valor.length > 2000) return 'Puede tener hasta 2000 caracteres.';
    return '';
  }
  return '';
}

function validarTodo(valores) {
  const errores = {};
  for (const campo of ['nombreCompleto', 'correo', 'telefono', 'mensaje']) {
    const msg = validarCampo(campo, valores);
    if (msg) errores[campo] = msg;
  }
  if (!valores.correo.trim() && !valores.telefono.trim()) {
    errores.contacto = 'Escribe tu correo o tu teléfono para que el párroco pueda responderte.';
  }
  return errores;
}

export default function FormularioObservacionProclama({ proclamaId, sede = SEDE_ACTUAL }) {
  const idNombre = useId();
  const idCorreo = useId();
  const idTelefono = useId();
  const idMensaje = useId();
  const idErrorContacto = useId();
  const idErrorGeneral = useId();

  const nombreRef = useRef(null);
  const correoRef = useRef(null);
  const telefonoRef = useRef(null);
  const mensajeRef = useRef(null);
  const errorGeneralRef = useRef(null);
  const confirmacionRef = useRef(null);

  const [valores, setValores] = useState({
    nombreCompleto: '',
    correo: '',
    telefono: '',
    mensaje: '',
    sitioWeb: '',
  });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviado, setEnviado] = useState(false);

  const { data: datosVerificacion, refetch: recargarToken } = useQuery({
    queryKey: ['observacion-verificacion', sede, proclamaId],
    queryFn: ({ signal }) => obtenerVerificacionObservacion(sede, proclamaId, signal),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const tokenVerificacion = datosVerificacion?.token ?? '';

  useEffect(() => {
    if (enviado) confirmacionRef.current?.focus();
  }, [enviado]);

  const mutacion = useMutation({
    mutationFn: (cuerpo) => enviarObservacionProclama(sede, proclamaId, cuerpo),
    onSuccess: () => {
      setEnviado(true);
      setValores({ nombreCompleto: '', correo: '', telefono: '', mensaje: '', sitioWeb: '' });
      setErrores({});
      setErrorGeneral('');
    },
    onError: (err) => {
      if (err?.estado === 429) {
        setErrorGeneral(
          err.message || 'Has enviado demasiadas observaciones en poco tiempo. Inténtalo más tarde.',
        );
        requestAnimationFrame(() => errorGeneralRef.current?.focus());
        return;
      }
      if (Array.isArray(err?.detalles) && err.detalles.length > 0) {
        const errVerificacion = err.detalles.find((d) => d.campo === 'verificacion');
        if (errVerificacion) {
          setErrorGeneral(errVerificacion.mensaje);
          recargarToken();
          requestAnimationFrame(() => errorGeneralRef.current?.focus());
          return;
        }
        const siguientes = {};
        for (const d of err.detalles) {
          if (d.campo && !siguientes[d.campo]) siguientes[d.campo] = d.mensaje;
        }
        setErrores(siguientes);
        enfocarPrimerError(siguientes);
        return;
      }
      setErrorGeneral(err?.message || 'No pudimos enviar tu mensaje. Inténtalo de nuevo.');
      requestAnimationFrame(() => errorGeneralRef.current?.focus());
    },
  });

  function enfocarPrimerError(mapa) {
    if (mapa.nombreCompleto) nombreRef.current?.focus();
    else if (mapa.correo || mapa.contacto) correoRef.current?.focus();
    else if (mapa.telefono) telefonoRef.current?.focus();
    else if (mapa.mensaje) mensajeRef.current?.focus();
  }

  function actualizar(campo, valor) {
    const siguientes = { ...valores, [campo]: valor };
    setValores(siguientes);
    if (errores[campo] || (errores.contacto && (campo === 'correo' || campo === 'telefono'))) {
      setErrores((actual) => {
        const copia = { ...actual };
        delete copia[campo];
        if (campo === 'correo' || campo === 'telefono') delete copia.contacto;
        return copia;
      });
    }
  }

  function alSalir(campo) {
    const msg = validarCampo(campo, valores);
    setErrores((actual) => {
      const copia = { ...actual };
      if (msg) copia[campo] = msg;
      else delete copia[campo];
      if ((campo === 'correo' || campo === 'telefono') && (valores.correo.trim() || valores.telefono.trim())) {
        delete copia.contacto;
      }
      return copia;
    });
  }

  function manejarEnvio(evento) {
    evento.preventDefault();
    if (mutacion.isPending) return;
    setErrorGeneral('');

    const locales = validarTodo(valores);
    if (Object.keys(locales).length > 0) {
      setErrores(locales);
      enfocarPrimerError(locales);
      return;
    }

    mutacion.mutate({
      nombreCompleto: valores.nombreCompleto.trim().replace(/\s+/g, ' ') || null,
      correo: valores.correo.trim() || null,
      telefono: valores.telefono.trim() || null,
      mensaje: valores.mensaje.trim(),
      sitioWeb: valores.sitioWeb,
      verificacion: tokenVerificacion,
    });
  }

  if (enviado) {
    return (
      <div
        ref={confirmacionRef}
        tabIndex={-1}
        role="status"
        className="rounded-md border border-sand bg-cream p-6 outline-none md:p-8"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
          <div>
            <p className="font-display text-h3 font-semibold text-ink">
              Gracias. Tu mensaje llegó al párroco.
            </p>
            <p className="mt-2 font-body text-meta text-muted">
              Tu observación será revisada de forma confidencial.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-h2 font-semibold text-ink">
        ¿Conoces algún impedimento para este matrimonio?
      </h2>
      <p className="mt-3 rounded-sm border border-sand bg-cream px-4 py-3 font-body text-meta font-medium text-ink">
        Tu mensaje es confidencial: solo lo lee el párroco y no se publica. Tu correo o tu celular solo sirven para responderte.
      </p>

      {errorGeneral && (
        <div
          ref={errorGeneralRef}
          id={idErrorGeneral}
          tabIndex={-1}
          role="alert"
          className="mt-4 rounded-sm border border-danger/40 bg-danger-soft px-4 py-3 font-body text-meta font-medium text-danger outline-none"
        >
          {errorGeneral}
        </div>
      )}

      <form onSubmit={manejarEnvio} noValidate className="relative mt-6 flex flex-col gap-5">
        {/* Honeypot fuera de pantalla */}
        <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0">
          <label htmlFor={`sitio-web-${proclamaId}`}>Sitio web</label>
          <input
            id={`sitio-web-${proclamaId}`}
            type="text"
            name="sitioWeb"
            tabIndex={-1}
            autoComplete="off"
            value={valores.sitioWeb}
            onChange={(e) => actualizar('sitioWeb', e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={idNombre} className="font-body text-meta font-semibold text-ink">
            Tu nombre (opcional)
          </label>
          <input
            ref={nombreRef}
            id={idNombre}
            name="nombreCompleto"
            type="text"
            autoComplete="name"
            maxLength={120}
            value={valores.nombreCompleto}
            onChange={(e) => actualizar('nombreCompleto', e.target.value)}
            onBlur={() => alSalir('nombreCompleto')}
            aria-invalid={Boolean(errores.nombreCompleto)}
            aria-describedby={
              [`${idNombre}-ayuda`, errores.nombreCompleto ? `${idNombre}-error` : '']
                .filter(Boolean)
                .join(' ')
            }
            className="min-h-11 w-full rounded-sm border border-sand bg-white px-3.5 py-2.5 font-body text-ui text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
          <p id={`${idNombre}-ayuda`} className="font-body text-meta text-muted">
            Puedes dejarlo vacío: tu observación llega igual y nadie más la ve.
          </p>
          {errores.nombreCompleto && (
            <p id={`${idNombre}-error`} className="font-body text-meta text-danger">
              {errores.nombreCompleto}
            </p>
          )}
        </div>

        <fieldset className="flex flex-col gap-4 rounded-md border border-sand bg-cream/40 p-4">
          <legend className="px-1 font-body text-meta font-semibold text-ink">Datos de contacto</legend>
          <p className="font-body text-meta text-muted">
            Deja al menos uno de los dos para que el párroco pueda responderte
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={idCorreo} className="font-body text-meta font-semibold text-ink">
                Correo electrónico
              </label>
              <input
                ref={correoRef}
                id={idCorreo}
                name="correo"
                type="email"
                autoComplete="email"
                maxLength={120}
                value={valores.correo}
                onChange={(e) => actualizar('correo', e.target.value)}
                onBlur={() => alSalir('correo')}
                aria-invalid={Boolean(errores.correo || errores.contacto)}
                aria-describedby={
                  [errores.correo ? `${idCorreo}-error` : '', errores.contacto ? idErrorContacto : '']
                    .filter(Boolean)
                    .join(' ') || undefined
                }
                className="min-h-11 w-full rounded-sm border border-sand bg-white px-3.5 py-2.5 font-body text-ui text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              />
              {errores.correo && (
                <p id={`${idCorreo}-error`} className="font-body text-meta text-danger">
                  {errores.correo}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={idTelefono} className="font-body text-meta font-semibold text-ink">
                Teléfono
              </label>
              <input
                ref={telefonoRef}
                id={idTelefono}
                name="telefono"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={30}
                value={valores.telefono}
                onChange={(e) => actualizar('telefono', e.target.value)}
                onBlur={() => alSalir('telefono')}
                aria-invalid={Boolean(errores.telefono || errores.contacto)}
                aria-describedby={
                  [errores.telefono ? `${idTelefono}-error` : '', errores.contacto ? idErrorContacto : '']
                    .filter(Boolean)
                    .join(' ') || undefined
                }
                className="min-h-11 w-full rounded-sm border border-sand bg-white px-3.5 py-2.5 font-body text-ui text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              />
              {errores.telefono && (
                <p id={`${idTelefono}-error`} className="font-body text-meta text-danger">
                  {errores.telefono}
                </p>
              )}
            </div>
          </div>

          {errores.contacto && (
            <p id={idErrorContacto} role="alert" className="font-body text-meta text-danger">
              {errores.contacto}
            </p>
          )}
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={idMensaje} className="font-body text-meta font-semibold text-ink">
              Mensaje
            </label>
            <span className="font-body text-meta tabular-nums text-muted" aria-live="polite">
              {valores.mensaje.trim().length}/2000
            </span>
          </div>
          <textarea
            ref={mensajeRef}
            id={idMensaje}
            name="mensaje"
            rows={5}
            maxLength={2000}
            required
            value={valores.mensaje}
            onChange={(e) => actualizar('mensaje', e.target.value)}
            onBlur={() => alSalir('mensaje')}
            aria-invalid={Boolean(errores.mensaje)}
            aria-describedby={errores.mensaje ? `${idMensaje}-error` : undefined}
            className="w-full rounded-sm border border-sand bg-white px-3.5 py-2.5 font-body text-ui text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
          {errores.mensaje && (
            <p id={`${idMensaje}-error`} className="font-body text-meta text-danger">
              {errores.mensaje}
            </p>
          )}
        </div>

        <div>
          <button
            type="submit"
            disabled={mutacion.isPending}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-sm bg-gold px-6 py-2.5 font-body text-button font-semibold text-ink transition-colors duration-200 ease-salida hover:bg-gold-dark active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
          >
            <Send size={16} aria-hidden="true" />
            <span>{mutacion.isPending ? 'Enviando…' : 'Enviar al párroco'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
