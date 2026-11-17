import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import Dialogo from '../componentes/Dialogo.jsx';
import { extraerErroresApi } from '../contenido/componentes/errores.js';
import { Aviso, Boton, CampoTexto } from '../ui/index.js';
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
          <Aviso tipo="error">
            <p>{errorGeneral}</p>
          </Aviso>
        )}

        <p className="text-sm text-muted">
          Se reemplazará la contraseña actual de <strong className="text-ink">{usuario.correo}</strong>.
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

        <div className="mt-2 flex flex-wrap justify-end gap-2 border-t border-sand pt-4">
          <Boton variante="secundario" onClick={onCerrar} disabled={isPending}>
            Cancelar
          </Boton>
          <Boton type="submit" variante="primario" cargando={isPending}>
            {isPending ? 'Actualizando…' : 'Restablecer contraseña'}
          </Boton>
        </div>
      </form>
    </Dialogo>
  );
}
