import { FileEngine } from './FileEngine.js';
export class JsonRepository {
    _backup = null;
    engine;
    dbName = null;
    indexes = new Map();
    dbData;
    queryCache = new Map();
    constructor(engine) {
        this.engine = engine || new FileEngine();
        this.dbData = {};
    }
    /**
     * Inicia una transacción guardando una copia profunda del estado actual.
     */
    beginTransaction() {
        this._backup = JSON.stringify(this.dbData);
    }
    /**
     * Revierte los cambios al estado guardado en el backup.
     */
    rollback() {
        if (!this._backup)
            return "No hay transacción activa";
        const restoredData = JSON.parse(this._backup);
        const dataRef = this.dbData;
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
    clearCache() {
        this.queryCache.clear();
    }
    /**
     * Guarda un resultado en el caché.
     * @param {string} key - La consulta SQL.
     * @param {any} value - El resultado de la consulta.
     */
    addToCache(key, value) {
        this.queryCache.set(key, value);
    }
    /**
     * Obtiene un resultado del caché.
     * @param {string} key - La consulta SQL.
     * @returns {any | null}
     */
    getFromCache(key) {
        return this.queryCache.get(key) || null;
    }
    /**
     * Configura el nombre de la base de datos y la inicializa.
     * @param {string} name - Nombre del archivo físico.
     * @param {boolean} [force=false] - Si es true, sobrescribe el archivo con un objeto vacío.
     */
    async createDataBase(name, force = false) {
        this.dbName = name;
        if (force) {
            await this.save({});
        }
        else {
            await this.load();
        }
    }
    /**
     * Carga los datos desde el archivo físico y los transforma en un objeto.
     * @returns {T} Los datos contenidos en el JSON con el tipo del esquema.
     * @private
     */
    async load() {
        if (!this.dbName) {
            throw new Error("Base de datos no inicializada.");
        }
        const rawData = await this.engine.read(this.dbName);
        this.dbData = JSON.parse(rawData);
        return this.dbData;
    }
    /**
     * Guarda los datos actuales en el archivo físico.
     * @param {T} data - Objeto completo de la base de datos a persistir.
     * @private
     */
    async save(data) {
        if (!this.dbName)
            return;
        await this.engine.write(this.dbName, JSON.stringify(data, null, 2));
    }
    /**
     * Regenera el índice de una tabla específica para permitir búsquedas O(1).
     * @param {keyof T} table - Nombre de la tabla a indexar.
     * @private
     */
    refreshIndex(table) {
        const records = this.findAll(table);
        const indexMap = new Map();
        records.forEach((record) => {
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
    async createTable(table) {
        const data = await this.load();
        if (data[table] === undefined) {
            data[table] = [];
            await this.save(data);
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
    async insert(table, document) {
        const data = await this.load();
        const tableName = String(table);
        const RELATIONS_TABLE = '_relations';
        if (data[table] === undefined) {
            throw new Error(`SQL Engine Error: Tabla '${tableName}' no existe.`);
        }
        const foreignKeys = (this.dbData[RELATIONS_TABLE] || []).filter((rel) => rel.childTable === tableName);
        for (const rel of foreignKeys) {
            const valueToVerify = document[rel.childField];
            if (valueToVerify !== undefined && valueToVerify !== null) {
                const parentTable = rel.parentTable;
                const parentExists = data[parentTable].some((p) => p.id === valueToVerify);
                if (!parentExists) {
                    throw new Error(`Integrity Error: No se puede insertar. El ID ${valueToVerify} ` +
                        `no existe en la tabla de referencia '${rel.parentTable}'.`);
                }
            }
        }
        const records = data[table];
        if (document.id === undefined) {
            const maxId = records.reduce((max, item) => (item && typeof item.id === 'number') ? Math.max(max, item.id) : max, 0);
            document.id = maxId + 1;
        }
        records.push(document);
        await this.save(data);
        this.refreshIndex(table);
        this.clearCache();
    }
    /**
     * Actualiza un registro existente validando integridad si se modifican llaves foráneas.
     * @param {keyof T} table - Tabla de destino.
     * @param {any} id - Identificador del registro.
     * @param {Partial<any>} val - Objeto con los campos a actualizar.
     */
    async update(table, id, val) {
        const data = await this.load();
        const tableName = String(table);
        const RELATIONS_TABLE = '_relations';
        const records = data[table];
        const idx = records.findIndex((r) => r.id === id);
        if (idx === -1) {
            throw new Error(`Update Error: Registro con ID ${id} no encontrado en '${tableName}'.`);
        }
        const foreignKeys = (this.dbData[RELATIONS_TABLE] || []).filter((rel) => rel.childTable === tableName);
        for (const rel of foreignKeys) {
            const newValue = val[rel.childField];
            if (newValue !== undefined && newValue !== null) {
                const parentTable = rel.parentTable;
                const parentRecords = (data[parentTable] || []);
                const parentExists = parentRecords.some((p) => p.id === newValue);
                if (!parentExists) {
                    throw new Error(`Integrity Error: No se puede actualizar '${tableName}'. ` +
                        `El ID ${newValue} no existe en la tabla padre '${rel.parentTable}'.`);
                }
            }
        }
        records[idx] = { ...records[idx], ...val };
        await this.save(data);
        this.refreshIndex(table);
        this.clearCache();
    }
    /**
     * Elimina un registro de la tabla según su ID.
     * @param {keyof T} table - Tabla de destino.
     * @param {any} id - Identificador del registro a eliminar.
     */
    async deleteRecord(table, id) {
        const data = await this.load();
        const records = data[table];
        const idx = records.findIndex((r) => r.id === id);
        if (idx !== -1) {
            records.splice(idx, 1);
            await this.save(data);
            this.refreshIndex(table);
            this.clearCache();
        }
    }
    /**
     * Recupera todos los registros de una tabla específica.
     * @param {keyof T} table - Nombre de la tabla.
     * @returns {any[]} Un array con todos los documentos de la tabla.
     */
    findAll(tableName) {
        // const data: T = this.load();
        // return (data[tableName] || []) as unknown as any[];
        const table = this.dbData[tableName];
        return Array.isArray(table) ? table : [];
    }
    /**
     * Busca un único registro por su ID utilizando el índice en memoria.
     * @param {keyof T} table - Nombre de la tabla.
     * @param {any} id - Identificador a buscar.
     * @returns {any | null} El registro encontrado o null si no existe.
     */
    find(table, id) {
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
    innerJoin(mainTable, joins) {
        const mainData = this.findAll(mainTable);
        return mainData.map((record) => {
            const joined = { ...record };
            joins.forEach(j => {
                const alias = j.as || String(j.table);
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
    async deleteWithCascade(table, id) {
        const data = await this.load();
        const tableName = String(table);
        const RELATIONS_TABLE = '_relations';
        const relations = (this.dbData[RELATIONS_TABLE] || []).filter((rel) => rel.parentTable === tableName);
        relations.forEach((rel) => {
            const childTable = rel.childTable;
            const childField = rel.childField;
            if (data[childTable] && Array.isArray(data[childTable])) {
                const records = data[childTable];
                data[childTable] = records.filter(child => child[childField] !== id);
                this.refreshIndex(childTable);
            }
        });
        if (data[table] && Array.isArray(data[table])) {
            const parentRecords = data[table];
            data[table] = parentRecords.filter(p => p.id !== id);
        }
        await this.save(data);
        this.refreshIndex(table);
        this.clearCache();
    }
    /**
     * Retorna el nombre de la base de datos activa.
     * @returns {string | null}
     */
    getDbName() {
        return this.dbName;
    }
    /**
     * Establece la base de datos activa para las operaciones del repositorio.
     * @param {string} dbName - Nombre del archivo de base de datos (sin extensión).
     */
    async useDatabase(dbName) {
        if (await this.engine.exists(dbName)) {
            this.dbName = dbName;
            this.indexes.clear();
            return true;
        }
        else {
            throw new Error(`La base de datos '${dbName}' no existe. Use CREATE DATABASE primero.`);
        }
    }
    /**
     * Registra una relación de llave foránea en la tabla de metadatos.
     * @param {object} relation - Detalles de la conexión entre tablas.
     */
    async addRelation(relation) {
        const RELATIONS_TABLE = '_relations';
        if (!this.dbData) {
            this.dbData = {};
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
     * Retorna los datos de dbData actual.
     * @private
     */
    getTable(tableName) {
        return this.dbData[tableName] || [];
    }
}
//# sourceMappingURL=JsonRepository.js.map