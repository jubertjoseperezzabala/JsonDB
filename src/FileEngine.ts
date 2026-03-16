import { readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
/**
 * Motor de persistencia en sistema de archivos para JsonDB.
 * Maneja operaciones de lectura/escritura de forma atómica y segura.
 */
export class FileEngine {
  
  private readonly dataDir: string = join(process.cwd(), 'data');
  
  /**
   * Lee el contenido de una base de datos.
   * Si no existe, inicializa una nueva con un objeto vacío '{}'.
   * @param fileName Nombre de la colección o archivo.
   */
  public read(fileName: string): string {
    const filePath = join(this.dataDir, `${fileName}.json`);
    try {
      return readFileSync(filePath, 'utf-8');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        this.initializeDatabase(fileName);
        return '{}';
      }
      throw error; // Si es otro error (permisos, etc), lo lanzamos.
    }
  }

  /**
   * Crea el directorio de datos y el archivo inicial.
   * @private
   */
  private initializeDatabase(fileName: string): void {
    try {
      mkdirSync(this.dataDir, { recursive: true });
    } 
    catch (e) {}
    this.write(fileName, '{}');
  }

  /**
   * Guarda información en el disco.
   * Implementa el patrón de escritura atómica mediante archivos temporales.
   * @param fileName Nombre del archivo de destino.
   * @param content String JSON a persistir.
   */
  public write(fileName: string, content: string): void {
    const filePath = join(this.dataDir, `${fileName}.json`);
    const tempPath = `${filePath}.tmp`;

    try {
      writeFileSync(tempPath, content, 'utf-8');
      renameSync(tempPath, filePath);
    } catch (error) {
      try { unlinkSync(tempPath); } catch {}
      throw error;
    }
  }

  /**
   * Comprueba si una base de datos existe físicamente.
   * @param dbName Nombre de la base de datos.
   */ 
  public exists(dbName: string): boolean {
    const filePath = join(this.dataDir, `${dbName}.json`);
    try {
      readFileSync(filePath, { flag: 'r' }); 
      return true;
    } catch {
      return false;
    }
  }
}