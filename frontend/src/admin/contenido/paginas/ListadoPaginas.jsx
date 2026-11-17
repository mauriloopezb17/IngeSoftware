import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox, Layers, Pencil, Plus, Trash2 } from 'lucide-react';

import ConfirmarAccion from '../../componentes/ConfirmarAccion.jsx';
import { usePermisos } from '../../permisos/usePermisos.js';
import {
  Aviso,
  Boton,
  CampoSelect,
  EncabezadoPantalla,
  EsqueletoTarjetas,
  EstadoVacio,
  Insignia,
  useToast,
} from '../../ui/index.js';
import {
  CLAVE_PAGINAS,
  eliminarPagina,
  ESTADOS_PAGINA,
  listarPaginas,
} from './api.js';
import FormularioPagina from './FormularioPagina.jsx';

// /admin/paginas: listado. Cada página se abre en su propia ruta (/admin/paginas/:id), con el editor de bloques.
export default function ListadoPaginas() {
  const queryClient = useQueryClient();
  const { puede } = usePermisos();
  const toast = useToast();
  const puedeGestionar = puede('paginas.gestionar');

  const tituloRef = useRef(null);

  const [filtroEstado, setFiltroEstado] = useState('');
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [porEliminar, setPorEliminar] = useState(null);

  const paginasQuery = useQuery({
    queryKey: [...CLAVE_PAGINAS, { estado: filtroEstado }],
    queryFn: () => listarPaginas({ estado: filtroEstado || undefined }),
  });

  const eliminarMut = useMutation({
    mutationFn: (pagina) => eliminarPagina(pagina.id),
    onSuccess: (_, pagina) => {
      queryClient.invalidateQueries({ queryKey: CLAVE_PAGINAS });
      toast.exito(`Se eliminó la página «${pagina.titulo}».`);
      setPorEliminar(null);
      setTimeout(() => tituloRef.current?.focus(), 0);
    },
  });

  const paginas = paginasQuery.data ?? [];

  // Al volver desde una página (enlace «Volver a páginas») el foco queda en el título del listado.
  const volvioDeUnaPagina = useLocation().state?.enfocarTitulo === true;
  useEffect(() => {
    if (volvioDeUnaPagina) tituloRef.current?.focus();
  }, [volvioDeUnaPagina]);

  return (
    <section className="mx-auto max-w-5xl">
      <EncabezadoPantalla
        titulo="Páginas"
        descripcion="Páginas institucionales del portal y sus bloques de contenido."
        headingRef={tituloRef}
        acciones={
          puedeGestionar && (
            <Boton
              variante="primario"
              icono={Plus}
              onClick={() => setCreando(true)}
            >
              Nueva página
            </Boton>
          )
        }
      />

      {!puedeGestionar && (
        <Aviso tipo="soloLectura" className="mt-4">
          <p>
            <strong className="font-semibold text-ink">Solo lectura:</strong> tu rol puede consultar las páginas y sus
            bloques, pero no realizar cambios.
          </p>
        </Aviso>
      )}

      <div className="mt-6 rounded-lg border border-sand bg-white p-4 sm:max-w-xs">
        <CampoSelect
          etiqueta="Estado"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {ESTADOS_PAGINA.map((est) => (
            <option key={est.codigo} value={est.codigo}>
              {est.nombre}
            </option>
          ))}
        </CampoSelect>
      </div>

      <div className="mt-6" aria-busy={paginasQuery.isPending}>
        {paginasQuery.isPending && (
          <EsqueletoTarjetas cantidad={3} columnas="grid-cols-1" etiqueta="Cargando páginas…" />
        )}

        {paginasQuery.isError && (
          <Aviso
            tipo="error"
            accion={
              <Boton variante="secundario" tamano="sm" onClick={() => paginasQuery.refetch()}>
                Reintentar
              </Boton>
            }
          >
            <p>{paginasQuery.error.message || 'No se pudieron cargar los datos.'}</p>
          </Aviso>
        )}

        {!paginasQuery.isPending && !paginasQuery.isError && paginas.length === 0 && (
          <EstadoVacio
            icono={Inbox}
            titulo="No hay páginas para el filtro seleccionado."
            descripcion="Crea una página institucional para armar secciones en el portal."
          />
        )}

        {paginas.length > 0 && (
          <ul aria-label="Páginas" className="flex flex-col gap-3">
            {paginas.map((pagina) => (
              <li
                key={pagina.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-sand bg-white p-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-body text-base font-semibold text-ink">{pagina.titulo}</h2>
                    <Insignia variante={pagina.estado.codigo === 'PUBLICADO' ? 'publicado' : 'borrador'}>
                      {pagina.estado.nombre}
                    </Insignia>
                    {pagina.mostrarEnMenu && (
                      <Insignia variante="archivado">Menú · orden {pagina.ordenMenu}</Insignia>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    Slug: <code>/{pagina.slug}</code>
                    {pagina.paginaPadre && ` · Subpágina de «${pagina.paginaPadre.titulo}»`}
                  </p>
                  {pagina.descripcionSeo && (
                    <p className="mt-1 break-words text-sm text-ink">{pagina.descripcionSeo}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Boton
                    como={Link}
                    to={`/admin/paginas/${pagina.id}`}
                    variante="secundario"
                    tamano="sm"
                    icono={Layers}
                    aria-label={`${puedeGestionar ? 'Bloques' : 'Ver bloques'} de «${pagina.titulo}»`}
                  >
                    {puedeGestionar ? 'Bloques' : 'Ver bloques'}
                  </Boton>

                  {puedeGestionar && (
                    <>
                      <Boton
                        variante="secundario"
                        tamano="sm"
                        icono={Pencil}
                        onClick={() => setEditando(pagina)}
                        aria-label={`Editar datos de «${pagina.titulo}»`}
                      >
                        Editar
                      </Boton>
                      <Boton
                        variante="secundario"
                        tamano="sm"
                        icono={Trash2}
                        onClick={() => setPorEliminar(pagina)}
                        aria-label={`Eliminar «${pagina.titulo}»`}
                      >
                        Eliminar
                      </Boton>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(creando || editando) && (
        <FormularioPagina
          pagina={editando}
          paginasDisponibles={paginas}
          onGuardado={(guardada) => {
            const msg = editando
              ? `Se actualizaron los datos de «${guardada.titulo}».`
              : `Se creó la página «${guardada.titulo}».`;
            toast.exito(msg);
            setCreando(false);
            setEditando(null);
            setTimeout(() => tituloRef.current?.focus(), 0);
          }}
          onCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
        />
      )}

      {porEliminar && (
        <ConfirmarAccion
          titulo={`Eliminar «${porEliminar.titulo}»`}
          pendiente={eliminarMut.isPending}
          error={eliminarMut.error}
          onConfirmar={() => eliminarMut.mutate(porEliminar)}
          onCancelar={() => {
            eliminarMut.reset();
            setPorEliminar(null);
          }}
        >
          Se eliminarán la página y todos sus bloques.
        </ConfirmarAccion>
      )}
    </section>
  );
}
