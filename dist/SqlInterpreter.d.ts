import { JsonRepository } from './JsonRepository.js';
/**
 * Intérprete de pseudo-SQL para JsonDB.
 *
 * @groupname DDL Definición de estructura
 * @groupname DML Manipulación de datos
 * @groupname Queries Consultas y joins
 * @groupname Aggregations Funciones de agregación
 *
 * @template T - Esquema de la base de datos.
 */
export declare class SqlInterpreter<T extends object> {
    private repo;
    constructor(repository: JsonRepository<T>);
    /**
     * Ejecuta un comando SQL en formato string.
     *
     * Los SELECT se cachean automáticamente.
     *
     * @group Queries
     * @param query Consulta pseudo-SQL.
     * @returns Resultado de la operación (array para SELECT, string para transacciones, `void` para otros).
     * @throws Si la sintaxis es inválida o ocurre un error de integridad.
     * @example
     * const rows = await sql.execute("SELECT * FROM users WHERE id = 1");
     */
    execute(query: string): Promise<any>;
    /**
     * Registra una foreign key en los metadatos.
     * @group DDL
     * @param query Consulta ALTER TABLE completa.
     * @private
     * @example
     * await sql.execute("ALTER TABLE courses ADD CONSTRAINT fk_teacher FOREIGN KEY(teacherId) REFERENCES users(id)");
     */
    private handleAlter;
    /**
     * Selecciona la base de datos activa.
     * @group DDL
     * @param tokens Tokens de la consulta.
     * @private
     * @example
     * await sql.execute("USE SchoolSQL");
     */
    private handleUse;
    /**
     * Resetea una base de datos (DROP DATABASE).
     * @group DDL
     * @param tokens Tokens de la consulta.
     * @private
     * @example
     * await sql.execute("DROP DATABASE SchoolSQL");
     */
    private handleDrop;
    /**
     * Eliminación de registros con soporte CASCADE.
     * @group DML
     * @param tokens Tokens de la consulta.
     * @private
     * @example
     * await sql.execute("DELETE FROM users WHERE id = 1 CASCADE");
     */
    private handleDelete;
    /**
     * Actualización de registros con JSON en SET.
     * @group DML
     * @param query Consulta original.
     * @param tokens Tokens de la consulta.
     * @private
     * @example
     * await sql.execute('UPDATE users SET {"role": "V.I.P"} WHERE id = 3');
     */
    private handleUpdate;
    /**
     * Enruta SELECT hacia agregaciones, JOIN o selección simple.
     * @group Queries
     * @private
     * @example
     * await sql.execute("SELECT * FROM users WHERE id = 1");
     */
    private handleSelect;
    /**
     * Calcula el promedio de una columna.
     * @group Aggregations
     * @private
     * @example
     * await sql.execute("SELECT AVG(price) FROM products");
     */
    private processAvg;
    /**
     * Suma los valores de una columna.
     * @group Aggregations
     * @private
     * @example
     * await sql.execute("SELECT SUM(id) FROM courses");
     */
    private processSum;
    /**
     * Cuenta registros resultantes.
     * @group Aggregations
     * @private
     * @example
     * await sql.execute("SELECT COUNT(*) FROM courses");
     */
    private processCount;
    /**
     * Evalúa condiciones complejas (`AND`, `OR`, `NOT`, paréntesis, `LIKE`).
     * @group Queries
     * @private
     * @example
     * evaluateConditions(user, "role = 'Admin' AND id > 1");
     */
    private evaluateConditions;
    private splitOutsideParentheses;
    /**
     * SELECT simple con WHERE, ORDER BY y proyección de columnas.
     * @group Queries
     * @private
     * @example
     * await sql.execute("SELECT name, role FROM users WHERE id <= 2");
     */
    private processSimpleSelect;
    /**
     * INNER JOIN entre tabla principal y una secundaria.
     * @group Queries
     * @private
     * @example
     * await sql.execute("SELECT title, teacher.name FROM courses INNER JOIN users ON teacherId AS teacher");
     */
    private processJoin;
    /**
     * CREATE DATABASE o CREATE TABLE.
     * @group DDL
     * @param tokens Tokens de la consulta.
     * @private
     * @example
     * await sql.execute("CREATE DATABASE SchoolSQL");
     * await sql.execute("CREATE TABLE users");
     */
    private handleCreate;
    /**
     * INSERT INTO con JSON embebido en VALUES.
     * @group DML
     * @param query Consulta original.
     * @private
     * @example
     * await sql.execute('INSERT INTO users VALUES {"name": "Jubert", "role": "Admin"}');
     */
    private handleInsert;
    /**
     * Aplica `ORDER BY <campo> [ASC|DESC]` a un array de resultados.
     * @group Queries
     * @private
     * @example
     * await sql.execute("SELECT * FROM users ORDER BY name DESC");
     */
    private applyOrderBy;
}
//# sourceMappingURL=SqlInterpreter.d.ts.map