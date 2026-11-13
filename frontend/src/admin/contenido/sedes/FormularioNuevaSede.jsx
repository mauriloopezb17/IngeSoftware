import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import CampoTexto from '../../componentes/CampoTexto.jsx';
import Dialogo from '../../componentes/Dialogo.jsx';
import CampoSelect from '../componentes/CampoSelect.jsx';
import { extraerErroresApi } from '../componentes/errores.js';
import { CLAVE_SEDES, crearSede } from './api.js';

export default function FormularioNuevaSede({ sedesExistentes, tiposSede, onCreada, onCerrar }) {
  const idActivo = useId();
  const queryClient = useQueryClient();

  const [nombre, setNombre] = useState('');
  const [slug, setSlug] = useState('');
  const [tipo, setTipo] = useState(tiposSede[1]?.codigo ?? 'CAPILLA');
  const [sedePadreId, setSedePadreId] = useState('');
  const [direccion, setDireccion] = useState('');
  const [activo, setActivo] = useState(false);
  const [erroresCampo, setErroresCampo] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: crearSede,
    onSuccess: (creada) => {
      queryClient.invalidateQueries({ queryKey: CLAVE_SEDES });
      onCreada(creada);
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

    mutate({
      nombre: nombre.trim(),
      slug: slug.trim() || null,
      tipo,
      sedePadreId: sedePadreId ? Number(sedePadreId) : null,
      direccion: direccion.trim() || null,
      activo,
    });
  }

  return (
    <Dialogo
      titulo="Nueva sede"
      onCerrar={isPending ? () => {} : onCerrar}
      ancho="max-w-lg"
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
          etiqueta="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={120}
          placeholder="Ej. Capilla Santa Gema"
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

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect
            etiqueta="Tipo de sede"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            error={erroresCampo.tipo}
            disabled={isPending}
          >
            {tiposSede.map((t) => (
              <option key={t.codigo} value={t.codigo}>
                {t.nombre}
              </option>
            ))}
          </CampoSelect>

          <CampoSelect
            etiqueta="Sede padre (opcional)"
            value={sedePadreId}
            onChange={(e) => setSedePadreId(e.target.value)}
            error={erroresCampo.sedePadreId}
            disabled={isPending}
          >
            <option value="">Ninguna</option>
            {sedesExistentes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </CampoSelect>
        </div>

        <CampoTexto
          etiqueta="Dirección (opcional)"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          maxLength={255}
          error={erroresCampo.direccion}
          disabled={isPending}
        />

        <label htmlFor={idActivo} className="flex items-center gap-2.5 text-sm font-medium text-ink">
          <input
            id={idActivo}
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            disabled={isPending}
            className="size-4 rounded border-borderSoft accent-goldDark"
          />
          Sede activa en el portal
        </label>

        <div className="mt-2 flex justify-end gap-2 border-t border-borderSoft pt-4">
          <button
            type="button"
            onClick={onCerrar}
            disabled={isPending}
            className="rounded-md border border-borderSoft bg-white px-4 py-2 text-sm font-medium hover:bg-stone disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white disabled:opacity-60"
          >
            {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {isPending ? 'Creando…' : 'Crear sede'}
          </button>
        </div>
      </form>
    </Dialogo>
  );
}

