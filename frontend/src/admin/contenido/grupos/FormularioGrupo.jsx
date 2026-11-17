import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ImagePlus, X } from 'lucide-react';

import Dialogo from '../../componentes/Dialogo.jsx';
import SelectorImagenes from '../../multimedia/SelectorImagenes.jsx';
import { Aviso, Boton, CampoArea, CampoCasilla, CampoTexto } from '../../ui/index.js';
import SelectorIcono from '../componentes/SelectorIcono.jsx';
import { extraerErroresApi } from '../componentes/errores.js';
import { actualizarGrupo, CLAVE_GRUPOS, crearGrupo } from './api.js';

export default function FormularioGrupo({ grupo, onGuardado, onCerrar }) {
  const esEdicion = Boolean(grupo);
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
            <Aviso tipo="error">
              <p>{errorGeneral}</p>
            </Aviso>
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
            mostrarContador
            error={erroresCampo.descripcion}
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
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-sand bg-panel p-3">
                <img
                  src={imagen.url}
                  alt={imagen.textoAlternativo || nombre || 'Imagen del grupo'}
                  className="size-20 rounded-md object-cover"
                />
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
                    onClick={() => setImagen(null)}
                    disabled={isPending}
                  >
                    Quitar imagen
                  </Boton>
                </div>
              </div>
            ) : (
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
            )}
            {erroresCampo.imagenId && (
              <p className="flex items-start gap-1.5 text-sm text-danger">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <span>{erroresCampo.imagenId}</span>
              </p>
            )}
          </div>

          <CampoCasilla
            etiqueta="Visible en el portal público"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
            disabled={isPending}
          />

          <div className="mt-2 flex justify-end gap-2 border-t border-sand pt-4">
            <Boton variante="secundario" onClick={onCerrar} disabled={isPending}>
              Cancelar
            </Boton>
            <Boton type="submit" variante="primario" cargando={isPending}>
              {isPending ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear grupo'}
            </Boton>
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
