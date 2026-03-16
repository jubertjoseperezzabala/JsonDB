import { readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
export class FileEngine {
    dataDir = join(process.cwd(), 'data');
    read(fileName) {
        const filePath = join(this.dataDir, `${fileName}.json`);
        try {
            return readFileSync(filePath, 'utf-8');
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                this.initializeDatabase(fileName);
                return '{}';
            }
            throw error;
        }
    }
    initializeDatabase(fileName) {
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
    exists(dbName) {
        const filePath = join(this.dataDir, `${dbName}.json`);
        try {
            readFileSync(filePath, { flag: 'r' });
            return true;
        }
        catch {
            return false;
        }
    }
}
