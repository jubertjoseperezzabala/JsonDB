import { IStorageEngine } from './IStorageEngine.js';
export declare class JsonRepository<T extends object> {
    private _backup;
    private engine;
    private dbName;
    private indexes;
    private dbData;
    private queryCache;
    constructor(engine?: IStorageEngine);
    /**
     * Inicia una transacción guardando una copia profunda del estado actual.
     */
    beginTransaction(): void;
    /**
     * Revierte los cambios al estado guardado en el backup.
     */
    rollback(): string | void;
    /**
     * Confirma la transacción.
     */
    commit(): void;
    /**
     * Limpia el caché de consultas. Debe llamarse tras cualquier mutación (INSERT, UPDATE, DELETE).
     * @private
     */
    private clearCache;
    /**
     * Guarda un resultado en el caché.
     * @param {string} key - La consulta SQL.
     * @param {any} value - El resultado de la consulta.
     */
    addToCache(key: string, value: any): void;
    /**
     * Obtiene un resultado del caché.
     * @param {string} key - La consulta SQL.
     * @returns {any | null}
     */
    getFromCache(key: string): any | null;
    /**
     * Configura el nombre de la base de datos y la inicializa.
     * @param {string} name - Nombre del archivo físico.
     * @param {boolean} [force=false] - Si es true, sobrescribe el archivo con un objeto vacío.
     */
    createDataBase(name: string, force?: boolean): Promise<void>;
    /**
     * Carga los datos desde el archivo físico y los transforma en un objeto.
     * @returns {T} Los datos contenidos en el JSON con el tipo del esquema.
     * @private
     */
    private load;
    /**
     * Guarda los datos actuales en el archivo físico.
     * @param {T} data - Objeto completo de la base de datos a persistir.
     * @private
     */
    private save;
    /**
     * Regenera el índice de una tabla específica para permitir búsquedas O(1).
     * @param {keyof T} table - Nombre de la tabla a indexar.
     * @private
     */
    private refreshIndex;
    /**
     * Crea una tabla (array) en el esquema si no existe.
     * @param {keyof T} table - Nombre de la tabla a crear.
     */
    createTable(table: keyof T): Promise<void>;
    /**
     * Inserta un nuevo registro en la tabla especificada.
     * Si el ID no existe, lo genera automáticamente de forma incremental.
     * @param {keyof T} table - Tabla de destino.
     * @param {any} document - El objeto a insertar.
     */
    insert(table: keyof T, document: any): Promise<void>;
    /**
     * Actualiza un registro existente validando integridad si se modifican llaves foráneas.
     * @param {keyof T} table - Tabla de destino.
     * @param {any} id - Identificador del registro.
     * @param {Partial<any>} val - Objeto con los campos a actualizar.
     */
    update(table: keyof T, id: any, val: Partial<any>): Promise<void>;
    /**
     * Elimina un registro de la tabla según su ID.
     * @param {keyof T} table - Tabla de destino.
     * @param {any} id - Identificador del registro a eliminar.
     */
    deleteRecord(table: keyof T, id: any): Promise<void>;
    /**
     * Recupera todos los registros de una tabla específica.
     * @param {keyof T} table - Nombre de la tabla.
     * @returns {any[]} Un array con todos los documentos de la tabla.
     */
    findAll(tableName: keyof T): any[];
    /**
     * Busca un único registro por su ID utilizando el índice en memoria.
     * @param {keyof T} table - Nombre de la tabla.
     * @param {any} id - Identificador a buscar.
     * @returns {any | null} El registro encontrado o null si no existe.
     */
    find(table: keyof T, id: any): any;
    /**
     * Realiza una unión relacional entre una tabla principal y otras secundarias.
     * @param {keyof T} mainTable - La tabla base para la unión.
     * @param {Array<{ table: keyof T, foreignKey: string, as?: string }>} joins - Configuración de las uniones.
     * @returns {any[]} Array de objetos con los datos relacionados incluidos.
     */
    innerJoin(mainTable: keyof T, joins: Array<{
        table: keyof T;
        foreignKey: string;
        as?: string;
    }>): any[];
    /**
     * Borra un registro y elimina todas sus referencias en otras tablas de forma automática.
     * @param {keyof T} table - Tabla principal.
     * @param {any} id - ID del registro a eliminar.
     */
    deleteWithCascade(table: keyof T, id: any): Promise<void>;
    /**
     * Retorna el nombre de la base de datos activa.
     * @returns {string | null}
     */
    getDbName(): string | null;
    /**
     * Establece la base de datos activa para las operaciones del repositorio.
     * @param {string} dbName - Nombre del archivo de base de datos (sin extensión).
     */
    useDatabase(dbName: string): Promise<boolean>;
    /**
     * Registra una relación de llave foránea en la tabla de metadatos.
     * @param {object} relation - Detalles de la conexión entre tablas.
     */
    addRelation(relation: any): Promise<void>;
    /**
     * Retorna los datos de dbData actual.
     * @private
     */
    getTable(tableName: string): any[];
}
//# sourceMappingURL=JsonRepository.d.ts.map