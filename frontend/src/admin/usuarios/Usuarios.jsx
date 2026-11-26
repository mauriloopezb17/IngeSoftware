import { useMemo, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox, KeyRound, Pencil, Plus, UserCheck, UserX } from 'lucide-react';

import { CLAVE_SEDES, listarSedes } from '../contenido/sedes/api.js';
import {
  Aviso,
  Boton,
  CampoSelect,
  EncabezadoPantalla,
  Insignia,
  TablaListado,
  useFiltrosListado,
  useToast,
} from '../ui/index.js';
import {
  actualizarUsuario,
  CLAVE_USUARIOS,
  formatearFechaUsuario,
  listarUsuarios,
  ROLES_USUARIO,
} from './api.js';
import FormularioUsuario from './FormularioUsuario.jsx';
import RestablecerContrasena from './RestablecerContrasena.jsx';

export default function Usuarios() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const tituloRef = useRef(null);

  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [restableciendo, setRestableciendo] = useState(null);
  const [errorAccion, setErrorAccion] = useState('');

  const configFiltros = useMemo(
    () => ({
      rol: { defecto: '', validar: (v) => ROLES_USUARIO.some((r) => r.codigo === v) },
      sede: { defecto: '' },
      activo: { defecto: '', validar: (v) => v === 'true' || v === 'false' },
    }),
    [],
  );

  const {
    valores,
    busqueda,
    setBusqueda,
    setPagina,
    actualizarFiltro,
    limpiarFiltros,
    hayFiltrosActivos,
    filtrosActivos,
  } = useFiltrosListado({
    filtros: configFiltros,
    porPagina: 20,
  });

  const sedesQuery = useQuery({
    queryKey: CLAVE_SEDES,
    queryFn: listarSedes,
  });

  const usuariosQuery = useQuery({
    queryKey: [...CLAVE_USUARIOS, filtrosActivos],
    queryFn: () => listarUsuarios(filtrosActivos),
    placeholderData: keepPreviousData,
  });

  const cambiarEstadoMut = useMutation({
    mutationFn: ({ id, siguienteActivo }) =>
      actualizarUsuario(id, { activo: siguienteActivo }),
    onSuccess: (actualizado) => {
      setErrorAccion('');
      queryClient.invalidateQueries({ queryKey: CLAVE_USUARIOS });
      const msg = actualizado.activo
        ? `Se activó la cuenta de «${actualizado.nombreCompleto}».`
        : `Se desactivó la cuenta de «${actualizado.nombreCompleto}».`;
      toast.exito(msg);
    },
    onError: (err) => {
      setErrorAccion(err.message);
    },
  });

  const usuarios = usuariosQuery.data?.datos ?? [];
  const paginacion = usuariosQuery.data?.paginacion;
  const sedes = sedesQuery.data ?? [];

  const columnas = [
    {
      id: 'usuario',
      encabezado: 'Usuario',
      render: (usuario) => (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">{usuario.nombreCompleto}</span>
            <Insignia variante="programado">{usuario.rol.nombre}</Insignia>
            <Insignia variante={usuario.activo ? 'publicado' : 'archivado'}>
              {usuario.activo ? 'Activo' : 'Inactivo'}
            </Insignia>
          </div>
          <p className="mt-1 break-all text-sm text-ink">{usuario.correo}</p>
          <p className="mt-1 text-xs text-muted">
            Sede: {usuario.sede ? usuario.sede.nombre : 'Todas las sedes'} · Último acceso:{' '}
            {formatearFechaUsuario(usuario.fechaUltimoAcceso)}
          </p>
        </div>
      ),
    },
    {
      id: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      claseCelda: 'text-right sm:w-px sm:whitespace-nowrap',
      render: (usuario) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Boton
            variante="secundario"
            tamano="sm"
            icono={Pencil}
            onClick={() => {
              setErrorAccion('');
              setEditando(usuario);
            }}
            aria-label={`Editar a ${usuario.nombreCompleto}`}
          >
            Editar
          </Boton>

          <Boton
            variante="secundario"
            tamano="sm"
            icono={KeyRound}
            onClick={() => {
              setErrorAccion('');
              setRestableciendo(usuario);
            }}
            aria-label={`Restablecer contraseña de ${usuario.nombreCompleto}`}
          >
            Contraseña
          </Boton>

          <Boton
            variante="secundario"
            tamano="sm"
            icono={usuario.activo ? UserX : UserCheck}
            onClick={() =>
              cambiarEstadoMut.mutate({
                id: usuario.id,
                siguienteActivo: !usuario.activo,
              })
            }
            disabled={cambiarEstadoMut.isPending}
            aria-label={
              usuario.activo
                ? `Desactivar a ${usuario.nombreCompleto}`
                : `Activar a ${usuario.nombreCompleto}`
            }
          >
            {usuario.activo ? 'Desactivar' : 'Activar'}
          </Boton>
        </div>
      ),
    },
  ];

  return (
    <section className="mx-auto max-w-5xl">
      <EncabezadoPantalla
        titulo="Usuarios"
        descripcion="Cuentas de acceso al panel parroquial, roles y sedes asignadas."
        headingRef={tituloRef}
        acciones={
          <Boton
            variante="primario"
            icono={Plus}
            onClick={() => {
              setErrorAccion('');
              setCreando(true);
            }}
          >
            Nuevo usuario
          </Boton>
        }
      />

      {errorAccion && (
        <Aviso tipo="error" className="mt-4">
          <p>{errorAccion}</p>
        </Aviso>
      )}

      <div className="mt-6">
        <TablaListado
          caption="Usuarios"
          nombrePaginacion="Paginación de usuarios"
          columnas={columnas}
          datos={usuarios}
          paginacion={paginacion}
          onCambiarPagina={setPagina}
          cargando={usuariosQuery.isPending}
          tenue={usuariosQuery.isPlaceholderData}
          error={
            usuariosQuery.isError
              ? usuariosQuery.error?.message || 'No se pudieron cargar los datos.'
              : null
          }
          onReintentar={usuariosQuery.refetch}
          busqueda={busqueda}
          onCambiarBusqueda={setBusqueda}
          placeholderBusqueda="Nombre o correo"
          filtrosExtra={
            <>
              <div className="min-w-[160px]">
                <CampoSelect
                  etiqueta="Rol"
                  value={valores.rol}
                  onChange={(e) => actualizarFiltro('rol', e.target.value)}
                >
                  <option value="">Todos los roles</option>
                  {ROLES_USUARIO.map((r) => (
                    <option key={r.codigo} value={r.codigo}>
                      {r.nombre}
                    </option>
                  ))}
                </CampoSelect>
              </div>

              <div className="min-w-[180px]">
                <CampoSelect
                  etiqueta="Sede"
                  value={valores.sede}
                  onChange={(e) => actualizarFiltro('sede', e.target.value)}
                >
                  <option value="">Todas las sedes</option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.slug}>
                      {s.nombre}
                    </option>
                  ))}
                </CampoSelect>
              </div>

              <div className="min-w-[140px]">
                <CampoSelect
                  etiqueta="Estado"
                  value={valores.activo}
                  onChange={(e) => actualizarFiltro('activo', e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="true">Activos</option>
                  <option value="false">Inactivos</option>
                </CampoSelect>
              </div>
            </>
          }
          hayFiltrosActivos={hayFiltrosActivos}
          onLimpiarFiltros={limpiarFiltros}
          vacio={{
            icono: Inbox,
            titulo: 'No hay usuarios que coincidan con los filtros.',
            descripcion: 'Ajusta los filtros de búsqueda o crea un usuario nuevo.',
          }}
          vacioConFiltros={{
            icono: Inbox,
            titulo: 'No hay usuarios que coincidan con los filtros.',
            descripcion: 'Ajusta los filtros de búsqueda o crea un usuario nuevo.',
          }}
        />
      </div>

      {(creando || editando) && (
        <FormularioUsuario
          usuario={editando}
          sedes={sedes}
          onGuardado={(guardado) => {
            const msg = editando
              ? `Se actualizaron los datos de «${guardado.nombreCompleto}».`
              : `Se creó el usuario «${guardado.nombreCompleto}».`;
            setCreando(false);
            setEditando(null);
            queryClient.invalidateQueries({ queryKey: CLAVE_USUARIOS });
            toast.exito(msg);
          }}
          onCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
        />
      )}

      {restableciendo && (
        <RestablecerContrasena
          usuario={restableciendo}
          onGuardado={() => {
            toast.exito(`Se restableció la contraseña de «${restableciendo.nombreCompleto}».`);
            setRestableciendo(null);
          }}
          onCerrar={() => setRestableciendo(null)}
        />
      )}
    </section>
  );
}
