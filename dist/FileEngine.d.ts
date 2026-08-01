import { IStorageEngine } from './IStorageEngine.js';
export declare class FileEngine implements IStorageEngine {
    private readonly dataDir;
    read(key: string): Promise<string>;
    private initializeDatabase;
    write(key: string, content: string): Promise<void>;
    exists(key: string): Promise<boolean>;
}
//# sourceMappingURL=FileEngine.d.ts.map