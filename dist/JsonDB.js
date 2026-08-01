import { FileEngine } from './FileEngine.js';
import { JsonRepository } from './JsonRepository.js';
import { SqlInterpreter } from './SqlInterpreter.js';
/**
 * Fachada principal de JsonDB.
 *
 * Centraliza el acceso al motor de archivos y al repositorio genérico.
 * Provee acceso tipificado a las clases core.
 */
export const JsonDB = {
    /** Motor de persistencia física basado en archivos JSON. */
    FileEngine,
    /** Repositorio genérico para gestión de datos y CRUD. */
    JsonRepository,
    /** Intérprete de pseudo-SQL. */
    SqlInterpreter
};
//# sourceMappingURL=JsonDB.js.map