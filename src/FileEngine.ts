import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { IStorageEngine } from './IStorageEngine.js';

export class FileEngine implements IStorageEngine {
  private readonly dataDir: string = join(process.cwd(), 'data');

  public async read(key: string): Promise<string> {
    const filePath = join(this.dataDir, `${key}.json`);
    try {
      return await readFile(filePath, 'utf-8');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        await this.initializeDatabase(key);
        return '{}';
      }
      throw error;
    }
  }

  private async initializeDatabase(fileName: string): Promise<void> {
    try {
      await mkdir(this.dataDir, { recursive: true });
    } catch {}
    await this.write(fileName, '{}');
  }

  public async write(key: string, content: string): Promise<void> {
    const filePath = join(this.dataDir, `${key}.json`);
    const tempPath = `${filePath}.tmp`;

    try {
      await writeFile(tempPath, content, 'utf-8');
      await rename(tempPath, filePath);
    } catch (error) {
      try { await unlink(tempPath); } catch {}
      throw error;
    }
  }

  public async exists(key: string): Promise<boolean> {
    const filePath = join(this.dataDir, `${key}.json`);
    try {
      await readFile(filePath, { flag: 'r' });
      return true;
    } catch {
      return false;
    }
  }
}