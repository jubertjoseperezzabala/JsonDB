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
export class JsonRepository {
    _backup = null;
    engine;
    dbName = null;
    indexes = new Map();
    dbData;
    queryCache = new Map();
    /**
     * @param engine Motor de persistencia. Si se omite usa {@link FileEngine}.
     */
    constructor(engine) {
        this.engine = engine || new FileEngine();
        this.dbData = {};
    }
    /**
     * Inicia una transacción guardando una copia profunda del estado actual.
     * @group Transactions
     * @example
     * repo.beginTransaction();
     * await repo.insert('users', { name: 'Test' });
     * repo.rollback();
     */
    beginTransaction() {
        this._backup = JSON.stringify(this.dbData);
    }
    /**
     * Revierte los cambios al estado guardado en el backup.
     * @group Transactions
     * @returns Mensaje de estado o `undefined`.
     * @example
     * repo.rollback();
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
     * Confirma la transacción actual.
     * @group Transactions
     * @throws Si no hay transacción activa.
     * @example
     * repo.commit();
     */
    commit() {
        if (!this._backup) {
            throw new Error("No hay ninguna transacción activa.");
        }
        this._backup = null;
    }
    /**
     * Limpia el caché de consultas. Debe llamarse tras cualquier mutación.
     * @private
     */
    clearCache() {
        this.queryCache.clear();
    }
    /**
     * Guarda un resultado en el caché de consultas.
     * @group Cache
     * @param key Consulta SQL usada como clave.
     * @param value Resultado a cachear.
     */
    addToCache(key, value) {
        this.queryCache.set(key, value);
    }
    /**
     * Obtiene un resultado del caché.
     * @group Cache
     * @param key Consulta SQL.
     * @returns Resultado cacheado o `null`.
     */
    getFromCache(key) {
        return this.queryCache.get(key) || null;
    }
    /**
     * Configura el nombre de la base de datos y la inicializa.
     * @group Schema
     * @param name Nombre del archivo físico (sin extensión).
     * @param force Si es `true`, sobrescribe con un objeto vacío.
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
     * Carga los datos desde el archivo físico.
     * @returns Datos parseados del JSON.
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
     * Persiste los datos actuales en el archivo físico.
     * @param data Objeto completo de la base de datos.
     * @private
     */
    async save(data) {
        if (!this.dbName)
            return;
        await this.engine.write(this.dbName, JSON.stringify(data, null, 2));
    }
    /**
     * Regenera el índice de una tabla para búsquedas O(1) por ID.
     * @param table Nombre de la tabla.
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
     * Crea una tabla (array vacío) si no existe.
     * @group Schema
     * @param table Nombre de la tabla.
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
     * Elimina un registro por su ID.
     * @group CRUD
     * @param table Tabla de destino.
     * @param id Identificador del registro.
     * @example
     * await repo.deleteRecord('users', 3);
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
     * Recupera todos los registros de una tabla.
     * @group Queries
     * @param tableName Nombre de la tabla.
     * @returns Array de documentos.
     * @example
     * const users = repo.findAll('users');
     */
    findAll(tableName) {
        const table = this.dbData[tableName];
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
    find(table, id) {
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
     * Elimina un registro y limpia referencias en cascada.
     * @group CRUD
     * @param table Tabla principal.
     * @param id ID del registro a eliminar.
     * @example
     * await repo.deleteWithCascade('users', 1);
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
     * Nombre de la base de datos activa.
     * @group Schema
     * @returns Nombre de la BD o `null`.
     */
    getDbName() {
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
     * Acceso directo a una tabla en memoria.
     * @param tableName Nombre de la tabla.
     * @returns Array de documentos o vacío.
     */
    getTable(tableName) {
        return this.dbData[tableName] || [];
    }
}
//# sourceMappingURL=JsonRepository.js.map