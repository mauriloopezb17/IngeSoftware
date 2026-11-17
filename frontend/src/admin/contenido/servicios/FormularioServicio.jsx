import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

import Dialogo from '../../componentes/Dialogo.jsx';
import { Aviso, Boton, CampoArea, CampoCasilla, CampoTexto } from '../../ui/index.js';
import SelectorIcono from '../componentes/SelectorIcono.jsx';
import { extraerErroresApi } from '../componentes/errores.js';
import { actualizarServicio, CLAVE_SERVICIOS, crearServicio } from './api.js';

const MAX_REQUISITOS = 20;

export default function FormularioServicio({ servicio, onGuardado, onCerrar }) {
  const esEdicion = Boolean(servicio);
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
          mostrarContador
          error={erroresCampo.descripcionCorta}
          disabled={isPending}
        />

        <SelectorIcono
          valor={icono}
          onChange={setIcono}
          error={erroresCampo.icono}
          disabled={isPending}
        />

        <fieldset className="rounded-lg border border-sand bg-panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <legend className="text-sm font-semibold text-ink">
              Requisitos y detalles ({requisitos.length}/{MAX_REQUISITOS})
            </legend>
            <Boton
              variante="secundario"
              tamano="sm"
              icono={Plus}
              onClick={agregarRequisito}
              disabled={isPending || requisitos.length >= MAX_REQUISITOS}
            >
              Agregar requisito
            </Boton>
          </div>
          {erroresCampo.contenido && (
            <p className="mt-2 flex items-start gap-1.5 text-sm text-danger">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>{erroresCampo.contenido}</span>
            </p>
          )}

          {requisitos.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Todavía no hay pares etiqueta–valor para «Ver requisitos».
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {requisitos.map((item, i) => (
                <li key={i} className="rounded-md border border-sand bg-white p-3">
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
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      onClick={() => moverRequisito(i, -1)}
                      disabled={isPending || i === 0}
                      aria-label={`Subir requisito ${i + 1}`}
                    >
                      <ArrowUp className="size-3.5" aria-hidden="true" />
                    </Boton>
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      onClick={() => moverRequisito(i, 1)}
                      disabled={isPending || i === requisitos.length - 1}
                      aria-label={`Bajar requisito ${i + 1}`}
                    >
                      <ArrowDown className="size-3.5" aria-hidden="true" />
                    </Boton>
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      onClick={() => eliminarRequisito(i)}
                      disabled={isPending}
                      aria-label={`Quitar requisito ${i + 1}`}
                    >
                      <Trash2 className="size-3.5 text-danger" aria-hidden="true" />
                    </Boton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

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
            {isPending ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear servicio'}
          </Boton>
        </div>
      </form>
    </Dialogo>
  );
}
