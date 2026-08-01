import { IStorageEngine } from './IStorageEngine.js';
import { FileEngine } from './FileEngine.js';

/**
 * Repositorio genérico para JsonDB.
 *
 * @groupname CRUD Operaciones CRUD
 * @groupname Queries Consultas y joins
 * @groupname Schema Definición de BD y tablas
 * @groupname Transactions Transacciones
 * @groupname Relations Relaciones FK
 * @groupname Cache Caché de consultas
 *
 * Gestiona la persistencia de un esquema tipificado {@link T}
 * sobre un {@link IStorageEngine}. Mantiene datos en memoria,
 * índices por ID y caché de consultas SELECT.
 *
 * @template T - Esquema de la base de datos (tablas como propiedades).
 */
export class JsonRepository<T extends object> {
    private _backup: string | null = null;
    private engine: IStorageEngine;
    private dbName: string | null = null;
    private indexes: Map<string, Map<any, any>> = new Map();
    private dbData: T & { _relations?: any[] };
    private queryCache: Map<string, any[]> = new Map();

    /**
     * @param engine Motor de persistencia. Si se omite usa {@link FileEngine}.
     */
    constructor(engine?: IStorageEngine) {
        this.engine = engine || new FileEngine();
        this.dbData = {} as any;
    }

    /**
     * Inicia una transacción guardando una copia profunda del estado actual.
     * @group Transactions
     * @example
     * repo.beginTransaction();
     * await repo.insert('users', { name: 'Test' });
     * repo.rollback();
     */
    public beginTransaction(): void {
        this._backup = JSON.stringify(this.dbData);
    }

    /**
     * Revierte los cambios al estado guardado en el backup.
     * @group Transactions
     * @returns Mensaje de estado o `undefined`.
     * @example
     * repo.rollback();
     */
    public rollback(): string | void {
        if (!this._backup) return "No hay transacción activa";
        const restoredData = JSON.parse(this._backup);
        const dataRef = this.dbData as Record<string, any>;
        Object.keys(dataRef).forEach(key => {
            delete dataRef[key];
        });
        Object.assign(dataRef, restoredData);
        this._backup = null;
    }

    /**
     * Confirma la transacción actual.
     * @group Transactions
     * @throws Si no hay transacción activa.
     * @example
     * repo.commit();
     */
    public commit(): void {
        if (!this._backup) {
            throw new Error("No hay ninguna transacción activa.");
        }
        this._backup = null;
    }

    /**
     * Limpia el caché de consultas. Debe llamarse tras cualquier mutación.
     * @private
     */
    private clearCache(): void {
        this.queryCache.clear();
    }

    /**
     * Guarda un resultado en el caché de consultas.
     * @group Cache
     * @param key Consulta SQL usada como clave.
     * @param value Resultado a cachear.
     */
    public addToCache(key: string, value: any): void {
        this.queryCache.set(key, value);
    }

    /**
     * Obtiene un resultado del caché.
     * @group Cache
     * @param key Consulta SQL.
     * @returns Resultado cacheado o `null`.
     */
    public getFromCache(key: string): any | null {
        return this.queryCache.get(key) || null;
    }

    /**
     * Configura el nombre de la base de datos y la inicializa.
     * @group Schema
     * @param name Nombre del archivo físico (sin extensión).
     * @param force Si es `true`, sobrescribe con un objeto vacío.
     */
    public async createDataBase(name: string, force: boolean = false): Promise<void> {
        this.dbName = name;
        if (force) {
            await this.save({} as T);
        } else {
            await this.load();
        }
    }

    /**
     * Carga los datos desde el archivo físico.
     * @returns Datos parseados del JSON.
     * @private
     */
    private async load(): Promise<T> {
        if (!this.dbName) {
            throw new Error("Base de datos no inicializada.");
        }
        const rawData: string = await this.engine.read(this.dbName);
        this.dbData = JSON.parse(rawData) as any;
        return this.dbData as unknown as T;
    }

    /**
     * Persiste los datos actuales en el archivo físico.
     * @param data Objeto completo de la base de datos.
     * @private
     */
    private async save(data: T): Promise<void> {
        if (!this.dbName) return;
        await this.engine.write(this.dbName, JSON.stringify(data, null, 2));
    }

    /**
     * Regenera el índice de una tabla para búsquedas O(1) por ID.
     * @param table Nombre de la tabla.
     * @private
     */
    private refreshIndex(table: keyof T): void {
        const records: any[] = this.findAll(table);
        const indexMap: Map<any, any> = new Map();

        records.forEach((record: any) => {
            if (record && record.id !== undefined) {
                indexMap.set(record.id, record);
            }
        });
        this.indexes.set(String(table), indexMap);
    }

