import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, FileText, Loader2, Save } from 'lucide-react';

import CampoTexto from '../componentes/CampoTexto.jsx';
import { erroresDe } from '../componentes/erroresFormulario.js';
import { formatearTamano } from '../multimedia/formato.js';
import { actualizarBoletin, CLAVE_BOLETINES, crearBoletin } from './api.js';
import SelectorPdf from './SelectorPdf.jsx';

const CAMPO_DE_ERROR = { titulo: 'titulo', periodo: 'periodo', archivoId: 'archivo' };
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

// Formulario de un boletín (admin.md §11): título, mes y el PDF de la biblioteca multimedia.
// `boletin` (opcional): el que se edita (el PDF se puede reemplazar).
export default function FormularioBoletin({ boletin }) {
  const navegar = useNavigate();
  const clienteConsultas = useQueryClient();
  const avisos = useRef(null);
  const editando = Boolean(boletin);

  const [campos, setCampos] = useState(() => ({
    titulo: boletin?.titulo ?? '',
    periodo: boletin?.periodo.slice(0, 7) ?? '',
    archivo: boletin?.archivo ?? null,
  }));
  const [errores, setErrores] = useState({});
  const [generales, setGenerales] = useState([]);
  const [eligiendo, setEligiendo] = useState(false);
  const cambiar = (cambios) => setCampos((actuales) => ({ ...actuales, ...cambios }));

  function mostrar(porCampo, avisosGenerales = []) {
    setErrores(porCampo);
    setGenerales(avisosGenerales);
    requestAnimationFrame(() => avisos.current?.focus());
  }

  const guardar = useMutation({
    mutationFn: (cuerpo) => (editando ? actualizarBoletin(boletin.id, cuerpo) : crearBoletin(cuerpo)),
    onSuccess: (guardado) => {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_BOLETINES });
      navegar('/admin/boletines', {
        state: { aviso: editando ? `Se guardaron los cambios de «${guardado.titulo}».` : `Se publicó el boletín «${guardado.titulo}».` },
      });
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
    guardar.mutate({ titulo: campos.titulo.trim(), periodo: campos.periodo, archivoId: campos.archivo.id });
  }

  const mensajes = [...Object.values(errores), ...generales];

  return (
    <form onSubmit={enviar} noValidate className="mt-6 flex flex-col gap-5">
      <div ref={avisos} tabIndex={-1} className="outline-none">
        {mensajes.length > 0 && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-redParish/30 bg-redParish/5 p-4 text-sm text-redParish">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">No se pudo guardar. Revisa lo siguiente:</p>
              <ul className="mt-1 list-disc pl-5">
                {mensajes.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          </div>
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
          <p className="flex items-start gap-2 rounded-md border border-borderSoft bg-white p-3 text-sm">
            <FileText className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block break-words font-semibold">{campos.archivo.nombreOriginal}</span>
              <span className="block text-xs text-muted">{formatearTamano(campos.archivo.tamanoBytes)}</span>
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted">Todavía no elegiste el PDF.</p>
        )}
        {errores.archivo && (
          <p id="error-archivo" className="text-sm text-redParish">
            {errores.archivo}
          </p>
        )}
        <div>
          <button
            type="button"
            onClick={() => setEligiendo(true)}
            className="rounded-md border border-borderSoft bg-white px-3 py-2 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
          >
            {campos.archivo ? (editando ? 'Reemplazar PDF' : 'Cambiar PDF') : 'Elegir PDF'}
          </button>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-borderSoft pt-5">
        <button
          type="submit"
          disabled={guardar.isPending}
          className="flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {guardar.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          {editando ? 'Guardar cambios' : 'Publicar boletín'}
        </button>
        <Link
          to="/admin/boletines"
          className="rounded-md border border-borderSoft bg-white px-4 py-2.5 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
        >
          Cancelar
        </Link>
      </div>

      {eligiendo && (
        <SelectorPdf
          seleccionadoId={campos.archivo?.id}
          onSeleccionar={(archivo) => {
            cambiar({ archivo });
            setEligiendo(false);
          }}
          onCerrar={() => setEligiendo(false)}
        />
      )}
    </form>
  );
}
