import { useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Pencil, Plus, UserCheck, UserX } from 'lucide-react';

import Paginacion from '../componentes/Paginacion.jsx';
import EstadoLista from '../contenido/componentes/EstadoLista.jsx';
import { CLAVE_SEDES, listarSedes } from '../contenido/sedes/api.js';
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
  const idBuscar = useId();
  const idRol = useId();
  const idSede = useId();
  const idActivo = useId();
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
      setAviso(
        actualizado.activo
          ? `Se activó la cuenta de «${actualizado.nombreCompleto}».`
          : `Se desactivó la cuenta de «${actualizado.nombreCompleto}».`,
      );
    },
    onError: (err) => {
      setAviso('');
      setErrorAccion(err.message);
    },
  });

  const usuarios = usuariosQuery.data?.datos ?? [];
  const paginacion = usuariosQuery.data?.meta?.paginacion;
  const sedes = sedesQuery.data ?? [];

  return (
    <section className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            ref={tituloRef}
            tabIndex={-1}
            className="font-display text-4xl font-semibold text-ink outline-none"
          >
            Usuarios
          </h1>
          <p className="mt-2 text-muted">
            Cuentas de acceso al panel parroquial, roles y sedes asignadas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setAviso('');
            setErrorAccion('');
            setCreando(true);
          }}
          className="flex items-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark"
        >
          <Plus className="size-4" aria-hidden="true" />
          Nuevo usuario
        </button>
      </header>

      <p
        role="status"
        className={aviso ? 'mt-4 rounded-md bg-goldPale px-3 py-2 text-sm text-goldDark' : 'sr-only'}
      >
        {aviso}
      </p>

      {errorAccion && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-redParish/30 bg-redParish/5 px-3 py-2 text-sm text-redParish"
        >
          {errorAccion}
        </p>
      )}

      <div className="mt-6 grid gap-3 rounded-lg border border-borderSoft bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={idBuscar} className="text-xs font-semibold text-muted">
            Buscar
          </label>
          <input
            id={idBuscar}
            type="search"
            value={buscar}
            onChange={(e) => {
              setBuscar(e.target.value);
              setPagina(1);
            }}
            placeholder="Nombre o correo"
            className="rounded-md border border-borderSoft bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-goldDark"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={idRol} className="text-xs font-semibold text-muted">
            Rol
          </label>
          <select
            id={idRol}
            value={rol}
            onChange={(e) => {
              setRol(e.target.value);
              setPagina(1);
            }}
            className="rounded-md border border-borderSoft bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-goldDark"
          >
            <option value="">Todos los roles</option>
            {ROLES_USUARIO.map((r) => (
              <option key={r.codigo} value={r.codigo}>
                {r.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={idSede} className="text-xs font-semibold text-muted">
            Sede
          </label>
          <select
            id={idSede}
            value={sede}
            onChange={(e) => {
              setSede(e.target.value);
              setPagina(1);
            }}
            className="rounded-md border border-borderSoft bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-goldDark"
          >
            <option value="">Todas las sedes</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.slug}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={idActivo} className="text-xs font-semibold text-muted">
            Estado
          </label>
          <select
            id={idActivo}
            value={activo}
            onChange={(e) => {
              setActivo(e.target.value);
              setPagina(1);
            }}
            className="rounded-md border border-borderSoft bg-white px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-goldDark"
          >
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
      </div>

      <div className="mt-6">
        <EstadoLista
          cargando={usuariosQuery.isPending}
          error={usuariosQuery.isError ? usuariosQuery.error : null}
          vacio={!usuariosQuery.isPending && !usuariosQuery.isError && usuarios.length === 0}
          textoCargando="Cargando usuarios…"
          textoVacio="No hay usuarios que coincidan con los filtros."
          onReintentar={() => usuariosQuery.refetch()}
        />

        {usuarios.length > 0 && (
          <ul aria-label="Usuarios" className="flex flex-col gap-3">
            {usuarios.map((usuario) => (
              <li
                key={usuario.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-borderSoft bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-ink">{usuario.nombreCompleto}</h2>
                    <span className="rounded-full bg-goldPale px-2.5 py-0.5 text-xs font-semibold text-goldDark">
                      {usuario.rol.nombre}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        usuario.activo
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-stone text-muted'
                      }`}
                    >
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <p className="mt-1 break-all text-sm text-charcoal">{usuario.correo}</p>
                  <p className="mt-1 text-xs text-muted">
                    Sede: {usuario.sede ? usuario.sede.nombre : 'Todas las sedes'} · Último acceso:{' '}
                    {formatearFechaUsuario(usuario.fechaUltimoAcceso)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAviso('');
                      setErrorAccion('');
                      setEditando(usuario);
                    }}
                    aria-label={`Editar a ${usuario.nombreCompleto}`}
                    className="flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAviso('');
                      setErrorAccion('');
                      setRestableciendo(usuario);
                    }}
                    aria-label={`Restablecer contraseña de ${usuario.nombreCompleto}`}
                    className="flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
                  >
                    <KeyRound className="size-4" aria-hidden="true" />
                    Contraseña
                  </button>

                  <button
                    type="button"
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
                    className={`flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-2 text-sm font-medium focus-visible:outline-2 ${
                      usuario.activo
                        ? 'text-redParish hover:bg-redParish/5 focus-visible:outline-redParish'
                        : 'text-ink hover:bg-stone focus-visible:outline-goldDark'
                    }`}
                  >
                    {usuario.activo ? (
                      <>
                        <UserX className="size-4" aria-hidden="true" />
                        Desactivar
                      </>
                    ) : (
                      <>
                        <UserCheck className="size-4" aria-hidden="true" />
                        Activar
                      </>
                    )}
                  </button>
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
            setAviso(
              editando
                ? `Se actualizaron los datos de «${guardado.nombreCompleto}».`
                : `Se creó el usuario «${guardado.nombreCompleto}».`,
            );
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
            setAviso(`Se restableció la contraseña de «${restableciendo.nombreCompleto}».`);
            setRestableciendo(null);
            setTimeout(() => tituloRef.current?.focus(), 0);
          }}
          onCerrar={() => setRestableciendo(null)}
        />
      )}
    </section>
  );
}

