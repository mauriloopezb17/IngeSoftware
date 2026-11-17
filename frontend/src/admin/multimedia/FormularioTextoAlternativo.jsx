import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ErrorApi } from '../../services/clienteHttp.js';
import { Aviso, Boton, CampoArea, useToast } from '../ui/index.js';
import { actualizarTextoAlternativo, CLAVE_MULTIMEDIA } from './api.js';

const MAXIMO = 255;

// Edición del texto alternativo de un archivo (PATCH). Un texto vacío lo borra (se envía null).
export default function FormularioTextoAlternativo({ archivo, onGuardado, onCancelar }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [texto, setTexto] = useState(archivo.textoAlternativo ?? '');
  const [errorCampo, setErrorCampo] = useState('');
  const [errorGeneral, setErrorGeneral] = useState('');

  const { mutate, isPending } = useMutation({
    mutationKey: [...CLAVE_MULTIMEDIA, 'editar'],
    mutationFn: (nuevoTexto) => actualizarTextoAlternativo(archivo.id, nuevoTexto),
    onSuccess: (actualizado) => {
      queryClient.invalidateQueries({ queryKey: CLAVE_MULTIMEDIA });
      toast.exito('Texto alternativo actualizado.');
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

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-3">
      {errorGeneral && (
        <Aviso tipo="error">
          <p>{errorGeneral}</p>
        </Aviso>
      )}

      <CampoArea
        etiqueta="Texto alternativo"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={MAXIMO}
        rows={3}
        autoFocus
        disabled={isPending}
        mostrarContador
        ayuda="Describe lo que se ve. Déjalo vacío para quitarlo."
        error={errorCampo}
      />

      <div className="flex gap-2">
        <Boton type="submit" variante="primario" tamano="sm" cargando={isPending}>
          {isPending ? 'Guardando…' : 'Guardar'}
        </Boton>
        <Boton variante="secundario" tamano="sm" onClick={onCancelar} disabled={isPending}>
          Cancelar
        </Boton>
      </div>
    </form>
  );
}
