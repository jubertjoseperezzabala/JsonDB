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

// Exportamos los tipos para que el usuario tenga autocompletado total
export type { FileEngine as FileEngineType };
export type { JsonRepository as JsonRepositoryType };