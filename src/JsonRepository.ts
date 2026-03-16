import { FileEngine } from './FileEngine.js';

/**
 * Clase que gestiona la persistencia y consultas de la base de datos.
 * @template T - Estructura del esquema que define las tablas.
 */
export class JsonRepository<T extends object> {
    /** * @type {string | null} para backup de data actual. 
     * @private
     */
    private _backup: string | null = null; 
    /** * @type {FileEngine} Motor de persistencia física. 
     * @private
     */
    private engine: FileEngine;
    /** * @type {string | null} Nombre de la base de datos activa. 
     * @private
     */
    private dbName: string | null = null;
    /** * @type {Map<string, Map<any, any>>} Índices en memoria para búsquedas rápidas por ID. 
     * @private
     */
    private indexes: Map<string, Map<any, any>> = new Map();
    /** * Memoria central de la base de datos.
     * Contiene las tablas de usuario y los metadatos del sistema.
     * @private
     */
    private dbData: T & { _relations?: any[] };
    /** * @type {Map<string, any[]>} Caché de consultas SELECT para mejorar el rendimiento.
    * @private 
    */
    private queryCache: Map<string, any[]> = new Map();
    
    /**
     * Inicializa el repositorio instanciando el motor de archivos.
     */
    constructor() {
        this.engine = new FileEngine();
        this.dbData = {} as any;
    }

    /**
     * Inicia una transacción guardando una copia profunda del estado actual.
     */
    beginTransaction() {
        // Usamos JSON para asegurar que la copia no mantenga referencias al original
        this._backup = JSON.stringify(this.dbData);
    }