    /**
     * Crea una tabla (array vacío) si no existe.
     * @group Schema
     * @param table Nombre de la tabla.
     */
    public async createTable(table: keyof T): Promise<void> {
        const data: T = await this.load();
        if (data[table] === undefined) {
            (data[table] as any) = [];
            await this.save(data);
            this.clearCache();
        }
        this.refreshIndex(table);
    }

    /**
     * Inserta un nuevo registro con ID autoincremental.
     * Valida integridad referencial si existen relaciones definidas.
     *
     * @group CRUD
     * @param table Tabla de destino.
     * @param document Documento a insertar.
     * @throws Si la tabla no existe o falla una FK.
     * @example
     * await repo.insert('users', { name: 'Jubert', email: 'jubert@fluxer.io' });
     */
    public async insert(table: keyof T, document: any): Promise<void> {
        const data = await this.load();
        const tableName = String(table);
        const RELATIONS_TABLE = '_relations';
        if (data[table] === undefined) { throw new Error(`SQL Engine Error: Tabla '${tableName}' no existe.`) }
        const foreignKeys = (this.dbData[RELATIONS_TABLE] || []).filter((rel: any) => rel.childTable === tableName);
        for (const rel of foreignKeys) {
            const valueToVerify = document[rel.childField];
            if (valueToVerify !== undefined && valueToVerify !== null) {
                const parentTable = rel.parentTable as keyof T;
                const parentExists = (data[parentTable] as any[]).some((p: any) => p.id === valueToVerify);
                if (!parentExists) {
                    throw new Error(
                        `Integrity Error: No se puede insertar. El ID ${valueToVerify} ` +
                        `no existe en la tabla de referencia '${rel.parentTable}'.`
                    );
                }
            }
        }
        const records: any[] = data[table] as unknown as any[];
        if (document.id === undefined) {
            const maxId = records.reduce((max: number, item: any) => 
                (item && typeof item.id === 'number') ? Math.max(max, item.id) : max, 0);
            document.id = maxId + 1;
        }
        records.push(document);
        await this.save(data); 
        this.refreshIndex(table);
        this.clearCache();
    }

    /**
     * Actualiza un registro existente.
     * Valida integridad referencial si se modifican llaves foráneas.
     *
     * @group CRUD
     * @param table Tabla de destino.
     * @param id Identificador del registro.
     * @param val Campos a actualizar.
     * @throws Si el registro no existe o falla una FK.
     * @example
     * await repo.update('users', 1, { name: 'Jubert (Admin)' });
     */
    public async update(table: keyof T, id: any, val: Partial<any>): Promise<void> {
        const data: T = await this.load();
        const tableName = String(table);
        const RELATIONS_TABLE = '_relations';
        const records: any[] = data[table] as unknown as any[];
        const idx: number = records.findIndex((r: any) => r.id === id);
        if (idx === -1) {
            throw new Error(`Update Error: Registro con ID ${id} no encontrado en '${tableName}'.`);
        }
        const foreignKeys = (this.dbData[RELATIONS_TABLE] || []).filter((rel: any) => rel.childTable === tableName);
        for (const rel of foreignKeys) {
            const newValue = val[rel.childField];
            if (newValue !== undefined && newValue !== null) {
                const parentTable = rel.parentTable as keyof T;
                const parentRecords = (data[parentTable] || []) as any[];
                const parentExists = parentRecords.some((p: any) => p.id === newValue);
                if (!parentExists) {
                    throw new Error(
                        `Integrity Error: No se puede actualizar '${tableName}'. ` +
                        `El ID ${newValue} no existe en la tabla padre '${rel.parentTable}'.`
                    );
                }
            }
        }
        records[idx] = { ...records[idx], ...val };
        await this.save(data);
        this.refreshIndex(table);
        this.clearCache();
    }

    /**
     * Elimina un registro por su ID.
     * @group CRUD
     * @param table Tabla de destino.
     * @param id Identificador del registro.
     * @example
     * await repo.deleteRecord('users', 3);
     */
    public async deleteRecord(table: keyof T, id: any): Promise<void> {
        const data = await this.load();
        const records: any[] = data[table] as unknown as any[];
        const idx: number = records.findIndex((r: any) => r.id === id);
        
        if (idx !== -1) {
            records.splice(idx, 1);
            await this.save(data);
            this.refreshIndex(table);
            this.clearCache();
        }
    }

