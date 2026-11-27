import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Dialogo from '../../componentes/Dialogo.jsx';
import { Aviso, Boton, CampoSelect, CampoTexto } from '../../ui/index.js';
import { extraerErroresApi } from '../componentes/errores.js';
import { CLAVE_SEDES, moverSede } from './api.js';
import {
  AYUDA_JERARQUIA,
  filtrarPadresPermitidos,
  recolectarDescendientes,
  requiereSedePadre,
} from './jerarquia.js';

export default function DialogoMoverSede({ sede, sedesExistentes, onMovida, onCerrar }) {
  const queryClient = useQueryClient();

  const tipoCodigo = sede.tipo?.codigo ?? '';
  const necesitaPadre = requiereSedePadre(tipoCodigo);
  const excluidos = recolectarDescendientes(sede.id, sedesExistentes);
  const padresDisponibles = filtrarPadresPermitidos(sedesExistentes, tipoCodigo, excluidos);

  const [sedePadreId, setSedePadreId] = useState(
    sede.sedePadre?.id ? String(sede.sedePadre.id) : '',
  );
  const [orden, setOrden] = useState(String(sede.orden ?? 0));
  const [erroresCampo, setErroresCampo] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: (cuerpo) => moverSede(sede.id, cuerpo),
    onSuccess: (actualizada) => {
      queryClient.invalidateQueries({ queryKey: CLAVE_SEDES });
      onMovida(actualizada);
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

    const ordenNumero = orden.trim() === '' ? 0 : Number(orden);
    mutate({
      sedePadreId: necesitaPadre && sedePadreId ? Number(sedePadreId) : null,
      orden: Number.isFinite(ordenNumero) ? ordenNumero : orden,
    });
  }

  return (
    <Dialogo
      titulo={`Mover «${sede.nombre}»`}
      onCerrar={isPending ? () => {} : onCerrar}
      ancho="max-w-md"
    >
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        {errorGeneral && (
          <Aviso tipo="error">
            <p>{errorGeneral}</p>
          </Aviso>
        )}

        <CampoSelect
          etiqueta="Sede superior"
          value={sedePadreId}
          onChange={(e) => setSedePadreId(e.target.value)}
          ayuda={AYUDA_JERARQUIA[tipoCodigo] ?? ''}
          error={erroresCampo.sedePadreId}
          disabled={isPending || !necesitaPadre}
        >
          <option value="">{necesitaPadre ? 'Selecciona una sede…' : 'Ninguna'}</option>
          {padresDisponibles.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </CampoSelect>

        <CampoTexto
          etiqueta="Posición entre hermanas"
          type="number"
          min={0}
          max={32767}
          value={orden}
          onChange={(e) => setOrden(e.target.value)}
          ayuda="Los números menores aparecen primero."
          error={erroresCampo.orden}
          disabled={isPending}
        />

        <div className="mt-2 flex justify-end gap-2 border-t border-sand pt-4">
          <Boton variante="secundario" onClick={onCerrar} disabled={isPending}>
            Cancelar
          </Boton>
          <Boton type="submit" variante="primario" cargando={isPending}>
            {isPending ? 'Guardando…' : 'Guardar ubicación'}
          </Boton>
        </div>
      </form>
    </Dialogo>
  );
}
