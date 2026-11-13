import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Loader2, X } from 'lucide-react';

import CampoTexto from '../../componentes/CampoTexto.jsx';
import Dialogo from '../../componentes/Dialogo.jsx';
import SelectorImagenes from '../../multimedia/SelectorImagenes.jsx';
import CampoArea from '../componentes/CampoArea.jsx';
import SelectorIcono from '../componentes/SelectorIcono.jsx';
import { extraerErroresApi } from '../componentes/errores.js';
import { actualizarGrupo, CLAVE_GRUPOS, crearGrupo } from './api.js';

export default function FormularioGrupo({ grupo, onGuardado, onCerrar }) {
  const esEdicion = Boolean(grupo);
  const idVisible = useId();
  const queryClient = useQueryClient();

  const [nombre, setNombre] = useState(grupo?.nombre ?? '');
  const [horarioReunion, setHorarioReunion] = useState(grupo?.horarioReunion ?? '');
  const [contacto, setContacto] = useState(grupo?.contacto ?? '');
  const [descripcion, setDescripcion] = useState(grupo?.descripcion ?? '');
  const [icono, setIcono] = useState(grupo?.icono ?? '');
  const [imagen, setImagen] = useState(grupo?.imagen ?? null);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [visible, setVisible] = useState(grupo?.visible ?? true);
  const [erroresCampo, setErroresCampo] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: (cuerpo) =>
      esEdicion ? actualizarGrupo(grupo.id, cuerpo) : crearGrupo(cuerpo),
    onSuccess: (guardado) => {
      queryClient.invalidateQueries({ queryKey: CLAVE_GRUPOS });
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
      nombre: nombre.trim(),
      horarioReunion: horarioReunion.trim() || null,
      contacto: contacto.trim() || null,
      descripcion: descripcion.trim() || null,
      icono: icono || null,
      imagenId: imagen?.id ?? null,
      visible,
    });
  }

  return (
    <>
      <Dialogo
        titulo={esEdicion ? 'Editar grupo pastoral' : 'Nuevo grupo pastoral'}
        onCerrar={isPending ? () => {} : onCerrar}
        ancho="max-w-2xl"
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
            <CampoTexto
              etiqueta="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={100}
              placeholder="Ej. Pastoral Juvenil"
              error={erroresCampo.nombre}
              disabled={isPending}
            />
            <CampoTexto
              etiqueta="Horario de reunión (opcional)"
              value={horarioReunion}
              onChange={(e) => setHorarioReunion(e.target.value)}
              maxLength={100}
              placeholder="Ej. Viernes · 18:30"
              error={erroresCampo.horarioReunion}
              disabled={isPending}
            />
          </div>

          <CampoTexto
            etiqueta="Contacto (opcional)"
            value={contacto}
            onChange={(e) => setContacto(e.target.value)}
            maxLength={120}
            placeholder="Ej. Coordinación juvenil: escribir por Messenger"
            error={erroresCampo.contacto}
            disabled={isPending}
          />

          <CampoArea
            etiqueta="Descripción (opcional)"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={2000}
            rows={3}
            error={erroresCampo.descripcion}
            ayuda={`${descripcion.length}/2000 caracteres`}
            disabled={isPending}
          />

          <SelectorIcono
            valor={icono}
            onChange={setIcono}
            error={erroresCampo.icono}
            disabled={isPending}
          />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-ink">Imagen (opcional)</span>
            {imagen ? (
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-borderSoft bg-cream/40 p-3">
                <img
                  src={imagen.url}
                  alt={imagen.textoAlternativo || nombre || 'Imagen del grupo'}
                  className="size-20 rounded-md object-cover"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectorAbierto(true)}
                    disabled={isPending}
                    className="rounded-md border border-borderSoft bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
                  >
                    Cambiar imagen
                  </button>
                  <button
                    type="button"
                    onClick={() => setImagen(null)}
                    disabled={isPending}
                    className="flex items-center gap-1 rounded-md border border-redParish/30 bg-white px-3 py-1.5 text-sm font-medium text-redParish hover:bg-redParish/5 focus-visible:outline-2 focus-visible:outline-redParish"
                  >
                    <X className="size-4" aria-hidden="true" />
                    Quitar imagen
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => setSelectorAbierto(true)}
                  disabled={isPending}
                  className="flex items-center gap-2 rounded-md border border-borderSoft bg-white px-3.5 py-2 text-sm font-medium text-ink hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
                >
                  <ImagePlus className="size-4 text-goldDark" aria-hidden="true" />
                  Elegir imagen
                </button>
              </div>
            )}
            {erroresCampo.imagenId && (
              <p className="text-sm text-redParish">{erroresCampo.imagenId}</p>
            )}
          </div>

          <label htmlFor={idVisible} className="flex items-center gap-2.5 text-sm font-medium text-ink">
            <input
              id={idVisible}
              type="checkbox"
              checked={visible}
              onChange={(e) => setVisible(e.target.checked)}
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
              {isPending ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear grupo'}
            </button>
          </div>
        </form>
      </Dialogo>

      {selectorAbierto && (
        <SelectorImagenes
          titulo="Elegir imagen del grupo"
          onCerrar={() => setSelectorAbierto(false)}
          onSeleccionar={(elegida) => {
            setImagen(elegida);
            setSelectorAbierto(false);
          }}
        />
      )}
    </>
  );
}

