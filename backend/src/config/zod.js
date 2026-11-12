// Mensajes de validación de Zod en español para toda la API (el contrato pide mensajes en español).
// Basta con importar este módulo una vez; los esquemas pueden seguir definiendo mensajes propios.
import { z } from 'zod';

z.config(z.locales.es());
