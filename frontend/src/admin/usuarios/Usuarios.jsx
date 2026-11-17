import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox, KeyRound, Pencil, Plus, UserCheck, UserX } from 'lucide-react';

import Paginacion from '../componentes/Paginacion.jsx';
import { CLAVE_SEDES, listarSedes } from '../contenido/sedes/api.js';
import {
  Aviso,
  Boton,
  CampoSelect,
  CampoTexto,
  EncabezadoPantalla,
  EsqueletoTarjetas,
  EstadoVacio,
  Insignia,
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

  const [buscar, setBuscar] = useState('');
  const [rol, setRol] = useState('');
  const [sede, setSede] = useState('');
  const [activo, setActivo] = useState('');
  const [pagina, setPagina] = useState(1);

  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [restableciendo, setRestableciendo] = useState(null);
  const [aviso, setAviso] = useState('');
  const [errorAccion, setErrorAccion] = useState('');

  const sedesQuery = useQuery({
    queryKey: CLAVE_SEDES,
    queryFn: listarSedes,
  });

  const usuariosQuery = useQuery({
    queryKey: [...CLAVE_USUARIOS, { buscar, rol, sede, activo, pagina }],
    queryFn: () =>
      listarUsuarios({
        buscar: buscar.trim() || undefined,
        rol: rol || undefined,
        sede: sede || undefined,
        activo: activo || undefined,
        pagina,
        porPagina: 20,
      }),
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
      setAviso(msg);
      toast.exito(msg);
    },
    onError: (err) => {
      setAviso('');
      setErrorAccion(err.message);
    },
  });

  const usuarios = usuariosQuery.data?.datos ?? [];
  const paginacion = usuariosQuery.data?.paginacion;
  const sedes = sedesQuery.data ?? [];

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
              setAviso('');
              setErrorAccion('');
              setCreando(true);
            }}
          >
            Nuevo usuario
          </Boton>
        }
      />

      {aviso ? (
        <Aviso tipo="exito" className="mt-4">
          {aviso}
        </Aviso>
      ) : (
        <p role="status" className="sr-only" />
      )}

      {errorAccion && (
        <Aviso tipo="error" className="mt-4">
          <p>{errorAccion}</p>
        </Aviso>
      )}

      <div className="mt-6 grid gap-3 rounded-lg border border-sand bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <CampoTexto
          etiqueta="Buscar"
          type="search"
          value={buscar}
          onChange={(e) => {
            setBuscar(e.target.value);
            setPagina(1);
          }}
          placeholder="Nombre o correo"
        />

        <CampoSelect
          etiqueta="Rol"
          value={rol}
          onChange={(e) => {
            setRol(e.target.value);
            setPagina(1);
          }}
        >
          <option value="">Todos los roles</option>
          {ROLES_USUARIO.map((r) => (
            <option key={r.codigo} value={r.codigo}>
              {r.nombre}
            </option>
          ))}
        </CampoSelect>

        <CampoSelect
          etiqueta="Sede"
          value={sede}
          onChange={(e) => {
            setSede(e.target.value);
            setPagina(1);
          }}
        >
          <option value="">Todas las sedes</option>
          {sedes.map((s) => (
            <option key={s.id} value={s.slug}>
              {s.nombre}
            </option>
          ))}
        </CampoSelect>

        <CampoSelect
          etiqueta="Estado"
          value={activo}
          onChange={(e) => {
            setActivo(e.target.value);
            setPagina(1);
          }}
        >
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </CampoSelect>
      </div>

      <div className="mt-6" aria-busy={usuariosQuery.isPending}>
        {usuariosQuery.isPending && (
          <EsqueletoTarjetas cantidad={3} columnas="grid-cols-1" etiqueta="Cargando usuarios…" />
        )}

        {usuariosQuery.isError && (
          <Aviso
            tipo="error"
            accion={
              <Boton variante="secundario" tamano="sm" onClick={() => usuariosQuery.refetch()}>
                Reintentar
              </Boton>
            }
          >
            <p>{usuariosQuery.error?.message || 'No se pudieron cargar los datos.'}</p>
          </Aviso>
        )}

        {!usuariosQuery.isPending && !usuariosQuery.isError && usuarios.length === 0 && (
          <EstadoVacio
            icono={Inbox}
            titulo="No hay usuarios que coincidan con los filtros."
            descripcion="Ajusta los filtros de búsqueda o crea un usuario nuevo."
          />
        )}

        {usuarios.length > 0 && (
          <ul aria-label="Usuarios" className="flex flex-col gap-3">
            {usuarios.map((usuario) => (
              <li
                key={usuario.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-sand bg-white p-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-body text-base font-semibold text-ink">{usuario.nombreCompleto}</h2>
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

                <div className="flex flex-wrap items-center gap-2">
                  <Boton
                    variante="secundario"
                    tamano="sm"
                    icono={Pencil}
                    onClick={() => {
                      setAviso('');
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
                      setAviso('');
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
              </li>
            ))}
          </ul>
        )}

        {paginacion && (
          <Paginacion
            paginacion={paginacion}
            onCambiar={setPagina}
            nombre="Paginación de usuarios"
          />
        )}
      </div>

      {(creando || editando) && (
        <FormularioUsuario
          usuario={editando}
          sedes={sedes}
          onGuardado={(guardado) => {
            const msg = editando
              ? `Se actualizaron los datos de «${guardado.nombreCompleto}».`
              : `Se creó el usuario «${guardado.nombreCompleto}».`;
            setAviso(msg);
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

      {restableciendo && (
        <RestablecerContrasena
          usuario={restableciendo}
          onGuardado={() => {
            const msg = `Se restableció la contraseña de «${restableciendo.nombreCompleto}».`;
            setAviso(msg);
            toast.exito(msg);
            setRestableciendo(null);
            setTimeout(() => tituloRef.current?.focus(), 0);
          }}
          onCerrar={() => setRestableciendo(null)}
        />
      )}
    </section>
  );
}
