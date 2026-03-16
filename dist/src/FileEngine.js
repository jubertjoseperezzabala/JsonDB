// import * as fs from 'fs';
// import * as path from 'path';
// /**
//  * Motor de bajo nivel para la manipulación de archivos físicos.
//  * Se encarga exclusivamente de la persistencia de strings en el disco.
//  */
// export class FileEngine {
//   /**
//    * Lee el contenido de un archivo JSON.
//    * @param {string} fileName - Nombre del archivo (sin extensión).
//    * @returns {string} El contenido del archivo en formato string o un objeto vacío serializado.
//    */
//   public read(fileName: string): string {
//     const filePath: string = path.join(process.cwd(), 'data', `${fileName}.json`);    
//     if (!fs.existsSync(filePath)) {
//       const dirPath: string = path.dirname(filePath);
//       if (!fs.existsSync(dirPath)) {
//         fs.mkdirSync(dirPath, { recursive: true });
//       }
//       fs.writeFileSync(filePath, '{}', 'utf-8');
//       return '{}';
//     }    
//     return fs.readFileSync(filePath, 'utf-8');
//   }
//   /**
//    * Escribe datos en el archivo físico.
//    * @param {string} fileName - Nombre del archivo.
//    * @param {string} content - Contenido ya serializado en JSON string.
//    */
//   public write(fileName: string, content: string): void {
//     const filePath: string = path.join(process.cwd(), 'data', `${fileName}.json`);
//     fs.writeFileSync(filePath, content, 'utf-8');
//   }
//   /**
//    * Verifica si el archivo de la base de datos existe en el disco.
//    * @param {string} dbName - Nombre de la base de datos.
//    * @returns {boolean}
//    */
//   public exists(dbName: string): boolean {
//       const filePath = path.join(process.cwd(), 'data', `${dbName}.json`);
//       return fs.existsSync(filePath);
//   }
// }
import { readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
export class FileEngine {
    dataDir = join(process.cwd(), 'data');
    read(fileName) {
        const filePath = join(this.dataDir, `${fileName}.json`);
        try {
            // Intentamos leer directamente. Si el archivo existe, no hay warning.
            return readFileSync(filePath, 'utf-8');
        }
        catch (error) {
            // Si el error es 'ENOENT' significa que el archivo no existe.
            if (error.code === 'ENOENT') {
                this.initializeDatabase(fileName);
                return '{}';
            }
            throw error; // Si es otro error (permisos, etc), lo lanzamos.
        }
    }
    initializeDatabase(fileName) {
        // Solo creamos el directorio si es estrictamente necesario
        try {
            mkdirSync(this.dataDir, { recursive: true });
        }
        catch (e) { }
        this.write(fileName, '{}');
    }
    write(fileName, content) {
        const filePath = join(this.dataDir, `${fileName}.json`);
        const tempPath = `${filePath}.tmp`;
        try {
            // writeFileSync es seguro en v24, el problema suele ser la verificación previa
            writeFileSync(tempPath, content, 'utf-8');
            renameSync(tempPath, filePath);
        }
        catch (error) {
            try {
                unlinkSync(tempPath);
            }
            catch { }
            throw error;
        }
    }
    // Eliminamos el método .exists() o lo refactorizamos para no usar fs.Stats
    exists(dbName) {
        const filePath = join(this.dataDir, `${dbName}.json`);
        try {
            // Usar readFileSync de forma mínima es más seguro contra el warning que existsSync
            readFileSync(filePath, { flag: 'r' });
            return true;
        }
        catch {
            return false;
        }
    }
}