    /**
     * Revierte los cambios al estado guardado en el backup.
     */
    rollback() {
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
     * Confirma la transacción.
     */
    commit() {
        if (!this._backup) {
            throw new Error("No hay ninguna transacción activa.");
        }
        this._backup = null;
    }

    /**
     * Limpia el caché de consultas. Debe llamarse tras cualquier mutación (INSERT, UPDATE, DELETE).
     * @private
     */
    private clearCache(): void {
        this.queryCache.clear();
    }

    /**
     * Guarda un resultado en el caché.
     * @param {string} key - La consulta SQL.
     * @param {any} value - El resultado de la consulta.
     */
    public addToCache(key: string, value: any): void {
        this.queryCache.set(key, value);
    }

    /**
     * Obtiene un resultado del caché.
     * @param {string} key - La consulta SQL.
     * @returns {any | null}
     */
    public getFromCache(key: string): any | null {
        return this.queryCache.get(key) || null;
    }

    /**
     * Configura el nombre de la base de datos y la inicializa.
     * @param {string} name - Nombre del archivo físico.
     * @param {boolean} [force=false] - Si es true, sobrescribe el archivo con un objeto vacío.
     */
    public createDataBase(name: string, force: boolean = false): void {
        this.dbName = name;
        if (force) {
            this.save({} as T);
        } else {
            this.load();
        }
    }

    /**
     * Carga los datos desde el archivo físico y los transforma en un objeto.
     * @returns {T} Los datos contenidos en el JSON con el tipo del esquema.
     * @private
     */
    private load(): T {
        if (!this.dbName) {
            throw new Error("Base de datos no inicializada.");
        }
        const rawData: string = this.engine.read(this.dbName);
        this.dbData = JSON.parse(rawData) as any;
        return this.dbData as unknown as T;
    }

    /**
     * Guarda los datos actuales en el archivo físico.
     * @param {T} data - Objeto completo de la base de datos a persistir.
     * @private
     */
    private save(data: T): void {
        if (!this.dbName) return;
        this.engine.write(this.dbName, JSON.stringify(data, null, 2));
    }

    /**
     * Regenera el índice de una tabla específica para permitir búsquedas O(1).
     * @param {keyof T} table - Nombre de la tabla a indexar.
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
     * Crea una tabla (array) en el esquema si no existe.
     * @param {keyof T} table - Nombre de la tabla a crear.
     */
    public createTable(table: keyof T): void {
        const data: T = this.load();
        if (data[table] === undefined) {
            (data[table] as any) = [];
            this.save(data);
            this.clearCache();
        }
        this.refreshIndex(table);
    }

    /**
     * Inserta un nuevo registro en la tabla especificada.
     * Si el ID no existe, lo genera automáticamente de forma incremental.
     * @param {keyof T} table - Tabla de destino.
     * @param {any} document - El objeto a insertar.
     */
    public insert(table: keyof T, document: any): void {
        const data = this.load();
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
        this.save(data); 
        this.refreshIndex(table);
        this.clearCache();
    }

    /**
     * Actualiza un registro existente validando integridad si se modifican llaves foráneas.
     * @param {keyof T} table - Tabla de destino.
     * @param {any} id - Identificador del registro.
     * @param {Partial<any>} val - Objeto con los campos a actualizar.
     */
    public update(table: keyof T, id: any, val: Partial<any>): void {
        const data: T = this.load();
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
        this.save(data);
        this.refreshIndex(table);
        this.clearCache();
    }

    /**
     * Elimina un registro de la tabla según su ID.
     * @param {keyof T} table - Tabla de destino.
     * @param {any} id - Identificador del registro a eliminar.
     */
    public deleteRecord(table: keyof T, id: any): void {
        const data: T = this.load();
        const records: any[] = data[table] as unknown as any[];
        const idx: number = records.findIndex((r: any) => r.id === id);
        
        if (idx !== -1) {
            records.splice(idx, 1);
            this.save(data);
            this.refreshIndex(table);
            this.clearCache();
        }
    }

    /**
     * Recupera todos los registros de una tabla específica.
     * @param {keyof T} table - Nombre de la tabla.
     * @returns {any[]} Un array con todos los documentos de la tabla.
     */
    public findAll(tableName: keyof T): any[] {
        // const data: T = this.load();
        // return (data[tableName] || []) as unknown as any[];
        const table = (this.dbData as any)[tableName];
        return Array.isArray(table) ? table : [];
    }

    /**
     * Busca un único registro por su ID utilizando el índice en memoria.
     * @param {keyof T} table - Nombre de la tabla.
     * @param {any} id - Identificador a buscar.
     * @returns {any | null} El registro encontrado o null si no existe.
     */
    public find(table: keyof T, id: any): any {
        if (!this.indexes.has(String(table))) {
            this.refreshIndex(table);
        }
        return this.indexes.get(String(table))?.get(id) || null;
    }

    /**
     * Realiza una unión relacional entre una tabla principal y otras secundarias.
     * @param {keyof T} mainTable - La tabla base para la unión.
     * @param {Array<{ table: keyof T, foreignKey: string, as?: string }>} joins - Configuración de las uniones.
     * @returns {any[]} Array de objetos con los datos relacionados incluidos.
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
     * Borra un registro y elimina todas sus referencias en otras tablas de forma automática.
     * @param {keyof T} table - Tabla principal.
     * @param {any} id - ID del registro a eliminar.
     */
    public deleteWithCascade(table: keyof T, id: any): void {
        const data = this.load(); 
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
        this.save(data);
        this.refreshIndex(table);
        this.clearCache();
    }

    /**
     * Retorna el nombre de la base de datos activa.
     * @returns {string | null}
     */
    public getDbName(): string | null {
        return this.dbName;
    }
    /**
     * Establece la base de datos activa para las operaciones del repositorio.
     * @param {string} dbName - Nombre del archivo de base de datos (sin extensión).
     */
    public useDatabase(dbName: string): boolean {
        if (this.engine.exists(dbName)) {
            this.dbName = dbName;
            this.indexes.clear();
            return true;
        } 
        else { throw new Error(`La base de datos '${dbName}' no existe. Use CREATE DATABASE primero.`); }
    }
    /**
     * Registra una relación de llave foránea en la tabla de metadatos.
     * @param {object} relation - Detalles de la conexión entre tablas.
     */
    public addRelation(relation: any): void {
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
        this.save(this.dbData);
    }
    /**
     * Retorna los datos de dbData actual.
     * @private
     */
    public getTable(tableName: string): any[] {
        return (this.dbData as any)[tableName] || [];
    }
}