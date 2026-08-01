import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
export class FileEngine {
    dataDir = join(process.cwd(), 'data');
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