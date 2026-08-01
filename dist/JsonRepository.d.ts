import { IStorageEngine } from './IStorageEngine.js';
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
export declare class JsonRepository<T extends object> {
    private _backup;
    private engine;
    private dbName;
    private indexes;
    private dbData;
    private queryCache;
    /**
     * @param engine Motor de persistencia. Si se omite usa {@link FileEngine}.
     */
    constructor(engine?: IStorageEngine);
    /**
     * Inicia una transacción guardando una copia profunda del estado actual.
     * @group Transactions
     * @example
     * repo.beginTransaction();
     * await repo.insert('users', { name: 'Test' });
     * repo.rollback();
     */
    beginTransaction(): void;
    /**
     * Revierte los cambios al estado guardado en el backup.
     * @group Transactions
     * @returns Mensaje de estado o `undefined`.
     * @example
     * repo.rollback();
     */
    rollback(): string | void;
    /**
     * Confirma la transacción actual.
     * @group Transactions
     * @throws Si no hay transacción activa.
     * @example
     * repo.commit();
     */
    commit(): void;
    /**
     * Limpia el caché de consultas. Debe llamarse tras cualquier mutación.
     * @private
     */
    private clearCache;
    /**
     * Guarda un resultado en el caché de consultas.
     * @group Cache
     * @param key Consulta SQL usada como clave.
     * @param value Resultado a cachear.
     */
    addToCache(key: string, value: any): void;
    /**
     * Obtiene un resultado del caché.
     * @group Cache
     * @param key Consulta SQL.
     * @returns Resultado cacheado o `null`.
     */
    getFromCache(key: string): any | null;
    /**
     * Configura el nombre de la base de datos y la inicializa.
     * @group Schema
     * @param name Nombre del archivo físico (sin extensión).
     * @param force Si es `true`, sobrescribe con un objeto vacío.
     */
    createDataBase(name: string, force?: boolean): Promise<void>;
    /**
     * Carga los datos desde el archivo físico.
     * @returns Datos parseados del JSON.
     * @private
     */
    private load;
    /**
     * Persiste los datos actuales en el archivo físico.
     * @param data Objeto completo de la base de datos.
     * @private
     */
    private save;
    /**
     * Regenera el índice de una tabla para búsquedas O(1) por ID.
     * @param table Nombre de la tabla.
     * @private
     */
    private refreshIndex;
    /**
     * Crea una tabla (array vacío) si no existe.
     * @group Schema
     * @param table Nombre de la tabla.
     */
    createTable(table: keyof T): Promise<void>;
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
    insert(table: keyof T, document: any): Promise<void>;
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
    update(table: keyof T, id: any, val: Partial<any>): Promise<void>;
    /**
     * Elimina un registro por su ID.
     * @group CRUD
     * @param table Tabla de destino.
     * @param id Identificador del registro.
     * @example
     * await repo.deleteRecord('users', 3);
     */
    deleteRecord(table: keyof T, id: any): Promise<void>;
    /**
     * Recupera todos los registros de una tabla.
     * @group Queries
     * @param tableName Nombre de la tabla.
     * @returns Array de documentos.
     * @example
     * const users = repo.findAll('users');
     */
    findAll(tableName: keyof T): any[];
    /**
     * Busca un registro por ID usando el índice en memoria.
     * @group Queries
     * @param table Nombre de la tabla.
     * @param id Identificador a buscar.
     * @returns Registro encontrado o `null`.
     * @example
     * const user = repo.find('users', 1);
     */
    find(table: keyof T, id: any): any;
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
    innerJoin(mainTable: keyof T, joins: Array<{
        table: keyof T;
        foreignKey: string;
        as?: string;
    }>): any[];
    /**
     * Elimina un registro y limpia referencias en cascada.
     * @group CRUD
     * @param table Tabla principal.
     * @param id ID del registro a eliminar.
     * @example
     * await repo.deleteWithCascade('users', 1);
     */
    deleteWithCascade(table: keyof T, id: any): Promise<void>;
    /**
     * Nombre de la base de datos activa.
     * @group Schema
     * @returns Nombre de la BD o `null`.
     */
    getDbName(): string | null;
    /**
     * Cambia la base de datos activa.
     * @group Schema
     * @param dbName Nombre del archivo de BD (sin extensión).
     * @throws Si la BD no existe físicamente.
     * @example
     * await repo.useDatabase('SchoolSystem');
     */
    useDatabase(dbName: string): Promise<boolean>;
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
    addRelation(relation: any): Promise<void>;
    /**
     * Acceso directo a una tabla en memoria.
     * @param tableName Nombre de la tabla.
     * @returns Array de documentos o vacío.
     */
    getTable(tableName: string): any[];
}
//# sourceMappingURL=JsonRepository.d.ts.map