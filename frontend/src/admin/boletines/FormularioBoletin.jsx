import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, FileText, Image as ImageIcon, RefreshCw, Save } from 'lucide-react';

import { erroresDe, resumenDeErrores } from '../componentes/erroresFormulario.js';
import { formatearTamano } from '../multimedia/formato.js';
import SelectorImagenes from '../multimedia/SelectorImagenes.jsx';
import { Aviso, Boton, CampoTexto, useToast } from '../ui/index.js';
import { actualizarBoletin, CLAVE_BOLETINES, crearBoletin } from './api.js';
import { generarPortadaPdf } from './generarPortadaPdf.js';
import SelectorPdf from './SelectorPdf.jsx';

const CAMPO_DE_ERROR = {
  titulo: 'titulo',
  periodo: 'periodo',
  archivoId: 'archivo',
  portadaId: 'portada',
};
const MAX_TITULO = 150; // admin.md §11

function validarLocal(campos) {
  const errores = {};
  const titulo = campos.titulo.trim();
  if (!titulo) errores.titulo = 'El título es obligatorio.';
  else if (titulo.length > MAX_TITULO) errores.titulo = `El título puede tener hasta ${MAX_TITULO} caracteres.`;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(campos.periodo)) errores.periodo = 'Elige el mes y el año del boletín.';
  if (!campos.archivo) errores.archivo = 'Elige o sube el PDF del boletín.';
  return errores;
}

