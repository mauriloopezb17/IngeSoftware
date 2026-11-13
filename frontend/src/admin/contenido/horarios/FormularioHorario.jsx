import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import CampoTexto from '../../componentes/CampoTexto.jsx';
import Dialogo from '../../componentes/Dialogo.jsx';
import CampoSelect from '../componentes/CampoSelect.jsx';
import { extraerErroresApi } from '../componentes/errores.js';
import { actualizarHorario, CLAVE_HORARIOS, crearHorario, DIAS_SEMANA } from './api.js';

// Formulario modal para crear o editar un horario.
export default function FormularioHorario({ horario, tiposHorario, onGuardado, onCerrar }) {
  const esEdicion = Boolean(horario);
  const idActivo = useId();
  const queryClient = useQueryClient();

  const [tipoHorarioId, setTipoHorarioId] = useState(
    String(horario?.tipo.id ?? tiposHorario[0]?.id ?? ''),
  );
  const [diaSemana, setDiaSemana] = useState(String(horario?.diaSemana ?? 1));
  const [horaInicio, setHoraInicio] = useState(horario?.horaInicio ?? '');
  const [horaFin, setHoraFin] = useState(horario?.horaFin ?? '');
  const [descripcion, setDescripcion] = useState(horario?.descripcion ?? '');
  const [activo, setActivo] = useState(horario?.activo ?? true);
  const [erroresCampo, setErroresCampo] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: (cuerpo) =>
      esEdicion ? actualizarHorario(horario.id, cuerpo) : crearHorario(cuerpo),
    onSuccess: (guardado) => {
      queryClient.invalidateQueries({ queryKey: CLAVE_HORARIOS });
      onGuardado(guardado);
    },
    onError: (err) => {
      const { general, campos } = extraerErroresApi(err);
      setErroresCampo(campos);
      setErrorGeneral(general);
    },
  });

  function enviar(evento) {
    evento.preventDefault();
    setErroresCampo({});
    setErrorGeneral('');

    mutate({
      tipoHorarioId: Number(tipoHorarioId),
      diaSemana: Number(diaSemana),
      horaInicio: horaInicio.trim(),
      horaFin: horaFin.trim() || null,
      descripcion: descripcion.trim() || null,
      activo,
    });
  }

  return (
    <Dialogo
      titulo={esEdicion ? 'Editar horario' : 'Nuevo horario'}
      onCerrar={isPending ? () => {} : onCerrar}
      ancho="max-w-lg"
    >
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        {errorGeneral && (
          <p
            role="alert"
            className="rounded-md border border-redParish/30 bg-redParish/5 px-3 py-2 text-sm text-redParish"
          >
            {errorGeneral}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect
            etiqueta="Tipo de horario"
            value={tipoHorarioId}
            onChange={(e) => setTipoHorarioId(e.target.value)}
            error={erroresCampo.tipoHorarioId}
            disabled={isPending}
          >
            {tiposHorario.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nombre}
              </option>
            ))}
          </CampoSelect>

          <CampoSelect
            etiqueta="Día de la semana"
            value={diaSemana}
            onChange={(e) => setDiaSemana(e.target.value)}
            error={erroresCampo.diaSemana}
            disabled={isPending}
          >
            {DIAS_SEMANA.map((dia) => (
              <option key={dia.valor} value={dia.valor}>
                {dia.nombre}
              </option>
            ))}
          </CampoSelect>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            etiqueta="Hora de inicio"
            type="time"
            value={horaInicio}
            onChange={(e) => setHoraInicio(e.target.value)}
            error={erroresCampo.horaInicio}
            ayuda="Formato 24 horas (HH:mm)."
            disabled={isPending}
          />
          <CampoTexto
            etiqueta="Hora de fin (opcional)"
            type="time"
            value={horaFin}
            onChange={(e) => setHoraFin(e.target.value)}
            error={erroresCampo.horaFin}
            ayuda="Debe ser posterior a la hora de inicio."
            disabled={isPending}
          />
        </div>

        <CampoTexto
          etiqueta="Descripción (opcional)"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={150}
          placeholder="Ej. Misa vespertina dominical"
          error={erroresCampo.descripcion}
          ayuda={`${descripcion.length}/150 caracteres`}
          disabled={isPending}
        />

        <label htmlFor={idActivo} className="flex items-center gap-2.5 text-sm font-medium text-ink">
          <input
            id={idActivo}
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            disabled={isPending}
            className="size-4 rounded border-borderSoft accent-goldDark focus-visible:outline-2 focus-visible:outline-goldDark"
          />
          Visible en el portal público
        </label>

        <div className="mt-2 flex justify-end gap-2 border-t border-borderSoft pt-4">
          <button
            type="button"
            onClick={onCerrar}
            disabled={isPending}
            className="rounded-md border border-borderSoft bg-white px-4 py-2 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {isPending ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear horario'}
          </button>
        </div>
      </form>
    </Dialogo>
  );
}

