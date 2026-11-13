import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from 'lucide-react';

import CampoTexto from '../../componentes/CampoTexto.jsx';
import Dialogo from '../../componentes/Dialogo.jsx';
import CampoArea from '../componentes/CampoArea.jsx';
import SelectorIcono from '../componentes/SelectorIcono.jsx';
import { extraerErroresApi } from '../componentes/errores.js';
import { actualizarServicio, CLAVE_SERVICIOS, crearServicio } from './api.js';

const MAX_REQUISITOS = 20;

export default function FormularioServicio({ servicio, onGuardado, onCerrar }) {
  const esEdicion = Boolean(servicio);
  const idVisible = useId();
  const queryClient = useQueryClient();

  const [nombre, setNombre] = useState(servicio?.nombre ?? '');
  const [slug, setSlug] = useState(servicio?.slug ?? '');
  const [descripcionCorta, setDescripcionCorta] = useState(servicio?.descripcionCorta ?? '');
  const [icono, setIcono] = useState(servicio?.icono ?? '');
  const [visible, setVisible] = useState(servicio?.visible ?? true);
  const [requisitos, setRequisitos] = useState(() =>
    (servicio?.contenido?.datos ?? []).map((item) => ({ ...item })),
  );
  const [erroresCampo, setErroresCampo] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: (cuerpo) =>
      esEdicion ? actualizarServicio(servicio.id, cuerpo) : crearServicio(cuerpo),
    onSuccess: (guardado) => {
      queryClient.invalidateQueries({ queryKey: CLAVE_SERVICIOS });
      onGuardado(guardado);
    },
    onError: (err) => {
      const { general, campos } = extraerErroresApi(err);
      setErroresCampo(campos);
      setErrorGeneral(general);
    },
  });

  function agregarRequisito() {
    if (requisitos.length >= MAX_REQUISITOS) return;
    setRequisitos((prev) => [...prev, { etiqueta: '', valor: '' }]);
  }

  function actualizarRequisito(indice, campo, valor) {
    setRequisitos((prev) =>
      prev.map((item, i) => (i === indice ? { ...item, [campo]: valor } : item)),
    );
  }

  function eliminarRequisito(indice) {
    setRequisitos((prev) => prev.filter((_, i) => i !== indice));
  }

  function moverRequisito(indice, direccion) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= requisitos.length) return;
    setRequisitos((prev) => {
      const copia = [...prev];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  }

  function enviar(evento) {
    evento.preventDefault();
    setErroresCampo({});
    setErrorGeneral('');

    mutate({
      nombre: nombre.trim(),
      slug: slug.trim() || null,
      descripcionCorta: descripcionCorta.trim(),
      icono: icono || null,
      visible,
      contenido: {
        datos: requisitos.map((r) => ({
          etiqueta: r.etiqueta.trim(),
          valor: r.valor.trim(),
        })),
      },
    });
  }

  return (
    <Dialogo
      titulo={esEdicion ? 'Editar servicio' : 'Nuevo servicio'}
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
            placeholder="Ej. Bautismo"
            error={erroresCampo.nombre}
            disabled={isPending}
          />
          <CampoTexto
            etiqueta="Slug (opcional)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Se genera automáticamente si queda vacío"
            error={erroresCampo.slug}
            disabled={isPending}
          />
        </div>

        <CampoArea
          etiqueta="Descripción corta"
          value={descripcionCorta}
          onChange={(e) => setDescripcionCorta(e.target.value)}
          maxLength={300}
          rows={3}
          error={erroresCampo.descripcionCorta}
          ayuda={`${descripcionCorta.length}/300 caracteres`}
          disabled={isPending}
        />

        <SelectorIcono
          valor={icono}
          onChange={setIcono}
          error={erroresCampo.icono}
          disabled={isPending}
        />

        <fieldset className="rounded-lg border border-borderSoft bg-cream/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <legend className="text-sm font-semibold text-ink">
              Requisitos y detalles ({requisitos.length}/{MAX_REQUISITOS})
            </legend>
            <button
              type="button"
              onClick={agregarRequisito}
              disabled={isPending || requisitos.length >= MAX_REQUISITOS}
              className="flex items-center gap-1 rounded-md border border-borderSoft bg-white px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark disabled:opacity-50"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Agregar requisito
            </button>
          </div>
          {erroresCampo.contenido && (
            <p className="mt-2 text-sm text-redParish">{erroresCampo.contenido}</p>
          )}

          {requisitos.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Todavía no hay pares etiqueta–valor para «Ver requisitos».
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {requisitos.map((item, i) => (
                <li
                  key={i}
                  className="rounded-md border border-borderSoft bg-white p-3"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CampoTexto
                      etiqueta={`Etiqueta ${i + 1}`}
                      value={item.etiqueta}
                      onChange={(e) => actualizarRequisito(i, 'etiqueta', e.target.value)}
                      maxLength={60}
                      placeholder="Ej. Charla pre-bautismal"
                      error={erroresCampo[`contenido.datos.${i}.etiqueta`]}
                      disabled={isPending}
                    />
                    <CampoTexto
                      etiqueta={`Valor ${i + 1}`}
                      value={item.valor}
                      onChange={(e) => actualizarRequisito(i, 'valor', e.target.value)}
                      maxLength={300}
                      placeholder="Ej. Primer sábado de cada mes"
                      error={erroresCampo[`contenido.datos.${i}.valor`]}
                      disabled={isPending}
                    />
                  </div>
                  <div className="mt-2 flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => moverRequisito(i, -1)}
                      disabled={isPending || i === 0}
                      aria-label={`Subir requisito ${i + 1}`}
                      className="rounded-md border border-borderSoft p-1.5 text-muted hover:bg-stone hover:text-ink disabled:opacity-40"
                    >
                      <ArrowUp className="size-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moverRequisito(i, 1)}
                      disabled={isPending || i === requisitos.length - 1}
                      aria-label={`Bajar requisito ${i + 1}`}
                      className="rounded-md border border-borderSoft p-1.5 text-muted hover:bg-stone hover:text-ink disabled:opacity-40"
                    >
                      <ArrowDown className="size-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarRequisito(i)}
                      disabled={isPending}
                      aria-label={`Quitar requisito ${i + 1}`}
                      className="rounded-md border border-redParish/30 p-1.5 text-redParish hover:bg-redParish/5 disabled:opacity-40"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

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
            {isPending ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear servicio'}
          </button>
        </div>
      </form>
    </Dialogo>
  );
}

