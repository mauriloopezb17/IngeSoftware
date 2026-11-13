import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import CampoTexto from '../../componentes/CampoTexto.jsx';
import Dialogo from '../../componentes/Dialogo.jsx';
import CampoArea from '../componentes/CampoArea.jsx';
import { extraerErroresApi } from '../componentes/errores.js';
import { actualizarVideo, CLAVE_VIDEOS, crearVideo } from './api.js';

export default function FormularioVideo({ video, onGuardado, onCerrar }) {
  const esEdicion = Boolean(video);
  const idDestacado = useId();
  const queryClient = useQueryClient();

  const [youtube, setYoutube] = useState(video?.urlVideo ?? '');
  const [titulo, setTitulo] = useState(video?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(video?.descripcion ?? '');
  const [duracionSegundos, setDuracionSegundos] = useState(
    video?.duracionSegundos != null ? String(video.duracionSegundos) : '',
  );
  const [fechaPublicacion, setFechaPublicacion] = useState(video?.fechaPublicacion ?? '');
  const [destacado, setDestacado] = useState(video?.destacado ?? false);
  const [erroresCampo, setErroresCampo] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: (cuerpo) =>
      esEdicion ? actualizarVideo(video.id, cuerpo) : crearVideo(cuerpo),
    onSuccess: (guardado) => {
      queryClient.invalidateQueries({ queryKey: CLAVE_VIDEOS });
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
      youtube: youtube.trim(),
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      duracionSegundos: duracionSegundos.trim() ? Number(duracionSegundos) : null,
      fechaPublicacion: fechaPublicacion || null,
      destacado,
    });
  }

  return (
    <Dialogo
      titulo={esEdicion ? 'Editar video' : 'Nuevo video de YouTube'}
      onCerrar={isPending ? () => {} : onCerrar}
      ancho="max-w-xl"
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

        <CampoTexto
          etiqueta="URL o ID de YouTube"
          value={youtube}
          onChange={(e) => setYoutube(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          ayuda="Acepta enlaces watch?v=, youtu.be/, shorts/, embed/ o el ID de 11 caracteres."
          error={erroresCampo.youtube}
          disabled={isPending}
        />

        <CampoTexto
          etiqueta="Título"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={160}
          placeholder="Ej. Un recorrido por nuestra parroquia"
          error={erroresCampo.titulo}
          disabled={isPending}
        />

        <CampoArea
          etiqueta="Descripción (opcional)"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={2000}
          rows={3}
          error={erroresCampo.descripcion}
          disabled={isPending}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            etiqueta="Duración en segundos (opcional)"
            type="number"
            min={1}
            value={duracionSegundos}
            onChange={(e) => setDuracionSegundos(e.target.value)}
            error={erroresCampo.duracionSegundos}
            disabled={isPending}
          />
          <CampoTexto
            etiqueta="Fecha de publicación (opcional)"
            type="date"
            value={fechaPublicacion}
            onChange={(e) => setFechaPublicacion(e.target.value)}
            error={erroresCampo.fechaPublicacion}
            disabled={isPending}
          />
        </div>

        <label htmlFor={idDestacado} className="flex items-center gap-2.5 text-sm font-medium text-ink">
          <input
            id={idDestacado}
            type="checkbox"
            checked={destacado}
            onChange={(e) => setDestacado(e.target.checked)}
            disabled={isPending}
            className="size-4 rounded border-borderSoft accent-goldDark focus-visible:outline-2 focus-visible:outline-goldDark"
          />
          Marcar como video destacado
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
            {isPending ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Agregar video'}
          </button>
        </div>
      </form>
    </Dialogo>
  );
}

