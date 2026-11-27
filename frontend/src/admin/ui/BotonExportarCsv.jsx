import { useState } from 'react';
import { Download } from 'lucide-react';

import { usePermisos } from '../permisos/usePermisos.js';
import Boton from './Boton.jsx';
import { construirUrlExportacion } from './exportarCsv.js';
import { useToast } from './useToast.js';

const TEXTO_AYUDA = 'Se exporta lo que ves con los filtros actuales, sin límite de páginas.';

function extraerNombreArchivo(cabecera, respaldo) {
  if (!cabecera) return respaldo;
  const match = /filename="?([^";]+)"?/i.exec(cabecera);
  return match?.[1] || respaldo;
}

/**
 * Botón reutilizable para exportar el listado actual a CSV con los filtros activos.
 * Se oculta si el rol del usuario no tiene el permiso de exportación correspondiente.
 */
export default function BotonExportarCsv({
  recurso,
  permiso,
  filtros = {},
  etiqueta = 'Exportar CSV',
  className = '',
}) {
  const { puede } = usePermisos();
  const toast = useToast();
  const [exportando, setExportando] = useState(false);

  if (!puede(permiso)) return null;

  const manejarExportar = async () => {
    if (exportando) return;
    setExportando(true);
    try {
      const url = construirUrlExportacion(recurso, filtros);
      const respuesta = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'text/csv' },
      });

      if (!respuesta.ok) {
        let mensaje = 'No se pudo exportar el archivo CSV. Inténtalo de nuevo.';
        try {
          const tipo = respuesta.headers.get('content-type') ?? '';
          if (tipo.includes('application/json')) {
            const datos = await respuesta.json();
            if (datos?.error?.mensaje) mensaje = datos.error.mensaje;
          }
        } catch {
          // Mantiene el mensaje genérico si el cuerpo no es JSON válido.
        }
        toast.error(mensaje);
        return;
      }

      const blob = await respuesta.blob();
      const respaldo = `${recurso.replace(/\//g, '-')}.csv`;
      const nombreArchivo = extraerNombreArchivo(
        respuesta.headers.get('content-disposition'),
        respaldo,
      );

      const urlObjeto = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = urlObjeto;
      enlace.download = nombreArchivo;
      enlace.style.display = 'none';
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(urlObjeto);
    } catch {
      toast.error('No hay conexión con el servidor para exportar el CSV.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <Boton
      variante="secundario"
      icono={Download}
      cargando={exportando}
      onClick={manejarExportar}
      title={TEXTO_AYUDA}
      className={className}
    >
      {exportando ? 'Exportando…' : etiqueta}
    </Boton>
  );
}
