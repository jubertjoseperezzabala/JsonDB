import { IStorageEngine } from './IStorageEngine.js';
/**
 * Motor de persistencia basado en archivos JSON.
 *
 * Implementa {@link IStorageEngine} usando `fs/promises`.
 * Cada base de datos se almacena como un archivo `<key>.json`
 * dentro de `/data` relativo al directorio actual.
 *
 * Garantiza escritura atómica: escribe a un `.tmp` y renombra
 * para evitar archivos corruptos por interrupciones.
 */
export declare class FileEngine implements IStorageEngine {
    private readonly dataDir;
    /**
     * Lee el JSON crudo del archivo.
     * Si no existe, inicializa una BD vacía `{}` y la retorna.
     *
     * @param key Nombre de la base de datos (sin extensión).
     * @returns Contenido del archivo como string.
     */
    read(key: string): Promise<string>;
    private initializeDatabase;
    /**
     * Persiste contenido de forma atómica.
     * Escribe a `<key>.json.tmp` y renombra al archivo final.
     *
     * @param key Nombre de la base de datos.
     * @param content JSON como string.
     */
    write(key: string, content: string): Promise<void>;
    /**
     * Verifica existencia física del archivo.
     *
     * @param key Nombre de la base de datos.
     * @returns `true` si el archivo existe.
     */
    exists(key: string): Promise<boolean>;
}
//# sourceMappingURL=FileEngine.d.ts.map