import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { CLAVE_MULTIMEDIA, subirArchivo } from './api.js';
import { validarArchivoCliente } from './validacion.js';

// Cola de subida: los archivos válidos esperan (con su texto alternativo) hasta que se
// pulsa «Subir»; los inválidos se rechazan de inmediato con su motivo. Se suben de a uno,
// porque un video puede ser muy grande.
//
// Estado de cada elemento: 'pendiente' | 'subiendo' | 'subido' | 'error'.
export function useColaSubida() {
  const queryClient = useQueryClient();
  const contador = useRef(0);
  const [elementos, setElementos] = useState([]);
  const [rechazados, setRechazados] = useState([]);
  const [subiendo, setSubiendo] = useState(false);

  const { mutateAsync } = useMutation({
    mutationKey: [...CLAVE_MULTIMEDIA, 'subir'],
    mutationFn: subirArchivo,
    // La biblioteca se refresca sola cuando se sube un archivo.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLAVE_MULTIMEDIA });
    },
  });

  const actualizar = (id, cambios) =>
    setElementos((actuales) => actuales.map((e) => (e.id === id ? { ...e, ...cambios } : e)));

  function agregar(archivos) {
    const validos = [];
    const invalidos = [];

    for (const archivo of archivos) {
      const motivo = validarArchivoCliente(archivo);
      const id = ++contador.current;
      if (motivo) invalidos.push({ id, nombre: archivo.name, mensaje: motivo.mensaje });
      else validos.push({ id, archivo, textoAlternativo: '', estado: 'pendiente', mensaje: null });
    }

    if (validos.length) setElementos((actuales) => [...actuales, ...validos]);
    if (invalidos.length) setRechazados((actuales) => [...actuales, ...invalidos]);
  }

  async function subir(lista) {
    setSubiendo(true);
    for (const elemento of lista) {
      actualizar(elemento.id, { estado: 'subiendo', mensaje: null });
      try {
        await mutateAsync({ archivo: elemento.archivo, textoAlternativo: elemento.textoAlternativo.trim() });
        actualizar(elemento.id, { estado: 'subido' });
      } catch (error) {
        actualizar(elemento.id, { estado: 'error', mensaje: error.message });
        if (error.estado === 401) break; // la sesión venció: el panel vuelve al login
      }
    }
    setSubiendo(false);
  }

  return {
    elementos,
    rechazados,
    subiendo,
    agregar,
    subirPendientes: () => subir(elementos.filter((e) => e.estado === 'pendiente')),
    reintentar: (id) => subir(elementos.filter((e) => e.id === id)),
    cambiarTexto: (id, textoAlternativo) => actualizar(id, { textoAlternativo }),
    quitar: (id) => setElementos((actuales) => actuales.filter((e) => e.id !== id)),
    quitarSubidos: () => setElementos((actuales) => actuales.filter((e) => e.estado !== 'subido')),
    descartarRechazados: () => setRechazados([]),
  };
}
