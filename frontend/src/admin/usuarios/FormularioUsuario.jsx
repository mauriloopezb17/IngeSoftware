import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';

import Dialogo from '../componentes/Dialogo.jsx';
import { extraerErroresApi } from '../contenido/componentes/errores.js';
import { CLAVE_GRUPOS, listarGrupos } from '../contenido/grupos/api.js';
import { Aviso, Boton, CampoCasilla, CampoSelect, CampoTexto } from '../ui/index.js';
import {
  actualizarUsuario,
  CLAVE_USUARIOS,
  crearUsuario,
  ROLES_USUARIO,
} from './api.js';

export default function FormularioUsuario({ usuario, sedes = [], onGuardado, onCerrar }) {
  const esEdicion = Boolean(usuario);
  const queryClient = useQueryClient();

  const [nombreCompleto, setNombreCompleto] = useState(usuario?.nombreCompleto ?? '');
  const [correo, setCorreo] = useState(usuario?.correo ?? '');
  const [rol, setRol] = useState(usuario?.rol?.codigo ?? 'SECRETARIA');
  const [sedeId, setSedeId] = useState(
    usuario?.sede?.id ? String(usuario.sede.id) : sedes[0]?.id ? String(sedes[0].id) : '',
  );
  const [grupoIds, setGrupoIds] = useState(() =>
    (usuario?.gruposAsignados ?? []).map((g) => g.id),
  );
  const [contrasena, setContrasena] = useState('');
  const [activo, setActivo] = useState(usuario?.activo ?? true);
  const [erroresCampo, setErroresCampo] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');

  const sedeSeleccionada = sedes.find((s) => String(s.id) === String(sedeId));
  const gruposQuery = useQuery({
    queryKey: [...CLAVE_GRUPOS, 'selector-usuario', sedeSeleccionada?.slug ?? ''],
    queryFn: () => listarGrupos({ sede: sedeSeleccionada.slug, porPagina: 100 }),
    enabled: rol === 'COORDINADOR' && Boolean(sedeSeleccionada?.slug),
  });
  const gruposDisponibles = gruposQuery.data ?? [];

  function toggleGrupo(idGrupo) {
    setGrupoIds((actual) =>
      actual.includes(idGrupo) ? actual.filter((id) => id !== idGrupo) : [...actual, idGrupo],
    );
  }

  const { mutate, isPending } = useMutation({
    mutationFn: (cuerpo) =>
      esEdicion ? actualizarUsuario(usuario.id, cuerpo) : crearUsuario(cuerpo),
    onSuccess: (guardado) => {
      queryClient.invalidateQueries({ queryKey: CLAVE_USUARIOS });
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

    const cuerpo = {
      nombreCompleto: nombreCompleto.trim(),
      correo: correo.trim(),
      rol,
      sedeId: sedeId ? Number(sedeId) : null,
      activo,
      ...(rol === 'COORDINADOR' ? { grupoIds } : {}),
    };
    if (!esEdicion) {
      cuerpo.contrasena = contrasena;
    }
    mutate(cuerpo);
  }

  return (
    <Dialogo
      titulo={esEdicion ? `Editar usuario «${usuario.nombreCompleto}»` : 'Nuevo usuario'}
      onCerrar={isPending ? () => {} : onCerrar}
      ancho="max-w-xl"
    >
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        {errorGeneral && (
          <Aviso tipo="error">
            <p>{errorGeneral}</p>
          </Aviso>
        )}

        <CampoTexto
          etiqueta="Nombre completo"
          value={nombreCompleto}
          onChange={(e) => setNombreCompleto(e.target.value)}
          maxLength={120}
          placeholder="Ej. María Elena Quispe"
          error={erroresCampo.nombreCompleto}
          disabled={isPending}
        />

        <CampoTexto
          etiqueta="Correo electrónico"
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          maxLength={120}
          placeholder="nombre@pasionistas.org.bo"
          error={erroresCampo.correo}
          disabled={isPending}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect
            etiqueta="Rol"
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            error={erroresCampo.rol}
            disabled={isPending}
          >
            {ROLES_USUARIO.map((r) => (
              <option key={r.codigo} value={r.codigo}>
                {r.nombre}
              </option>
            ))}
          </CampoSelect>

          <CampoSelect
            etiqueta={rol === 'ADMINISTRADOR' ? 'Sede (opcional para Administrador)' : 'Sede'}
            value={sedeId}
            onChange={(e) => {
              setSedeId(e.target.value);
              setGrupoIds([]);
            }}
            error={erroresCampo.sedeId}
            disabled={isPending}
          >
            {rol === 'ADMINISTRADOR' && <option value="">Sin sede asignada</option>}
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </CampoSelect>
        </div>

        {rol === 'COORDINADOR' && (
          <fieldset className="flex flex-col gap-2 rounded-md border border-sand bg-panel p-3.5">
            <legend className="px-1 text-sm font-semibold text-ink">Grupos que coordina</legend>
            {!sedeSeleccionada ? (
              <p className="text-xs text-muted">Elige primero una sede para ver sus grupos.</p>
            ) : gruposQuery.isPending ? (
              <p className="text-xs text-muted">Cargando grupos de {sedeSeleccionada.nombre}…</p>
            ) : gruposDisponibles.length === 0 ? (
              <p className="text-xs text-muted">No hay grupos registrados en esta sede.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {gruposDisponibles.map((g) => (
                  <CampoCasilla
                    key={g.id}
                    etiqueta={g.nombre}
                    checked={grupoIds.includes(g.id)}
                    onChange={() => toggleGrupo(g.id)}
                    disabled={isPending}
                  />
                ))}
              </div>
            )}
            {erroresCampo.grupoIds && (
              <p className="flex items-start gap-1.5 text-sm text-danger">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <span>{erroresCampo.grupoIds}</span>
              </p>
            )}
          </fieldset>
        )}

        {!esEdicion && (
          <CampoTexto
            etiqueta="Contraseña inicial"
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            ayuda="Mínimo 10 caracteres."
            error={erroresCampo.contrasena}
            disabled={isPending}
          />
        )}

        <div className="rounded-md border border-sand bg-panel px-3 py-2.5">
          <CampoCasilla
            etiqueta="Usuario activo"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            disabled={isPending}
          />
        </div>

        <div className="mt-2 flex flex-wrap justify-end gap-2 border-t border-sand pt-4">
          <Boton variante="secundario" onClick={onCerrar} disabled={isPending}>
            Cancelar
          </Boton>
          <Boton type="submit" variante="primario" cargando={isPending}>
            {isPending ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear usuario'}
          </Boton>
        </div>
      </form>
    </Dialogo>
  );
}
