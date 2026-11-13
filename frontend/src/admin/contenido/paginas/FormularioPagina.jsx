import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import CampoTexto from '../../componentes/CampoTexto.jsx';
import Dialogo from '../../componentes/Dialogo.jsx';
import CampoArea from '../componentes/CampoArea.jsx';
import CampoSelect from '../componentes/CampoSelect.jsx';
import { extraerErroresApi } from '../componentes/errores.js';
import {
  actualizarPagina,
  aSlugTexto,
  CLAVE_PAGINAS,
  crearPagina,
  ESTADOS_PAGINA,
} from './api.js';

export default function FormularioPagina({ pagina, paginasDisponibles = [], onGuardado, onCerrar }) {
  const esEdicion = Boolean(pagina);
  const idMenu = useId();
  const queryClient = useQueryClient();

  const [titulo, setTitulo] = useState(pagina?.titulo ?? '');
  const [slug, setSlug] = useState(pagina?.slug ?? '');
  const [slugEditado, setSlugEditado] = useState(esEdicion);
  const [estado, setEstado] = useState(pagina?.estado?.codigo ?? 'BORRADOR');
  const [descripcionSeo, setDescripcionSeo] = useState(pagina?.descripcionSeo ?? '');
  const [paginaPadreId, setPaginaPadreId] = useState(
    pagina?.paginaPadre?.id ? String(pagina.paginaPadre.id) : '',
  );
  const [mostrarEnMenu, setMostrarEnMenu] = useState(pagina?.mostrarEnMenu ?? false);
  const [ordenMenu, setOrdenMenu] = useState(String(pagina?.ordenMenu ?? 0));
  const [erroresCampo, setErroresCampo] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: (cuerpo) =>
      esEdicion ? actualizarPagina(pagina.id, cuerpo) : crearPagina(cuerpo),
    onSuccess: (guardada) => {
      queryClient.invalidateQueries({ queryKey: CLAVE_PAGINAS });
      onGuardado(guardada);
    },
    onError: (err) => {
      const { general, campos } = extraerErroresApi(err);
      setErroresCampo(campos);
      setErrorGeneral(general);
    },
  });

  const opcionesPadre = paginasDisponibles.filter(
    (candidata) =>
      candidata.id !== pagina?.id &&
      (!pagina?.sede?.id || candidata.sede?.id === pagina.sede.id),
  );

  function cambiarTitulo(valor) {
    setTitulo(valor);
    if (!slugEditado) {
      setSlug(aSlugTexto(valor));
    }
  }

  function enviar(evento) {
    evento.preventDefault();
    setErroresCampo({});
    setErrorGeneral('');

    const cuerpo = {
      titulo: titulo.trim(),
      slug: (slug.trim() || aSlugTexto(titulo)).trim(),
      estado,
      descripcionSeo: descripcionSeo.trim() || undefined,
      paginaPadreId: paginaPadreId ? Number(paginaPadreId) : null,
      mostrarEnMenu,
      ordenMenu: ordenMenu === '' ? 0 : Number(ordenMenu),
    };

    if (esEdicion && !descripcionSeo.trim()) {
      cuerpo.descripcionSeo = null;
    }

    mutate(cuerpo);
  }

  return (
    <Dialogo
      titulo={esEdicion ? `Editar página «${pagina.titulo}»` : 'Nueva página'}
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
            etiqueta="Título"
            value={titulo}
            onChange={(e) => cambiarTitulo(e.target.value)}
            maxLength={120}
            placeholder="Ej. Nuestra historia"
            error={erroresCampo.titulo}
            disabled={isPending}
          />
          <CampoTexto
            etiqueta="Slug (URL)"
            value={slug}
            onChange={(e) => {
              setSlugEditado(true);
              setSlug(e.target.value);
            }}
            maxLength={100}
            placeholder="Ej. nuestra-historia"
            ayuda={
              pagina?.slug === 'inicio' || pagina?.slug === 'nosotros'
                ? 'Página base del portal; conviene conservar su slug.'
                : 'Solo minúsculas, números y guiones.'
            }
            error={erroresCampo.slug}
            disabled={isPending}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect
            etiqueta="Estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            error={erroresCampo.estado}
            disabled={isPending}
          >
            {ESTADOS_PAGINA.map((est) => (
              <option key={est.codigo} value={est.codigo}>
                {est.nombre}
              </option>
            ))}
          </CampoSelect>

          <CampoSelect
            etiqueta="Página padre (opcional)"
            value={paginaPadreId}
            onChange={(e) => setPaginaPadreId(e.target.value)}
            error={erroresCampo.paginaPadreId}
            disabled={isPending}
          >
            <option value="">Ninguna (página principal)</option>
            {opcionesPadre.map((p) => (
              <option key={p.id} value={p.id}>
                {p.titulo} ({p.slug})
              </option>
            ))}
          </CampoSelect>
        </div>

        <CampoArea
          etiqueta="Descripción SEO (opcional)"
          value={descripcionSeo}
          onChange={(e) => setDescripcionSeo(e.target.value)}
          maxLength={300}
          rows={2}
          ayuda={`${descripcionSeo.length}/300 caracteres`}
          error={erroresCampo.descripcionSeo}
          disabled={isPending}
        />

        <div className="grid items-end gap-4 sm:grid-cols-2">
          <label
            htmlFor={idMenu}
            className="flex items-center gap-2.5 rounded-md border border-borderSoft bg-cream/40 px-3 py-2.5 text-sm font-medium text-ink"
          >
            <input
              id={idMenu}
              type="checkbox"
              checked={mostrarEnMenu}
              onChange={(e) => setMostrarEnMenu(e.target.checked)}
              disabled={isPending}
              className="size-4 accent-goldDark"
            />
            Mostrar en el menú de navegación
          </label>

          <CampoTexto
            etiqueta="Orden en el menú"
            type="number"
            min={0}
            value={ordenMenu}
            onChange={(e) => setOrdenMenu(e.target.value)}
            error={erroresCampo.ordenMenu}
            disabled={isPending}
          />
        </div>

        <div className="mt-2 flex flex-wrap justify-end gap-2">
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
            {isPending ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear página'}
          </button>
        </div>
      </form>
    </Dialogo>
  );
}

