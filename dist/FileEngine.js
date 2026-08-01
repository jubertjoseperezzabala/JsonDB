import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
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
export class FileEngine {
    dataDir = join(process.cwd(), 'data');
    /**
     * Lee el JSON crudo del archivo.
     * Si no existe, inicializa una BD vacía `{}` y la retorna.
     *
     * @param key Nombre de la base de datos (sin extensión).
     * @returns Contenido del archivo como string.
     */
    async read(key) {
        const filePath = join(this.dataDir, `${key}.json`);
        try {
            return await readFile(filePath, 'utf-8');
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                await this.initializeDatabase(key);
                return '{}';
            }
            throw error;
        }
    }
    async initializeDatabase(fileName) {
        try {
            await mkdir(this.dataDir, { recursive: true });
        }
        catch { }
        await this.write(fileName, '{}');
    }
    /**
     * Persiste contenido de forma atómica.
     * Escribe a `<key>.json.tmp` y renombra al archivo final.
     *
     * @param key Nombre de la base de datos.
     * @param content JSON como string.
     */
    async write(key, content) {
        const filePath = join(this.dataDir, `${key}.json`);
        const tempPath = `${filePath}.tmp`;
        try {
            await writeFile(tempPath, content, 'utf-8');
            await rename(tempPath, filePath);
        }
        catch (error) {
            try {
                await unlink(tempPath);
            }
            catch { }
            throw error;
        }
    }
    /**
     * Verifica existencia física del archivo.
     *
     * @param key Nombre de la base de datos.
     * @returns `true` si el archivo existe.
     */
    async exists(key) {
        const filePath = join(this.dataDir, `${key}.json`);
        try {
            await readFile(filePath, { flag: 'r' });
            return true;
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=FileEngine.js.map