import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';

import { erroresDe, resumenDeErrores } from '../componentes/erroresFormulario.js';
import { aCampoFecha, deCampoFecha } from '../publicaciones/fechas.js';
import { Aviso, Boton, CampoTexto, useToast } from '../ui/index.js';
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
  const toast = useToast();
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
  const cambiar = (cambios) => setCampos((actuales) => ({ ...actuales, ...cambios }));

  function mostrar(porCampo, avisosGenerales = []) {
    setErrores(porCampo);
    setGenerales(avisosGenerales);
    requestAnimationFrame(() => avisos.current?.focus());
  }

  const guardar = useMutation({
    mutationFn: (cuerpo) => (editando ? actualizarProclama(proclama.id, cuerpo) : crearProclama(cuerpo)),
    onSuccess: (resultado) => {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_PROCLAMAS });
      if (editando) {
        setErrores({});
        setGenerales([]);
        toast.exito('Cambios guardados.');
        return;
      }
      const mensaje = 'Proclama creada. Aquí puedes agregar o cambiar sus publicaciones.';
      toast.exito(mensaje);
      navegar(`/admin/proclamas/${resultado.id}/editar`, { replace: true });
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

      <div className="flex flex-col gap-5">
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

      <div className="flex flex-wrap items-center gap-3 border-t border-sand pt-5">
        <Boton type="submit" variante="primario" icono={Save} cargando={guardar.isPending}>
          {editando ? 'Guardar datos' : 'Crear proclama'}
        </Boton>
        <Boton como={Link} to="/admin/proclamas" variante="secundario">
          Volver a proclamas
        </Boton>
      </div>
    </form>
  );
}
