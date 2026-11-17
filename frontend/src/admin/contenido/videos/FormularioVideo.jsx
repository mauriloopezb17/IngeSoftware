import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Dialogo from '../../componentes/Dialogo.jsx';
import { Aviso, Boton, CampoArea, CampoCasilla, CampoTexto } from '../../ui/index.js';
import { extraerErroresApi } from '../componentes/errores.js';
import { actualizarVideo, CLAVE_VIDEOS, crearVideo } from './api.js';

export default function FormularioVideo({ video, onGuardado, onCerrar }) {
  const esEdicion = Boolean(video);
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
          <Aviso tipo="error">
            <p>{errorGeneral}</p>
          </Aviso>
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

        <CampoCasilla
          etiqueta="Marcar como video destacado"
          checked={destacado}
          onChange={(e) => setDestacado(e.target.checked)}
          disabled={isPending}
        />

        <div className="mt-2 flex justify-end gap-2 border-t border-sand pt-4">
          <Boton variante="secundario" onClick={onCerrar} disabled={isPending}>
            Cancelar
          </Boton>
          <Boton type="submit" variante="primario" cargando={isPending}>
            {isPending ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Agregar video'}
          </Boton>
        </div>
      </form>
    </Dialogo>
  );
}
