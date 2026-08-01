import { JsonRepository } from './JsonRepository.js';
/**
 * Intérprete para soportar operaciones relacionales y consultas estándar mediante Pseudo-SQL.
 * @template T - El esquema de la base de datos que define las tablas disponibles.
 */
export declare class SqlInterpreter<T extends object> {
    /** * @type {JsonRepository<T>} Instancia del repositorio para acceso a datos.
     * @private
     */
    private repo;
    /**
     * @param {JsonRepository<T>} repository - Instancia del repositorio.
     */
    constructor(repository: JsonRepository<T>);
    /**
     * Ejecuta comandos SQL representados en un string y retorna los resultados.
     * @param {string} query - Consulta en formato string a procesar.
     * @returns {Promise<any>} El resultado de la operación (Array de objetos para SELECT, void para otros).
     */
    execute(query: string): Promise<any>;
    private handleAlter;
    /**
     * Selecciona la base de datos activa.
     * @param {string[]} tokens - Tokens de la consulta.
     * @private
     */
    private handleUse;
    /**
     * Procesa el borrado o reseteo de la base de datos.
     * @param {string[]} tokens - Tokens de la consulta.
     * @private
     */
    private handleDrop;
    /**
     * Procesa la eliminación de registros con soporte para cascada.
     * @param {string[]} tokens - Tokens de la consulta.
     * @private
     */
    private handleDelete;
    /**
     * Procesa la actualización de registros existentes.
     * @param {string} query - Consulta original para extraer el JSON.
     * @param {string[]} tokens - Tokens de la consulta.
     * @private
     */
    private handleUpdate;
    /**
     * Gestiona la recuperación de datos (Agregaciones, Joins o Select simple).
     * @private
     */
    private handleSelect;
    /**
     * Procesa la función de agregación AVG.
     * @private
     */
    private processAvg;
    /**
     * Procesa la función de agregación SUM.
     * @private
     */
    private processSum;
    /**
     * Procesa la función de agregación COUNT.
     * @private
     */
    private processCount;
    /**
     * Evalúa condiciones complejas incluyendo paréntesis, AND, OR y NOT.
     * @private
     */
    private evaluateConditions;
    /**
     * Divide una cadena por un conector (AND/OR) solo si está fuera de paréntesis.
     * @private
     */
    private splitOutsideParentheses;
    /**
     * permite extraer, filtrar, ordenar y proyectar los datos almacenados en una tabla específica del repositorio. Su
     * trabajo es transformar una sentencia SELECT en un conjunto de resultados filtrados y limpios.
     * @private
     */
    private processSimpleSelect;
    /**
     * Ejecuta operaciones de unión INNER JOIN.
     * @private
     */
    private processJoin;
    /**
     * Procesa la creación de base de datos o tablas.
     * @private
     */
    private handleCreate;
    /**
     * Procesa la inserción de registros extrayendo el JSON del string original.
     * @private
     */
    private handleInsert;
    /**
     * Aplica ordenamiento a los resultados.
     * @private
     */
    private applyOrderBy;
}
//# sourceMappingURL=SqlInterpreter.d.ts.map