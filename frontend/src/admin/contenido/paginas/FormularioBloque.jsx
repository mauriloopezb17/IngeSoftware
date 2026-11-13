import { useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import Dialogo from '../../componentes/Dialogo.jsx';
import SelectorImagenes from '../../multimedia/SelectorImagenes.jsx';
import CampoSelect from '../componentes/CampoSelect.jsx';
import { extraerErroresApi } from '../componentes/errores.js';
import { CLAVE_CATALOGOS, obtenerCatalogos } from '../horarios/api.js';
import {
  actualizarBloque,
  agregarBloque,
  CLAVE_PAGINAS,
  extraerYoutubeId,
  NOMBRES_TIPO_BLOQUE,
} from './api.js';
import CamposBloque from './CamposBloque.jsx';

const TIPOS_RESPALDO = Object.entries(NOMBRES_TIPO_BLOQUE).map(([codigo, nombre]) => ({
  codigo,
  nombre,
}));

function contenidoInicialPorTipo(tipo, actual) {
  if (tipo === 'hero_video') {
    return {
      titulo: actual?.titulo ?? '',
      subtitulo: actual?.subtitulo ?? '',
      etiqueta: actual?.etiqueta ?? '',
      url_video: actual?.url_video ?? '',
      url_poster: actual?.url_poster ?? '',
      texto_video: actual?.texto_video ?? '',
      detalle_video: actual?.detalle_video ?? '',
      botones: (actual?.botones ?? []).map((b) => ({ texto: b.texto ?? '', enlace: b.enlace ?? '' })),
    };
  }
  if (tipo === 'texto_imagen') {
    return {
      titulo: actual?.titulo ?? '',
      texto: actual?.texto ?? '',
      etiqueta: actual?.etiqueta ?? '',
      url_imagen: actual?.url_imagen ?? '',
      texto_alternativo: actual?.texto_alternativo ?? '',
      posicion_imagen: actual?.posicion_imagen ?? 'izquierda',
      tarjeta: actual?.tarjeta
        ? {
            etiqueta: actual.tarjeta.etiqueta ?? '',
            titulo: actual.tarjeta.titulo ?? '',
            descripcion: actual.tarjeta.descripcion ?? '',
          }
        : null,
    };
  }
  if (tipo === 'tarjetas') {
    const itemsBase = actual?.items?.length
      ? actual.items
      : [{ titulo: '', subtitulo: '', icono: '', url_imagen: '', texto_alternativo: '', enlace: '' }];
    return {
      titulo: actual?.titulo ?? '',
      items: itemsBase.map((item) => ({
        titulo: item.titulo ?? '',
        subtitulo: item.subtitulo ?? '',
        icono: item.icono ?? '',
        url_imagen: item.url_imagen ?? '',
        texto_alternativo: item.texto_alternativo ?? '',
        enlace: item.enlace ?? '',
      })),
    };
  }
  if (tipo === 'cita') {
    return {
      texto: actual?.texto ?? '',
      autor: actual?.autor ?? '',
    };
  }
  if (tipo === 'galeria') {
    return {
      titulo: actual?.titulo ?? '',
      imagenes: (actual?.imagenes ?? []).map((img) => ({
        url: img.url ?? '',
        texto_alternativo: img.texto_alternativo ?? '',
        leyenda: img.leyenda ?? '',
      })),
    };
  }
  return {
    youtube_video_id: actual?.youtube_video_id ?? '',
    titulo: actual?.titulo ?? '',
  };
}

function asignarSiHay(destino, clave, valor) {
  const limpio = typeof valor === 'string' ? valor.trim() : valor;
  if (limpio) destino[clave] = limpio;
}

function normalizarContenido(tipo, contenido) {
  if (tipo === 'hero_video') {
    const res = {
      titulo: (contenido.titulo ?? '').trim(),
      url_video: (contenido.url_video ?? '').trim(),
    };
    asignarSiHay(res, 'etiqueta', contenido.etiqueta);
    asignarSiHay(res, 'subtitulo', contenido.subtitulo);
    asignarSiHay(res, 'url_poster', contenido.url_poster);
    asignarSiHay(res, 'texto_video', contenido.texto_video);
    asignarSiHay(res, 'detalle_video', contenido.detalle_video);
    if (Array.isArray(contenido.botones) && contenido.botones.length > 0) {
      res.botones = contenido.botones.map((b) => ({
        texto: (b.texto ?? '').trim(),
        enlace: (b.enlace ?? '').trim(),
      }));
    }
    return res;
  }

  if (tipo === 'texto_imagen') {
    const res = {
      titulo: (contenido.titulo ?? '').trim(),
      texto: (contenido.texto ?? '').trim(),
      posicion_imagen: contenido.posicion_imagen || 'izquierda',
    };
    asignarSiHay(res, 'etiqueta', contenido.etiqueta);
    asignarSiHay(res, 'url_imagen', contenido.url_imagen);
    asignarSiHay(res, 'texto_alternativo', contenido.texto_alternativo);
    if (contenido.tarjeta) {
      const tarjeta = { titulo: (contenido.tarjeta.titulo ?? '').trim() };
      asignarSiHay(tarjeta, 'etiqueta', contenido.tarjeta.etiqueta);
      asignarSiHay(tarjeta, 'descripcion', contenido.tarjeta.descripcion);
      res.tarjeta = tarjeta;
    }
    return res;
  }

  if (tipo === 'tarjetas') {
    const res = {
      items: (contenido.items ?? []).map((item) => {
        const salida = { titulo: (item.titulo ?? '').trim() };
        asignarSiHay(salida, 'subtitulo', item.subtitulo);
        asignarSiHay(salida, 'icono', item.icono);
        asignarSiHay(salida, 'url_imagen', item.url_imagen);
        asignarSiHay(salida, 'texto_alternativo', item.texto_alternativo);
        asignarSiHay(salida, 'enlace', item.enlace);
        return salida;
      }),
    };
    asignarSiHay(res, 'titulo', contenido.titulo);
    return res;
  }

  if (tipo === 'cita') {
    const res = { texto: (contenido.texto ?? '').trim() };
    asignarSiHay(res, 'autor', contenido.autor);
    return res;
  }

  if (tipo === 'galeria') {
    const res = {
      imagenes: (contenido.imagenes ?? []).map((img) => {
        const salida = {
          url: (img.url ?? '').trim(),
          texto_alternativo: (img.texto_alternativo ?? '').trim(),
        };
        asignarSiHay(salida, 'leyenda', img.leyenda);
        return salida;
      }),
    };
    asignarSiHay(res, 'titulo', contenido.titulo);
    return res;
  }

  const entrada = (contenido.youtube_video_id ?? '').trim();
  const idExtraido = extraerYoutubeId(entrada);
  const res = { youtube_video_id: idExtraido ?? entrada };
  asignarSiHay(res, 'titulo', contenido.titulo);
  return res;
}

function aplicarImagenAlContenido(prev, selectorMeta, imagen) {
  if (!selectorMeta) return prev;
  if (selectorMeta.destino === 'poster') {
    return { ...prev, url_poster: imagen.url };
  }
  if (selectorMeta.destino === 'texto_imagen') {
    return {
      ...prev,
      url_imagen: imagen.url,
      texto_alternativo: prev.texto_alternativo || imagen.textoAlternativo || '',
    };
  }
  if (selectorMeta.destino === 'tarjeta') {
    const items = [...(prev.items ?? [])];
    const actual = items[selectorMeta.indice] ?? {};
    items[selectorMeta.indice] = {
      ...actual,
      url_imagen: imagen.url,
      texto_alternativo: actual.texto_alternativo || imagen.textoAlternativo || '',
    };
    return { ...prev, items };
  }
  if (selectorMeta.destino === 'galeria') {
    const imagenes = [...(prev.imagenes ?? [])];
    if (selectorMeta.indice !== undefined) {
      const actual = imagenes[selectorMeta.indice] ?? {};
      imagenes[selectorMeta.indice] = {
        ...actual,
        url: imagen.url,
        texto_alternativo: actual.texto_alternativo || imagen.textoAlternativo || '',
      };
    } else {
      imagenes.push({
        url: imagen.url,
        texto_alternativo: imagen.textoAlternativo || '',
        leyenda: '',
      });
    }
    return { ...prev, imagenes };
  }
  return prev;
}

export default function FormularioBloque({ paginaId, bloque, onGuardado, onCerrar }) {
  const esEdicion = Boolean(bloque);
  const idVisible = useId();
  const queryClient = useQueryClient();

  const catalogosQuery = useQuery({
    queryKey: CLAVE_CATALOGOS,
    queryFn: obtenerCatalogos,
  });

  const tiposBloque = catalogosQuery.data?.tiposBloque?.length
    ? catalogosQuery.data.tiposBloque
    : TIPOS_RESPALDO;

  const [tipo, setTipo] = useState(bloque?.tipo ?? 'texto_imagen');
  const [visible, setVisible] = useState(bloque?.visible ?? true);
  const [contenido, setContenido] = useState(() =>
    contenidoInicialPorTipo(bloque?.tipo ?? 'texto_imagen', bloque?.contenido),
  );
  const [selectorMeta, setSelectorMeta] = useState(null);
  const [erroresCampo, setErroresCampo] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: (cuerpo) =>
      esEdicion ? actualizarBloque(paginaId, bloque.id, cuerpo) : agregarBloque(paginaId, cuerpo),
    onSuccess: (guardado) => {
      queryClient.invalidateQueries({ queryKey: [...CLAVE_PAGINAS, paginaId] });
      onGuardado(guardado);
    },
    onError: (err) => {
      const { general, campos } = extraerErroresApi(err);
      setErroresCampo(campos);
      setErrorGeneral(general);
    },
  });

  function cambiarTipo(nuevoTipo) {
    setTipo(nuevoTipo);
    setContenido(contenidoInicialPorTipo(nuevoTipo, null));
    setErroresCampo({});
    setErrorGeneral('');
  }

  function enviar(evento) {
    evento.preventDefault();
    setErroresCampo({});
    setErrorGeneral('');

    const contenidoNormalizado = normalizarContenido(tipo, contenido);
    if (esEdicion) {
      mutate({ contenido: contenidoNormalizado, visible });
    } else {
      mutate({ tipo, contenido: contenidoNormalizado, visible });
    }
  }

  return (
    <>
      <Dialogo
        titulo={
          esEdicion
            ? `Editar bloque: ${NOMBRES_TIPO_BLOQUE[tipo] ?? tipo}`
            : 'Nuevo bloque de página'
        }
        onCerrar={isPending || selectorMeta ? () => {} : onCerrar}
        ancho="max-w-3xl"
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

          <div className="grid items-end gap-4 sm:grid-cols-2">
            {esEdicion ? (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-ink">Tipo de bloque</span>
                <p className="rounded-md border border-borderSoft bg-cream/40 px-3 py-2.5 text-sm font-medium text-ink">
                  {NOMBRES_TIPO_BLOQUE[tipo] ?? tipo}
                </p>
              </div>
            ) : (
              <CampoSelect
                etiqueta="Tipo de bloque"
                value={tipo}
                onChange={(e) => cambiarTipo(e.target.value)}
                error={erroresCampo.tipo}
                disabled={isPending}
              >
                {tiposBloque.map((t) => (
                  <option key={t.codigo} value={t.codigo}>
                    {t.nombre} ({t.codigo})
                  </option>
                ))}
              </CampoSelect>
            )}

            <label
              htmlFor={idVisible}
              className="flex items-center gap-2.5 rounded-md border border-borderSoft bg-cream/40 px-3 py-2.5 text-sm font-medium text-ink"
            >
              <input
                id={idVisible}
                type="checkbox"
                checked={visible}
                onChange={(e) => setVisible(e.target.checked)}
                disabled={isPending}
                className="size-4 accent-goldDark"
              />
              Visible en el portal
            </label>
          </div>

          <CamposBloque
            tipo={tipo}
            contenido={contenido}
            onChange={setContenido}
            onAbrirSelector={setSelectorMeta}
            errores={erroresCampo}
            deshabilitado={isPending}
          />

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
              {isPending ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Agregar bloque'}
            </button>
          </div>
        </form>
      </Dialogo>

      {selectorMeta && (
        <SelectorImagenes
          titulo="Elegir imagen de la biblioteca"
          exigirTextoAlternativo={selectorMeta.destino === 'galeria'}
          onSeleccionar={(imagen) => {
            setContenido((prev) => aplicarImagenAlContenido(prev, selectorMeta, imagen));
            setSelectorMeta(null);
          }}
          onCerrar={() => setSelectorMeta(null)}
        />
      )}
    </>
  );
}

