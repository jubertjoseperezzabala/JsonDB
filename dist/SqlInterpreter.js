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
export class SqlInterpreter {
    repo;
    constructor(repository) {
        this.repo = repository;
    }
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
    async execute(query) {
        const tokens = query.trim().split(/\s+/);
        const command = tokens[0].toUpperCase();
        if (command === 'SELECT') {
            const cachedResult = this.repo.getFromCache(query);
            if (cachedResult)
                return cachedResult;
        }
        try {
            let result;
            switch (command) {
                case 'DROP':
                    result = await this.handleDrop(tokens);
                    break;
                case 'CREATE':
                    result = await this.handleCreate(tokens);
                    break;
                case 'INSERT':
                    result = await this.handleInsert(query);
                    break;
                case 'SELECT':
                    result = await this.handleSelect(query, tokens);
                    break;
                case 'UPDATE':
                    result = await this.handleUpdate(query, tokens);
                    break;
                case 'DELETE':
                    result = await this.handleDelete(tokens);
                    break;
                case 'USE':
                    result = await this.handleUse(tokens);
                    break;
                case 'ALTER':
                    result = await this.handleAlter(query);
                    break;
                case 'START':
                    if (tokens[1]?.toUpperCase() === 'TRANSACTION') {
                        this.repo.beginTransaction();
                        return "SUCCESS: Transaction started.";
                    }
                    break;
                case 'COMMIT':
                    this.repo.commit();
                    if (this.repo.clearCache)
                        this.repo.clearCache();
                    return "SUCCESS: Transaction committed.";
                case 'ROLLBACK':
                    this.repo.rollback();
                    if (this.repo.clearCache)
                        this.repo.clearCache();
                    return "SUCCESS: Transaction rolled back.";
            }
            if (command === 'SELECT' && result) {
                this.repo.addToCache(query, result);
            }
            return result;
        }
        catch (error) {
            throw new Error(`SQL Engine Error: ${error.message}`);
        }
    }
    /**
     * Registra una foreign key en los metadatos.
     * @group DDL
     * @param query Consulta ALTER TABLE completa.
     * @private
     * @example
     * await sql.execute("ALTER TABLE courses ADD CONSTRAINT fk_teacher FOREIGN KEY(teacherId) REFERENCES users(id)");
     */
    async handleAlter(query) {
        const alterRegex = /ALTER\s+TABLE\s+(\w+)\s+ADD\s+CONSTRAINT\s+\w+\s+FOREIGN\s+KEY\s*\((.*?)\)\s+REFERENCES\s+(\w+)\s*\((.*?)\)/i;
        const match = query.match(alterRegex);
        if (!match)
            throw new Error("Sintaxis ALTER TABLE inválida.");
        const [, childTable, childField, parentTable, parentField] = match;
        await this.repo.addRelation({
            childTable: childTable,
            childField: childField.trim(),
            parentTable: parentTable,
            parentField: parentField.trim(),
            action: 'CASCADE'
        });
    }
    /**
     * Selecciona la base de datos activa.
     * @group DDL
     * @param tokens Tokens de la consulta.
     * @private
     * @example
     * await sql.execute("USE SchoolSQL");
     */
    async handleUse(tokens) {
        const dbName = tokens[1];
        if (!dbName)
            throw new Error("Sintaxis USE inválida.");
        await this.repo.useDatabase(dbName);
    }
    /**
     * Resetea una base de datos (DROP DATABASE).
     * @group DDL
     * @param tokens Tokens de la consulta.
     * @private
     * @example
     * await sql.execute("DROP DATABASE SchoolSQL");
     */
    async handleDrop(tokens) {
        const target = tokens[1]?.toUpperCase();
        const dbName = tokens[2] || this.repo.getDbName();
        if (target === 'DATABASE' && dbName) {
            await this.repo.createDataBase(dbName, true);
        }
        else {
            throw new Error("Sintaxis DROP DATABASE inválida.");
        }
    }
    /**
     * Eliminación de registros con soporte CASCADE.
     * @group DML
     * @param tokens Tokens de la consulta.
     * @private
     * @example
     * await sql.execute("DELETE FROM users WHERE id = 1 CASCADE");
     */
    async handleDelete(tokens) {
        const fromIndex = tokens.findIndex(t => t.toUpperCase() === 'FROM');
        const whereIndex = tokens.findIndex(t => t.toUpperCase() === 'WHERE');
        const isCascade = tokens.some(t => t.toUpperCase() === 'CASCADE');
        if (fromIndex === -1 || whereIndex === -1)
            throw new Error("Sintaxis DELETE inválida.");
        const tableName = tokens[fromIndex + 1];
        const conditionStr = tokens.slice(whereIndex + 1).join('');
        const match = conditionStr.match(/id\s*=\s*([^ CASCADE]+)/i);
        if (!match)
            throw new Error("DELETE requiere WHERE id = [valor]");
        const idRaw = match[1].replace(/['"]/g, '').trim();
        const idValue = isNaN(Number(idRaw)) ? idRaw : Number(idRaw);
        if (isCascade) {
            await this.repo.deleteWithCascade(tableName, idValue);
        }
        else {
            await this.repo.deleteRecord(tableName, idValue);
        }
    }
    /**
     * Actualización de registros con JSON en SET.
     * @group DML
     * @param query Consulta original.
     * @param tokens Tokens de la consulta.
     * @private
     * @example
     * await sql.execute('UPDATE users SET {"role": "V.I.P"} WHERE id = 3');
     */
    async handleUpdate(query, tokens) {
        const whereIndex = tokens.findIndex(t => t.toUpperCase() === 'WHERE');
        if (whereIndex === -1)
            throw new Error("Sintaxis UPDATE requiere WHERE.");
        const tableName = tokens[1];
        const jsonMatch = query.match(/SET\s+({[\s\S]*?})\s+WHERE/i);
        if (!jsonMatch)
            throw new Error("El contenido del SET debe ser un JSON válido entre llaves {}.");
        let updateData;
        try {
            updateData = JSON.parse(jsonMatch[1].trim());
        }
        catch (e) {
            throw new Error("Error al parsear el JSON del SET.");
        }
        const conditionStr = tokens.slice(whereIndex + 1).join('');
        const idMatch = conditionStr.match(/id\s*=\s*(.+)/i);
        if (!idMatch)
            throw new Error("UPDATE requiere WHERE id = [valor]");
        const idRaw = idMatch[1].replace(/['"]/g, '').trim();
        const idValue = isNaN(Number(idRaw)) ? idRaw : Number(idRaw);
        await this.repo.update(tableName, idValue, updateData);
    }
    /**
     * Enruta SELECT hacia agregaciones, JOIN o selección simple.
     * @group Queries
     * @private
     * @example
     * await sql.execute("SELECT * FROM users WHERE id = 1");
     */
    async handleSelect(query, tokens) {
        const queryUpper = query.toUpperCase();
        if (queryUpper.includes('SUM('))
            return this.processSum(query, tokens);
        if (queryUpper.includes('COUNT('))
            return this.processCount(query, tokens);
        if (queryUpper.includes('AVG('))
            return this.processAvg(query, tokens);
        if (queryUpper.includes('JOIN'))
            return this.processJoin(query, tokens);
        return this.processSimpleSelect(query, tokens);
    }
    /**
     * Calcula el promedio de una columna.
     * @group Aggregations
     * @private
     * @example
     * await sql.execute("SELECT AVG(price) FROM products");
     */
    async processAvg(query, tokens) {
        const columnMatch = tokens[1].match(/\((.*?)\)/);
        if (!columnMatch)
            throw new Error("Sintaxis AVG() incorrecta.");
        const column = columnMatch[1].trim();
        const virtualTokens = [...tokens];
        virtualTokens[1] = '*';
        const data = query.toUpperCase().includes('JOIN')
            ? this.processJoin(query, virtualTokens)
            : this.processSimpleSelect(query, virtualTokens);
        if (data.length === 0)
            return [{ "avg": 0 }];
        const total = data.reduce((acc, reg) => {
            const val = parseFloat(column.includes('.') ? column.split('.').reduce((o, i) => o?.[i], reg) : reg[column]);
            return acc + (isNaN(val) ? 0 : val);
        }, 0);
        return [{ "avg": total / data.length }];
    }
    /**
     * Suma los valores de una columna.
     * @group Aggregations
     * @private
     * @example
     * await sql.execute("SELECT SUM(id) FROM courses");
     */
    async processSum(query, tokens) {
        const columnMatch = tokens[1].match(/\((.*?)\)/);
        if (!columnMatch)
            throw new Error("Sintaxis SUM() incorrecta.");
        const column = columnMatch[1].trim();
        const virtualTokens = [...tokens];
        virtualTokens[1] = '*';
        const data = query.toUpperCase().includes('JOIN')
            ? this.processJoin(query, virtualTokens)
            : this.processSimpleSelect(query, virtualTokens);
        const total = data.reduce((acc, reg) => {
            const val = parseFloat(column.includes('.') ? column.split('.').reduce((o, i) => o?.[i], reg) : reg[column]);
            return acc + (isNaN(val) ? 0 : val);
        }, 0);
        return [{ "sum": total }];
    }
    /**
     * Cuenta registros resultantes.
     * @group Aggregations
     * @private
     * @example
     * await sql.execute("SELECT COUNT(*) FROM courses");
     */
    async processCount(query, tokens) {
        const virtualTokens = [...tokens];
        virtualTokens[1] = '*';
        const data = query.toUpperCase().includes('JOIN')
            ? this.processJoin(query, virtualTokens)
            : this.processSimpleSelect(query, virtualTokens);
        return [{ "count": data.length }];
    }
    /**
     * Evalúa condiciones complejas (`AND`, `OR`, `NOT`, paréntesis, `LIKE`).
     * @group Queries
     * @private
     * @example
     * evaluateConditions(user, "role = 'Admin' AND id > 1");
     */
    evaluateConditions(item, conditionStr) {
        let str = conditionStr.trim();
        if (str.startsWith('(') && str.endsWith(')')) {
            let count = 0;
            let balanced = true;
            for (let i = 0; i < str.length - 1; i++) {
                if (str[i] === '(')
                    count++;
                if (str[i] === ')')
                    count--;
                if (count === 0 && i > 0) {
                    balanced = false;
                    break;
                }
            }
            if (balanced)
                return this.evaluateConditions(item, str.substring(1, str.length - 1).trim());
        }
        const orParts = this.splitOutsideParentheses(str, ' OR ');
        if (orParts.length > 1) {
            return orParts.some(part => this.evaluateConditions(item, part));
        }
        const andParts = this.splitOutsideParentheses(str, ' AND ');
        if (andParts.length > 1) {
            return andParts.every(part => this.evaluateConditions(item, part));
        }
        if (str.toUpperCase().startsWith('NOT ')) {
            return !this.evaluateConditions(item, str.substring(4).trim());
        }
        const match = str.match(/([\w.]+)\s*(>=|<=|>|<|=|LIKE)\s*(.+)/i);
        if (!match)
            return false;
        const [, field, operator, value] = match;
        const cleanValue = value.replace(/['"]/g, '').trim();
        const itemValue = field.includes('.')
            ? field.split('.').reduce((o, i) => o?.[i], item)
            : item[field];
        const compareValue = isNaN(Number(cleanValue)) ? cleanValue : Number(cleanValue);
        switch (operator.toUpperCase()) {
            case '=': return itemValue == compareValue;
            case '>': return itemValue > compareValue;
            case '<': return itemValue < compareValue;
            case '>=': return itemValue >= compareValue;
            case '<=': return itemValue <= compareValue;
            case 'LIKE': return String(itemValue).toLowerCase().includes(String(cleanValue).toLowerCase());
            default: return false;
        }
    }
    splitOutsideParentheses(str, separator) {
        const parts = [];
        let start = 0;
        let depth = 0;
        const upperStr = str.toUpperCase();
        for (let i = 0; i < str.length; i++) {
            if (str[i] === '(')
                depth++;
            else if (str[i] === ')')
                depth--;
            else if (depth === 0) {
                if (upperStr.substring(i).startsWith(separator)) {
                    parts.push(str.substring(start, i).trim());
                    start = i + separator.length;
                    i = start - 1;
                }
            }
        }
        parts.push(str.substring(start).trim());
        return parts;
    }
    /**
     * SELECT simple con WHERE, ORDER BY y proyección de columnas.
     * @group Queries
     * @private
     * @example
     * await sql.execute("SELECT name, role FROM users WHERE id <= 2");
     */
    processSimpleSelect(query, tokens) {
        const fromIndex = tokens.findIndex(t => t.toUpperCase() === 'FROM');
        if (fromIndex === -1 || !tokens[fromIndex + 1])
            throw new Error("Sintaxis SELECT inválida.");
        const tableName = tokens[fromIndex + 1];
        const fieldsPart = tokens.slice(1, fromIndex).join('').replace(/\s/g, '');
        let data = [...this.repo.findAll(tableName)];
        const whereIndex = tokens.findIndex(t => t.toUpperCase() === 'WHERE');
        const orderIndex = tokens.findIndex(t => t.toUpperCase() === 'ORDER');
        if (whereIndex !== -1) {
            const endOfWhere = orderIndex !== -1 ? orderIndex : tokens.length;
            const conditionStr = tokens.slice(whereIndex + 1, endOfWhere).join(' ');
            data = data.filter((item) => this.evaluateConditions(item, conditionStr));
        }
        data = this.applyOrderBy(data, tokens);
        if (fieldsPart === '*' || data.length === 0)
            return data;
        const selectedFields = fieldsPart.split(',');
        return data.map((record) => {
            const filtered = {};
            selectedFields.forEach(f => {
                const field = f.trim();
                if (record[field] !== undefined)
                    filtered[field] = record[field];
            });
            return filtered;
        });
    }
    /**
     * INNER JOIN entre tabla principal y una secundaria.
     * @group Queries
     * @private
     * @example
     * await sql.execute("SELECT title, teacher.name FROM courses INNER JOIN users ON teacherId AS teacher");
     */
    processJoin(query, tokens) {
        const fromIdx = tokens.findIndex(t => t.toUpperCase() === 'FROM');
        const joinIdx = tokens.findIndex(t => t.toUpperCase() === 'INNER');
        const onIdx = tokens.findIndex(t => t.toUpperCase() === 'ON');
        const asIdx = tokens.findIndex(t => t.toUpperCase() === 'AS');
        if (fromIdx === -1 || joinIdx === -1)
            throw new Error("Sintaxis JOIN incompleta.");
        const fieldsPart = tokens.slice(1, fromIdx).join('').replace(/\s/g, '');
        const mainTable = tokens[fromIdx + 1];
        const targetTable = tokens[joinIdx + 2];
        const foreignKey = tokens[onIdx + 1];
        const alias = tokens[asIdx + 1];
        let result = this.repo.innerJoin(mainTable, [
            { table: targetTable, foreignKey, as: alias }
        ]);
        result = this.applyOrderBy(result, tokens);
        if (fieldsPart !== '*' && fieldsPart !== '') {
            const selectedFields = fieldsPart.split(',');
            result = result.map(record => {
                const filtered = {};
                selectedFields.forEach(f => {
                    const field = f.trim();
                    const val = field.includes('.') ? field.split('.').reduce((o, i) => o?.[i], record) : record[field];
                    if (val !== undefined)
                        filtered[field] = val;
                });
                return filtered;
            });
        }
        return result;
    }
    /**
     * CREATE DATABASE o CREATE TABLE.
     * @group DDL
     * @param tokens Tokens de la consulta.
     * @private
     * @example
     * await sql.execute("CREATE DATABASE SchoolSQL");
     * await sql.execute("CREATE TABLE users");
     */
    async handleCreate(tokens) {
        const target = tokens[1]?.toUpperCase();
        const name = tokens[2];
        if (target === 'DATABASE') {
            await this.repo.createDataBase(name, false);
        }
        else if (target === 'TABLE') {
            await this.repo.createTable(name);
        }
    }
    /**
     * INSERT INTO con JSON embebido en VALUES.
     * @group DML
     * @param query Consulta original.
     * @private
     * @example
     * await sql.execute('INSERT INTO users VALUES {"name": "Jubert", "role": "Admin"}');
     */
    async handleInsert(query) {
        const tableMatch = query.match(/INSERT\s+INTO\s+(\w+)/i);
        const valuesMatch = query.match(/VALUES\s+({[\s\S]*?})\s*;?$/i);
        if (!tableMatch || !valuesMatch)
            throw new Error("Sintaxis INSERT inválida.");
        const tableName = tableMatch[1];
        try {
            const jsonData = JSON.parse(valuesMatch[1].trim());
            await this.repo.insert(tableName, jsonData);
        }
        catch (error) {
            throw new Error(`Error en el JSON de INSERT: ${error.message}`);
        }
    }
    /**
     * Aplica `ORDER BY <campo> [ASC|DESC]` a un array de resultados.
     * @group Queries
     * @private
     * @example
     * await sql.execute("SELECT * FROM users ORDER BY name DESC");
     */
    applyOrderBy(data, tokens) {
        const orderIdx = tokens.findIndex(t => t.toUpperCase() === 'ORDER');
        if (orderIdx === -1 || tokens[orderIdx + 1]?.toUpperCase() !== 'BY')
            return data;
        const field = tokens[orderIdx + 2];
        const direction = tokens[orderIdx + 3]?.toUpperCase() === 'DESC' ? -1 : 1;
        return [...data].sort((a, b) => {
            const valA = field.includes('.') ? field.split('.').reduce((o, i) => o?.[i], a) : a[field];
            const valB = field.includes('.') ? field.split('.').reduce((o, i) => o?.[i], b) : b[field];
            if (valA < valB)
                return -1 * direction;
            if (valA > valB)
                return 1 * direction;
            return 0;
        });
    }
}
//# sourceMappingURL=SqlInterpreter.js.map