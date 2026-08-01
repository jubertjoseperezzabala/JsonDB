export interface IStorageEngine {
    read(key: string): Promise<string>;
    write(key: string, content: string): Promise<void>;
    exists(key: string): Promise<boolean>;
}
//# sourceMappingURL=IStorageEngine.d.ts.map