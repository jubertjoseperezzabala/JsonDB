import { FileEngine } from './FileEngine.js';
import { JsonRepository } from './JsonRepository.js';
/**
 * Fachada principal del framework JsonDB.
 * Centraliza el acceso al motor de archivos y al repositorio genérico.
 */
export const JsonDB = {
    /** Motor de persistencia física */
    FileEngine,
    /** Repositorio para gestión de datos y CRUD */
    JsonRepository
};
