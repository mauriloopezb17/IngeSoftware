import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { ErrorApi } from '../../services/clienteHttp.js';
import { actualizarTextoAlternativo, CLAVE_MULTIMEDIA } from './api.js';

const MAXIMO = 255;

// Edición del texto alternativo de un archivo (PATCH). Un texto vacío lo borra (se envía null).
export default function FormularioTextoAlternativo({ archivo, onGuardado, onCancelar }) {
  const id = useId();
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState(archivo.textoAlternativo ?? '');
  const [errorCampo, setErrorCampo] = useState('');
  const [errorGeneral, setErrorGeneral] = useState('');

  const { mutate, isPending } = useMutation({
    mutationKey: [...CLAVE_MULTIMEDIA, 'editar'],
    mutationFn: (nuevoTexto) => actualizarTextoAlternativo(archivo.id, nuevoTexto),
    onSuccess: (actualizado) => {
      queryClient.invalidateQueries({ queryKey: CLAVE_MULTIMEDIA });
      onGuardado(actualizado);
    },
    onError: (error) => {
      const delCampo = error instanceof ErrorApi && error.detalles?.find((d) => d.campo === 'textoAlternativo');
      if (delCampo) setErrorCampo(delCampo.mensaje);
      else setErrorGeneral(error.message);
    },
  });

  function guardar(evento) {
    evento.preventDefault();
    setErrorCampo('');
    setErrorGeneral('');

    const nuevo = texto.trim() || null;
    if (nuevo === archivo.textoAlternativo) {
      onCancelar(); // sin cambios: no hace falta llamar a la API
      return;
    }
    mutate(nuevo);
  }

  const describedBy = [`${id}-ayuda`, errorCampo && `${id}-error`].filter(Boolean).join(' ');

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-2">
      {errorGeneral && (
        <p role="alert" className="rounded-md border border-redParish/30 bg-redParish/5 px-3 py-2 text-sm text-redParish">
          {errorGeneral}
        </p>
      )}

      <label htmlFor={id} className="text-xs font-semibold text-muted">
        Texto alternativo
      </label>
      <textarea
        id={id}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={MAXIMO}
        rows={3}
        autoFocus
        disabled={isPending}
        aria-invalid={errorCampo ? 'true' : undefined}
        aria-describedby={describedBy}
        className={`rounded-md border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-goldDark disabled:bg-stone ${
          errorCampo ? 'border-redParish' : 'border-borderSoft'
        }`}
      />
      <p id={`${id}-ayuda`} className="flex justify-between gap-3 text-xs text-muted">
        <span>Describe lo que se ve. Déjalo vacío para quitarlo.</span>
        <span aria-hidden="true">
          {texto.length}/{MAXIMO}
        </span>
      </p>
      {errorCampo && (
        <p id={`${id}-error`} className="text-sm text-redParish">
          {errorCampo}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {isPending ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={isPending}
          className="rounded-md border border-borderSoft bg-white px-4 py-2 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
