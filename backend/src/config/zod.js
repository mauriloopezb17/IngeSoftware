// Mensajes de validación de Zod en español para toda la API (el contrato pide mensajes en español).
// Basta con importar este módulo una vez; los esquemas pueden seguir definiendo mensajes propios.
import { z } from 'zod';

z.config(z.locales.es());

// Un campo que falta se informa como en el contrato ("Es obligatorio.") en lugar de
// "Entrada inválida: se esperaba texto, recibido indefinido". Los mensajes propios de cada
// esquema tienen prioridad sobre este.
z.config({
  customError: (issue) =>
    issue.code === 'invalid_type' && issue.input === undefined ? 'Es obligatorio.' : undefined,
});
