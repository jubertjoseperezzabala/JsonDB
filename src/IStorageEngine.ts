/**
 * Contrato de persistencia para motores de almacenamiento.
 *
 * Cualquier motor (archivos, SQLite, MMKV, AsyncStorage, etc.)
 * solo necesita implementar estos tres métodos para ser
 * compatible con JsonRepository.
 */
export interface IStorageEngine {
  /**
   * Lee el contenido persistido asociado a `key`.
   * @param key Identificador del recurso (normalmente el nombre de BD).
   * @returns Contenido como string (usualmente JSON crudo).
   */
  read(key: string): Promise<string>;

  /**
   * Sobrescribe el contenido persistido asociado a `key`.
   * @param key Identificador del recurso.
   * @param content Contenido a persistir.
   */
  write(key: string, content: string): Promise<void>;

  /**
   * Verifica si existe un recurso persistido.
   * @param key Identificador del recurso.
   * @returns `true` si existe.
   */
  exists(key: string): Promise<boolean>;
}
