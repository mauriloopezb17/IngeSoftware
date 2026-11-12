# Contrato de la API REST

Contrato entre el backend (`backend/`), el portal público (`frontend/`) y el panel CMS (`frontend/src/admin/`) de la plataforma de la Parroquia Señor de la Exaltación.

- Es la **fuente de verdad**: el backend lo implementa y los mocks de MSW (`frontend/src/mocks/`) copian sus ejemplos.
- Un cambio en la API empieza por un cambio en este contrato, en el mismo PR o en uno previo.
- Lo mantiene la Sección A (backend). Si otra sección necesita un cambio, lo pide a la Sección A.

## Índice

| Documento                          | Contenido                                                                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [convenciones.md](convenciones.md) | Prefijo, formato JSON, fechas, envoltorio `datos`, paginación, errores, sedes y objeto imagen.                                    |
| [publico.md](publico.md)           | Endpoints públicos del portal: sede, horarios, servicios, grupos, eventos, publicaciones, proclamas, boletines, videos y páginas. |
