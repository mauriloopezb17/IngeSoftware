import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import CampoTexto from '../componentes/CampoTexto.jsx';
import Dialogo from '../componentes/Dialogo.jsx';
import { extraerErroresApi } from '../contenido/componentes/errores.js';
import { restablecerContrasena } from './api.js';

export default function RestablecerContrasena({ usuario, onGuardado, onCerrar }) {
  const [contrasenaNueva, setContrasenaNueva] = useState('');
  const [erroresCampo, setErroresCampo] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () => restablecerContrasena(usuario.id, contrasenaNueva),
    onSuccess: () => onGuardado(),
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
    mutate();
  }

  return (
    <Dialogo
      titulo={`Restablecer contraseña de «${usuario.nombreCompleto}»`}
      onCerrar={isPending ? () => {} : onCerrar}
      ancho="max-w-md"
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

        <p className="text-sm text-muted">
          Se reemplazará la contraseña actual de <strong>{usuario.correo}</strong>.
        </p>

        <CampoTexto
          etiqueta="Nueva contraseña"
          type="password"
          value={contrasenaNueva}
          onChange={(e) => setContrasenaNueva(e.target.value)}
          ayuda="Mínimo 10 caracteres."
          error={erroresCampo.contrasenaNueva}
          disabled={isPending}
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
            {isPending ? 'Actualizando…' : 'Restablecer contraseña'}
          </button>
        </div>
      </form>
    </Dialogo>
  );
}