// Formulario de un boletín (admin.md §11): título, mes, PDF y portada opcional.
export default function FormularioBoletin({ boletin }) {
  const navegar = useNavigate();
  const clienteConsultas = useQueryClient();
  const toast = useToast();
  const avisos = useRef(null);
  const editando = Boolean(boletin);

  const [campos, setCampos] = useState(() => ({
    titulo: boletin?.titulo ?? '',
    periodo: boletin?.periodo.slice(0, 7) ?? '',
    archivo: boletin?.archivo ?? null,
    portada: boletin?.portada ?? null,
  }));
  const [errores, setErrores] = useState({});
  const [generales, setGenerales] = useState([]);
  const [eligiendo, setEligiendo] = useState(false);
  const [eligiendoPortada, setEligiendoPortada] = useState(false);
  const [generandoPortada, setGenerandoPortada] = useState(false);
  const [avisoPortada, setAvisoPortada] = useState('');

  const cambiar = (cambios) => setCampos((actuales) => ({ ...actuales, ...cambios }));

  function mostrar(porCampo, avisosGenerales = []) {
    setErrores(porCampo);
    setGenerales(avisosGenerales);
    requestAnimationFrame(() => avisos.current?.focus());
  }

  async function intentarGenerarPortada(archivoPdf, tituloActual) {
    if (!archivoPdf?.url) return;
    setGenerandoPortada(true);
    setAvisoPortada('');

    try {
      const imagenSubida = await generarPortadaPdf({
        urlPdf: archivoPdf.url,
        titulo: tituloActual,
        nombreOriginal: archivoPdf.nombreOriginal,
      });
      setCampos((actuales) => ({ ...actuales, portada: imagenSubida }));
    } catch {
      setAvisoPortada(
        'No se pudo generar automáticamente la miniatura de la portada. Puedes guardar el boletín igual o elegir una imagen de la biblioteca.',
      );
    } finally {
      setGenerandoPortada(false);
    }
  }

  const guardar = useMutation({
    mutationFn: (cuerpo) => (editando ? actualizarBoletin(boletin.id, cuerpo) : crearBoletin(cuerpo)),
    onSuccess: (guardado) => {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_BOLETINES });
      const mensaje = editando
        ? `Se guardaron los cambios de «${guardado.titulo}».`
        : `Se publicó el boletín «${guardado.titulo}».`;
      toast.exito(mensaje);
      navegar('/admin/boletines', { state: { aviso: mensaje } });
    },
    onError: (error) => {
      const { errores: porCampo, generales: g } = erroresDe(error, CAMPO_DE_ERROR);
      mostrar(porCampo, g);
    },
  });

  function enviar(evento) {
    evento.preventDefault();
    const locales = validarLocal(campos);
    if (Object.keys(locales).length) {
      mostrar(locales);
      return;
    }
    guardar.mutate({
      titulo: campos.titulo.trim(),
      periodo: campos.periodo,
      archivoId: campos.archivo.id,
      portadaId: campos.portada?.id ?? null,
    });
  }

  const mensajes = resumenDeErrores(errores, generales);

  return (
    <form onSubmit={enviar} noValidate className="mt-6 flex flex-col gap-5 rounded-lg border border-sand bg-white p-5 sm:p-6">
      <div ref={avisos} tabIndex={-1} className="outline-none">
        {mensajes.length > 0 && (
          <Aviso tipo="error" titulo="No se pudo guardar. Revisa lo siguiente:">
            <ul className="mt-1 list-disc pl-5">
              {mensajes.map((m, i) => (
                <li key={`${i}-${m}`}>{m}</li>
              ))}
            </ul>
          </Aviso>
        )}
      </div>

      <CampoTexto
        etiqueta="Título"
        value={campos.titulo}
        onChange={(e) => cambiar({ titulo: e.target.value })}
        error={errores.titulo}
        maxLength={MAX_TITULO}
        required
        autoComplete="off"
        placeholder="Edición de noviembre 2026"
      />

      <CampoTexto
        etiqueta="Mes del boletín"
        type="month"
        value={campos.periodo}
        onChange={(e) => cambiar({ periodo: e.target.value })}
        error={errores.periodo}
        // Firefox de escritorio y Safari no tienen selector de mes: el campo funciona como texto, con el mismo formato.
        placeholder="AAAA-MM"
        pattern="\d{4}-(0[1-9]|1[0-2])"
        ayuda="Solo puede haber un boletín por mes. Si tu navegador no muestra un selector, escribe año y mes así: 2026-11."
        required
      />

      <fieldset aria-describedby={errores.archivo ? 'error-archivo' : undefined} className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-ink">Archivo PDF</legend>
        {campos.archivo ? (
          <p className="flex items-start gap-2.5 rounded-md border border-sand bg-panel p-3 text-sm">
            <FileText className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block break-words font-semibold text-ink">{campos.archivo.nombreOriginal}</span>
              <span className="block text-xs text-muted">{formatearTamano(campos.archivo.tamanoBytes)}</span>
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted">Todavía no elegiste el PDF.</p>
        )}
        {errores.archivo && (
          <p id="error-archivo" className="flex items-start gap-1.5 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>{errores.archivo}</span>
          </p>
        )}
        <div>
          <Boton variante="secundario" tamano="sm" onClick={() => setEligiendo(true)}>
            {campos.archivo ? (editando ? 'Reemplazar PDF' : 'Cambiar PDF') : 'Elegir PDF'}
          </Boton>
        </div>
      </fieldset>

      <fieldset aria-describedby={errores.portada ? 'error-portada' : undefined} className="flex flex-col gap-3 border-t border-sand pt-4">
        <legend className="text-sm font-semibold text-ink">Miniatura de la portada (opcional)</legend>

        {generandoPortada && (
          <p className="text-sm text-muted" aria-live="polite">
            Generando miniatura de la primera página…
          </p>
        )}

        {avisoPortada && (
          <Aviso tipo="advertencia" titulo="Aviso sobre la portada">
            {avisoPortada}
          </Aviso>
        )}

        {campos.portada ? (
          <div className="flex flex-wrap items-start gap-4">
            <img
              src={campos.portada.url}
              alt={campos.portada.textoAlternativo || `Portada del ${campos.titulo || 'boletín'}`}
              className="aspect-[210/297] w-28 rounded-sm border border-sand bg-white object-cover shadow-sm"
            />
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted">Se muestra en la tarjeta del boletín en el portal.</p>
              <div className="flex flex-wrap gap-2">
                <Boton
                  variante="secundario"
                  tamano="sm"
                  icono={ImageIcon}
                  onClick={() => setEligiendoPortada(true)}
                >
                  Cambiar portada
                </Boton>
                {campos.archivo && (
                  <Boton
                    variante="secundario"
                    tamano="sm"
                    icono={RefreshCw}
                    cargando={generandoPortada}
                    onClick={() => intentarGenerarPortada(campos.archivo, campos.titulo)}
                  >
                    Volver a generar
                  </Boton>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">
              {campos.archivo
                ? 'Este boletín no tiene miniatura de portada.'
                : 'Al elegir o subir el PDF se generará automáticamente la miniatura de la primera página.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {campos.archivo && (
                <Boton
                  variante="secundario"
                  tamano="sm"
                  icono={RefreshCw}
                  cargando={generandoPortada}
                  onClick={() => intentarGenerarPortada(campos.archivo, campos.titulo)}
                >
                  Generar portada
                </Boton>
              )}
              <Boton
                variante="secundario"
                tamano="sm"
                icono={ImageIcon}
                onClick={() => setEligiendoPortada(true)}
              >
                Cambiar portada
              </Boton>
            </div>
          </div>
        )}

        {errores.portada && (
          <p id="error-portada" className="flex items-start gap-1.5 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>{errores.portada}</span>
          </p>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-sand pt-5">
        <Boton type="submit" variante="primario" icono={Save} cargando={guardar.isPending}>
          {editando ? 'Guardar cambios' : 'Publicar boletín'}
        </Boton>
        <Boton como={Link} to="/admin/boletines" variante="secundario">
          Cancelar
        </Boton>
      </div>

      {eligiendo && (
        <SelectorPdf
          seleccionadoId={campos.archivo?.id}
          onCerrar={() => setEligiendo(false)}
          onSeleccionar={(archivo) => {
            cambiar({ archivo });
            setErrores((e) => ({ ...e, archivo: undefined }));
            setEligiendo(false);
            intentarGenerarPortada(archivo, campos.titulo);
          }}
        />
      )}

      {eligiendoPortada && (
        <SelectorImagenes
          titulo="Portada del boletín"
          onCerrar={() => setEligiendoPortada(false)}
          onSeleccionar={(imagen) => {
            cambiar({ portada: imagen });
            setAvisoPortada('');
            setErrores((e) => ({ ...e, portada: undefined }));
            setEligiendoPortada(false);
          }}
        />
      )}
    </form>
  );
}
