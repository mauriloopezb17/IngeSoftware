import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

const ESPERA_BUSQUEDA_DEFECTO_MS = 300;
const POR_PAGINA_DEFECTO = 15;

function parsearPagina(valor) {
  if (!valor) return 1;
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 1 ? numero : 1;
}

function leerValorFiltro(searchParams, clave, config) {
  const bruto = searchParams.get(clave);
  if (bruto === null || bruto === '') return config.defecto;

  if (config.tipo === 'booleano') {
    if (bruto === 'true' || bruto === '1') return true;
    if (bruto === 'false' || bruto === '0') return false;
    return config.defecto;
  }

  if (typeof config.validar === 'function' && !config.validar(bruto)) {
    return config.defecto;
  }

  return bruto;
}

/**
 * Sincroniza filtros, búsqueda (con espera de 300 ms), orden y página con la URL (`useSearchParams`).
 *
 * `filtrosActivos` devuelve el objeto plano listo para la API;
 * la exportación CSV de la ola 3 lo reutiliza tal cual.
 */
export function useFiltrosListado({
  filtros = {},
  ordenDefecto = '',
  ordenesValidos = null,
  porPagina = POR_PAGINA_DEFECTO,
  conBusqueda = true,
  esperaBusquedaMs = ESPERA_BUSQUEDA_DEFECTO_MS,
} = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const pagina = parsearPagina(searchParams.get('pagina'));

  const busquedaUrl = conBusqueda ? (searchParams.get('buscar') ?? '') : '';
  const [estadoBusqueda, setEstadoBusqueda] = useState({
    texto: busquedaUrl,
    urlAnterior: busquedaUrl,
  });

  if (estadoBusqueda.urlAnterior !== busquedaUrl) {
    setEstadoBusqueda({ texto: busquedaUrl, urlAnterior: busquedaUrl });
  }

  const busqueda = estadoBusqueda.texto;
  const setBusqueda = useCallback((nuevoTexto) => {
    setEstadoBusqueda((prev) => ({ ...prev, texto: nuevoTexto }));
  }, []);

  // Espera 300 ms antes de escribir `buscar` en la URL y reinicia a la página 1.
  useEffect(() => {
    if (!conBusqueda) return undefined;
    const limpio = busqueda.trim();
    if (limpio === busquedaUrl.trim()) return undefined;

    const temporizador = setTimeout(() => {
      setSearchParams(
        (actuales) => {
          const siguientes = new URLSearchParams(actuales);
          if (limpio) siguientes.set('buscar', limpio);
          else siguientes.delete('buscar');
          siguientes.delete('pagina');
          return siguientes;
        },
        { replace: true },
      );
    }, esperaBusquedaMs);

    return () => clearTimeout(temporizador);
  }, [busqueda, busquedaUrl, conBusqueda, esperaBusquedaMs, setSearchParams]);

  const ordenBruto = searchParams.get('orden') ?? '';
  const orden =
    ordenBruto && (!ordenesValidos || ordenesValidos.includes(ordenBruto))
      ? ordenBruto
      : ordenDefecto;

  const valores = useMemo(() => {
    const resultado = {};
    for (const [clave, config] of Object.entries(filtros)) {
      resultado[clave] = leerValorFiltro(searchParams, clave, config);
    }
    return resultado;
  }, [filtros, searchParams]);

  const setPagina = useCallback(
    (nuevaPagina) => {
      const numero = Number(nuevaPagina);
      const destino = Number.isInteger(numero) && numero >= 1 ? numero : 1;
      setSearchParams((actuales) => {
        const siguientes = new URLSearchParams(actuales);
        if (destino > 1) siguientes.set('pagina', String(destino));
        else siguientes.delete('pagina');
        return siguientes;
      });
    },
    [setSearchParams],
  );

  const actualizarFiltros = useCallback(
    (cambios) => {
      setSearchParams((actuales) => {
        const siguientes = new URLSearchParams(actuales);
        for (const [clave, valor] of Object.entries(cambios)) {
          const config = filtros[clave];
          if (!config) continue;
          const esDefecto = valor === config.defecto || valor === '' || valor === null || valor === undefined;
          if (esDefecto && !config.mantenerEnUrlSiDefecto) {
            siguientes.delete(clave);
          } else if (config.tipo === 'booleano') {
            if (valor) siguientes.set(clave, 'true');
            else siguientes.delete(clave);
          } else {
            siguientes.set(clave, String(valor));
          }
        }
        siguientes.delete('pagina');
        return siguientes;
      });
    },
    [filtros, setSearchParams],
  );

  const actualizarFiltro = useCallback(
    (clave, valor) => actualizarFiltros({ [clave]: valor }),
    [actualizarFiltros],
  );

  const setOrden = useCallback(
    (nuevoOrden) => {
      setSearchParams((actuales) => {
        const siguientes = new URLSearchParams(actuales);
        if (!nuevoOrden || nuevoOrden === ordenDefecto) siguientes.delete('orden');
        else siguientes.set('orden', nuevoOrden);
        siguientes.delete('pagina');
        return siguientes;
      });
    },
    [ordenDefecto, setSearchParams],
  );

  const limpiarFiltros = useCallback(() => {
    setBusqueda('');
    setSearchParams((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      siguientes.delete('buscar');
      siguientes.delete('orden');
      siguientes.delete('pagina');
      for (const clave of Object.keys(filtros)) {
        siguientes.delete(clave);
      }
      return siguientes;
    });
  }, [filtros, setBusqueda, setSearchParams]);

  const hayFiltrosActivos = useMemo(() => {
    if (conBusqueda && busquedaUrl.trim() !== '') return true;
    if (ordenDefecto && orden !== ordenDefecto) return true;
    return Object.entries(filtros).some(([clave, config]) => valores[clave] !== config.defecto);
  }, [conBusqueda, busquedaUrl, ordenDefecto, orden, filtros, valores]);

  // Objeto plano listo para pasar a los hooks/clientes de la API (y a la exportación CSV en ola 3).
  const filtrosActivos = useMemo(() => {
    const salida = { pagina, porPagina };
    if (conBusqueda && busquedaUrl.trim()) {
      salida.buscar = busquedaUrl.trim();
    }
    if (orden) {
      salida.orden = orden;
    }
    for (const [clave, config] of Object.entries(filtros)) {
      const valor = valores[clave];
      const claveApi = config.claveApi ?? clave;
      if (config.tipo === 'booleano') {
        if (valor) salida[claveApi] = config.valorApiSiTrue ?? true;
      } else if (valor !== '' && valor !== null && valor !== undefined) {
        salida[claveApi] = valor;
      }
    }
    return salida;
  }, [pagina, porPagina, conBusqueda, busquedaUrl, orden, filtros, valores]);

  return {
    valores,
    busqueda,
    setBusqueda,
    orden,
    setOrden,
    pagina,
    setPagina,
    actualizarFiltro,
    actualizarFiltros,
    limpiarFiltros,
    hayFiltrosActivos,
    filtrosActivos,
  };
}
