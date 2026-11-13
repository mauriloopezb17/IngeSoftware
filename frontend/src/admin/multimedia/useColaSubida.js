import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { CLAVE_MULTIMEDIA, subirArchivo } from './api.js';
import { fueCancelada } from './subidaXhr.js';
import { validarArchivoCliente } from './validacion.js';

// Cola de subida: los archivos válidos esperan (con su texto alternativo) hasta que se
// pulsa «Subir»; los inválidos se rechazan de inmediato con su motivo. Se suben de a uno,
// porque un video puede ser muy grande.
//
// Estado de cada elemento: 'pendiente' | 'subiendo' | 'subido' | 'error' | 'cancelado'.
// Mientras sube, `progreso` (0 a 100) es lo ya enviado; al llegar a 100 el servidor aún procesa el archivo.
// Cancelar corta la subida en curso de ese archivo (queda 'cancelado', se puede reintentar) y la cola sigue.
export function useColaSubida() {
  const queryClient = useQueryClient();
  const contador = useRef(0);
  const controles = useRef(new Map()); // id del elemento -> AbortController de su subida en curso
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

  // Al salir de la pantalla no se deja una subida huérfana.
  useEffect(() => {
    const activos = controles.current;
    return () => activos.forEach((control) => control.abort());
  }, []);

  const actualizar = (id, cambios) =>
    setElementos((actuales) => actuales.map((e) => (e.id === id ? { ...e, ...cambios } : e)));

  function agregar(archivos) {
    const validos = [];
    const invalidos = [];

    for (const archivo of archivos) {
      const motivo = validarArchivoCliente(archivo);
      const id = ++contador.current;
      if (motivo) invalidos.push({ id, nombre: archivo.name, mensaje: motivo.mensaje });
      else validos.push({ id, archivo, textoAlternativo: '', estado: 'pendiente', mensaje: null, progreso: 0 });
    }

    if (validos.length) setElementos((actuales) => [...actuales, ...validos]);
    if (invalidos.length) setRechazados((actuales) => [...actuales, ...invalidos]);
  }

  async function subir(lista) {
    setSubiendo(true);
    for (const elemento of lista) {
      const control = new AbortController();
      controles.current.set(elemento.id, control);
      actualizar(elemento.id, { estado: 'subiendo', mensaje: null, progreso: 0 });
      try {
        await mutateAsync({
          archivo: elemento.archivo,
          textoAlternativo: elemento.textoAlternativo.trim(),
          senal: control.signal,
          onProgreso: (progreso) => actualizar(elemento.id, { progreso }),
        });
        actualizar(elemento.id, { estado: 'subido', progreso: 100 });
      } catch (error) {
        if (fueCancelada(error)) {
          actualizar(elemento.id, { estado: 'cancelado', progreso: 0 });
        } else {
          actualizar(elemento.id, { estado: 'error', mensaje: error.message, progreso: 0 });
          if (error.estado === 401) break; // la sesión venció: el panel vuelve al login
        }
      } finally {
        controles.current.delete(elemento.id);
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
    cancelar: (id) => controles.current.get(id)?.abort(),
    cambiarTexto: (id, textoAlternativo) => actualizar(id, { textoAlternativo }),
    quitar: (id) => setElementos((actuales) => actuales.filter((e) => e.id !== id)),
    quitarSubidos: () => setElementos((actuales) => actuales.filter((e) => e.estado !== 'subido')),
    descartarRechazados: () => setRechazados([]),
  };
}
