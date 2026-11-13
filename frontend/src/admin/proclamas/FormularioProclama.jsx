import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2, Save } from 'lucide-react';

import CampoTexto from '../componentes/CampoTexto.jsx';
import { erroresDe } from '../componentes/erroresFormulario.js';
import { aCampoFecha, deCampoFecha } from '../publicaciones/fechas.js';
import { actualizarProclama, CLAVE_PROCLAMAS, crearProclama } from './api.js';

const CAMPO_DE_ERROR = {
  contrayente1: 'contrayente1',
  contrayente2: 'contrayente2',
  fechaMatrimonio: 'fechaMatrimonio',
  publicaciones: 'primera',
};

function validarLocal(campos, editando) {
  const errores = {};
  for (const campo of ['contrayente1', 'contrayente2']) {
    const valor = campos[campo].trim();
    if (!valor) errores[campo] = 'El nombre es obligatorio.';
    else if (valor.length > 150) errores[campo] = 'El nombre puede tener hasta 150 caracteres.';
  }
  if (!campos.fechaMatrimonio) errores.fechaMatrimonio = 'Indica la fecha y la hora del matrimonio.';
  else if (!editando && campos.primera && campos.primera >= campos.fechaMatrimonio.slice(0, 10))
    errores.primera = 'La primera proclama debe ser anterior al matrimonio.';
  return errores;
}

// Datos de una proclama: los nombres y la fecha del matrimonio. Al crear se puede indicar ya la primera
// publicación; las demás (hasta 3) se gestionan en la pantalla de la proclama.
export default function FormularioProclama({ proclama }) {
  const navegar = useNavigate();
  const clienteConsultas = useQueryClient();
  const avisos = useRef(null);
  const editando = Boolean(proclama);

  const [campos, setCampos] = useState(() => ({
    contrayente1: proclama?.contrayente1 ?? '',
    contrayente2: proclama?.contrayente2 ?? '',
    fechaMatrimonio: aCampoFecha(proclama?.fechaMatrimonio),
    primera: '',
  }));
  const [errores, setErrores] = useState({});
  const [generales, setGenerales] = useState([]);
  const [guardado, setGuardado] = useState('');
  const cambiar = (cambios) => setCampos((actuales) => ({ ...actuales, ...cambios }));

  function mostrar(porCampo, avisosGenerales = []) {
    setErrores(porCampo);
    setGenerales(avisosGenerales);
    setGuardado('');
    requestAnimationFrame(() => avisos.current?.focus());
  }

  const guardar = useMutation({
    mutationFn: (cuerpo) => (editando ? actualizarProclama(proclama.id, cuerpo) : crearProclama(cuerpo)),
    onSuccess: (resultado) => {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_PROCLAMAS });
      if (editando) {
        setErrores({});
        setGenerales([]);
        setGuardado('Cambios guardados.');
        return;
      }
      navegar(`/admin/proclamas/${resultado.id}/editar`, {
        replace: true,
        state: { aviso: 'Proclama creada. Aquí puedes agregar o cambiar sus publicaciones.' },
      });
    },
    onError: (error) => {
      const { errores: porCampo, generales: g } = erroresDe(error, CAMPO_DE_ERROR);
      mostrar(porCampo, g);
    },
  });

  function enviar(evento) {
    evento.preventDefault();
    const locales = validarLocal(campos, editando);
    if (Object.keys(locales).length) {
      mostrar(locales);
      return;
    }
    const cuerpo = {
      contrayente1: campos.contrayente1.trim(),
      contrayente2: campos.contrayente2.trim(),
      fechaMatrimonio: deCampoFecha(campos.fechaMatrimonio),
    };
    if (!editando && campos.primera) cuerpo.publicaciones = [{ fecha: campos.primera }];
    guardar.mutate(cuerpo);
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
        {guardado && !mensajes.length && (
          <p role="status" className="rounded-md bg-goldPale px-3 py-2 text-sm text-goldDark">
            {guardado}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <CampoTexto
          etiqueta="Contrayente 1"
          value={campos.contrayente1}
          onChange={(e) => cambiar({ contrayente1: e.target.value })}
          error={errores.contrayente1}
          maxLength={150}
          required
          autoComplete="off"
        />
        <CampoTexto
          etiqueta="Contrayente 2"
          value={campos.contrayente2}
          onChange={(e) => cambiar({ contrayente2: e.target.value })}
          error={errores.contrayente2}
          maxLength={150}
          required
          autoComplete="off"
        />
        <CampoTexto
          etiqueta="Fecha y hora del matrimonio"
          type="datetime-local"
          value={campos.fechaMatrimonio}
          onChange={(e) => cambiar({ fechaMatrimonio: e.target.value })}
          error={errores.fechaMatrimonio}
          ayuda="Hora de Bolivia."
          required
        />
        {!editando && (
          <CampoTexto
            etiqueta="Primera proclama (opcional)"
            type="date"
            value={campos.primera}
            onChange={(e) => cambiar({ primera: e.target.value })}
            error={errores.primera}
            ayuda="Puedes agregarla después, junto con la segunda y la tercera."
          />
        )}
      </div>

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
          {editando ? 'Guardar datos' : 'Crear proclama'}
        </button>
        <Link
          to="/admin/proclamas"
          className="rounded-md border border-borderSoft bg-white px-4 py-2.5 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
        >
          Volver a proclamas
        </Link>
      </div>
    </form>
  );
}