    /**
     * Recupera todos los registros de una tabla.
     * @group Queries
     * @param tableName Nombre de la tabla.
     * @returns Array de documentos.
     * @example
     * const users = repo.findAll('users');
     */
    public findAll(tableName: keyof T): any[] {
        const table = (this.dbData as any)[tableName];
        return Array.isArray(table) ? table : [];
    }

    /**
     * Busca un registro por ID usando el índice en memoria.
     * @group Queries
     * @param table Nombre de la tabla.
     * @param id Identificador a buscar.
     * @returns Registro encontrado o `null`.
     * @example
     * const user = repo.find('users', 1);
     */
    public find(table: keyof T, id: any): any {
        if (!this.indexes.has(String(table))) {
            this.refreshIndex(table);
        }
        return this.indexes.get(String(table))?.get(id) || null;
    }

    /**
     * Une una tabla principal con secundarias usando índices en memoria.
     *
     * @param mainTable Tabla base.
     * @param joins Configuración de uniones.
     * @returns Array de objetos con datos relacionados.
     * @example
     * repo.innerJoin('orders', [
     *   { table: 'users', foreignKey: 'userId', as: 'customer' }
     * ]);
     */
    public innerJoin(
        mainTable: keyof T,
        joins: Array<{ table: keyof T, foreignKey: string, as?: string }>
    ): any[] {
        const mainData: any[] = this.findAll(mainTable);
        
        return mainData.map((record: any) => {
            const joined: any = { ...record };
            joins.forEach(j => {
                const alias: string = j.as || String(j.table);
                if (!this.indexes.has(String(j.table))) {
                    this.refreshIndex(j.table);
                }
                joined[alias] = this.indexes.get(String(j.table))?.get(record[j.foreignKey]) || null;
            });
            return joined;
        });
    }

    /**
     * Elimina un registro y limpia referencias en cascada.
     * @group CRUD
     * @param table Tabla principal.
     * @param id ID del registro a eliminar.
     * @example
     * await repo.deleteWithCascade('users', 1);
     */
    public async deleteWithCascade(table: keyof T, id: any): Promise<void> {
        const data = await this.load(); 
        const tableName = String(table);
        const RELATIONS_TABLE = '_relations';
        const relations = (this.dbData[RELATIONS_TABLE] || []).filter((rel: any) => rel.parentTable === tableName);
        relations.forEach((rel: any) => {
            const childTable = rel.childTable as keyof T;
            const childField = rel.childField;
            if (data[childTable] && Array.isArray(data[childTable])) {
                const records = data[childTable] as any[];
                (data[childTable] as any) = records.filter(child => child[childField] !== id);
                this.refreshIndex(childTable);
            }
        });
        if (data[table] && Array.isArray(data[table])) {
            const parentRecords = data[table] as any[];
            (data[table] as any) = parentRecords.filter(p => p.id !== id);
        }
        await this.save(data);
        this.refreshIndex(table);
        this.clearCache();
    }

    /**
     * Nombre de la base de datos activa.
     * @group Schema
     * @returns Nombre de la BD o `null`.
     */
    public getDbName(): string | null {
        return this.dbName;
    }

    /**
     * Cambia la base de datos activa.
     * @group Schema
     * @param dbName Nombre del archivo de BD (sin extensión).
     * @throws Si la BD no existe físicamente.
     * @example
     * await repo.useDatabase('SchoolSystem');
     */
    public async useDatabase(dbName: string): Promise<boolean> {
        if (await this.engine.exists(dbName)) {
            this.dbName = dbName;
            this.indexes.clear();
            return true;
        } 
        else { throw new Error(`La base de datos '${dbName}' no existe. Use CREATE DATABASE primero.`); }
    }

    /**
     * Registra una relación de llave foránea.
     * @group Relations
     * @param relation Detalles de la conexión entre tablas.
     * @example
     * await repo.addRelation({
     *   childTable: 'orders',
     *   childField: 'userId',
     *   parentTable: 'users',
     *   parentField: 'id',
     *   action: 'CASCADE'
     * });
     */
    public async addRelation(relation: any): Promise<void> {
        const RELATIONS_TABLE = '_relations';
        if (!this.dbData) { 
            this.dbData = {} as any; 
        }
        if (!this.dbData[RELATIONS_TABLE]) {
            this.dbData[RELATIONS_TABLE] = [];
        }
        this.dbData[RELATIONS_TABLE].push({
            ...relation,
            time: Date.now()
        });
        await this.save(this.dbData);
    }

    /**
     * Acceso directo a una tabla en memoria.
     * @param tableName Nombre de la tabla.
     * @returns Array de documentos o vacío.
     */
    public getTable(tableName: string): any[] {
        return (this.dbData as any)[tableName] || [];
    }
}
