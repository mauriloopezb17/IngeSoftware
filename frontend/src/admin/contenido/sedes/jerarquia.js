// Reglas de jerarquía de sedes para los formularios del panel (PAR-171).

export const PADRES_PERMITIDOS = Object.freeze({
  PARROQUIA: [],
  COMUNIDAD_PASIONISTA: [],
  CAPILLA: ['PARROQUIA'],
  COMUNIDAD: ['PARROQUIA', 'CAPILLA'],
});

export const AYUDA_JERARQUIA = Object.freeze({
  PARROQUIA: 'Una parroquia es una sede principal y no depende de otra.',
  CAPILLA: 'Una capilla depende de una parroquia.',
  COMUNIDAD: 'Una comunidad depende de una parroquia o una capilla.',
  COMUNIDAD_PASIONISTA:
    'La comunidad pasionista es una entidad aparte y no depende de otra sede.',
});

export function requiereSedePadre(tipoCodigo) {
  return (PADRES_PERMITIDOS[tipoCodigo]?.length ?? 0) > 0;
}

export function filtrarPadresPermitidos(sedes, tipoCodigo, excluirIds = new Set()) {
  const permitidos = PADRES_PERMITIDOS[tipoCodigo] ?? [];
  if (permitidos.length === 0) return [];
  return sedes.filter(
    (s) => !excluirIds.has(s.id) && permitidos.includes(s.tipo?.codigo),
  );
}

export function recolectarDescendientes(sedeId, sedes) {
  const excluidos = new Set([sedeId]);
  let agregado = true;
  while (agregado) {
    agregado = false;
    for (const s of sedes) {
      if (s.sedePadre?.id && excluidos.has(s.sedePadre.id) && !excluidos.has(s.id)) {
        excluidos.add(s.id);
        agregado = true;
      }
    }
  }
  return excluidos;
}
