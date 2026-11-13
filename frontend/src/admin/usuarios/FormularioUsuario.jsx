import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import CampoTexto from '../componentes/CampoTexto.jsx';
import Dialogo from '../componentes/Dialogo.jsx';
import CampoSelect from '../contenido/componentes/CampoSelect.jsx';
import { extraerErroresApi } from '../contenido/componentes/errores.js';
import {
  actualizarUsuario,
  CLAVE_USUARIOS,
  crearUsuario,
  ROLES_USUARIO,
} from './api.js';

export default function FormularioUsuario({ usuario, sedes = [], onGuardado, onCerrar }) {
  const esEdicion = Boolean(usuario);
  const idActivo = useId();
  const queryClient = useQueryClient();

  const [nombreCompleto, setNombreCompleto] = useState(usuario?.nombreCompleto ?? '');
  const [correo, setCorreo] = useState(usuario?.correo ?? '');
  const [rol, setRol] = useState(usuario?.rol?.codigo ?? 'SECRETARIA');
  const [sedeId, setSedeId] = useState(
    usuario?.sede?.id ? String(usuario.sede.id) : sedes[0]?.id ? String(sedes[0].id) : '',
  );
  const [contrasena, setContrasena] = useState('');
  const [activo, setActivo] = useState(usuario?.activo ?? true);
  const [erroresCampo, setErroresCampo] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');

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
          <p
            role="alert"
            className="rounded-md border border-redParish/30 bg-redParish/5 px-3 py-2 text-sm text-redParish"
          >
            {errorGeneral}
          </p>
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
            onChange={(e) => setSedeId(e.target.value)}
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

        <label
          htmlFor={idActivo}
          className="flex items-center gap-2.5 rounded-md border border-borderSoft bg-cream/40 px-3 py-2.5 text-sm font-medium text-ink"
        >
          <input
            id={idActivo}
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            disabled={isPending}
            className="size-4 accent-goldDark"
          />
          Usuario activo
        </label>

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
            {isPending ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </Dialogo>
  );
}

