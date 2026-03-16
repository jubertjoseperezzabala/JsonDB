/**
 * Intérprete para soportar operaciones relacionales y consultas estándar mediante Pseudo-SQL.
 * @template T - El esquema de la base de datos que define las tablas disponibles.
 */
export class SqlInterpreter {
    /** * @type {JsonRepository<T>} Instancia del repositorio para acceso a datos.
     * @private
     */
    repo;
    /**
     * @param {JsonRepository<T>} repository - Instancia del repositorio.
     */
    constructor(repository) {
        this.repo = repository;
    }
    /**
     * Ejecuta comandos SQL representados en un string y retorna los resultados.
     * @param {string} query - Consulta en formato string a procesar.
     * @returns {any} El resultado de la operación (Array de objetos para SELECT, void para otros).
     */
    execute(query) {
        const tokens = query.trim().split(/\s+/);
        const command = tokens[0].toUpperCase();
        if (command === 'SELECT') {
            const cachedResult = this.repo.getFromCache(query);
            if (cachedResult) {
                return cachedResult;
            }
        }
        try {
            let result;
            switch (command) {
                case 'DROP':
                    result = this.handleDrop(tokens);
                    break;
                case 'CREATE':
                    result = this.handleCreate(tokens);
                    break;
                case 'INSERT':
                    result = this.handleInsert(query);
                    break;
                case 'SELECT':
                    result = this.handleSelect(query, tokens);
                    break;
                case 'UPDATE':
                    result = this.handleUpdate(query, tokens);
                    break;
                case 'DELETE':
                    result = this.handleDelete(tokens);
                    break;
                case 'USE':
                    result = this.handleUse(tokens);
                    break;
                case 'ALTER':
                    result = this.handleAlter(query);
                    break;
                default:
                    throw new Error(`Comando '${command}' no soportado.`);
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
     * Procesa la alteración de tablas para añadir restricciones de llaves foráneas.
     * @param {string} query - Consulta original.
     * @private
     */
    handleAlter(query) {
        const alterRegex = /ALTER\s+TABLE\s+(\w+)\s+ADD\s+CONSTRAINT\s+\w+\s+FOREIGN\s+KEY\s*\((.*?)\)\s+REFERENCES\s+(\w+)\s*\((.*?)\)/i;
        const match = query.match(alterRegex);
        if (!match) {
            throw new Error("Sintaxis ALTER TABLE inválida. Verifique el formato de CONSTRAINT.");
        }
        const [, childTable, childField, parentTable, parentField] = match;
        this.repo.addRelation({
            childTable: childTable,
            childField: childField.trim(),
            parentTable: parentTable,
            parentField: parentField.trim(),
            action: 'CASCADE'
        });
    }
    /**
     * Selecciona la base de datos activa.
     * @param {string[]} tokens - Tokens de la consulta.
     * @private
     */
    handleUse(tokens) {
        const dbName = tokens[1];
        if (!dbName) {
            throw new Error("Sintaxis USE inválida. Especifique el nombre de la base de datos.");
        }
        this.repo.useDatabase(dbName);
    }
    /**
     * Procesa el borrado o reseteo de la base de datos.
     * @param {string[]} tokens - Tokens de la consulta.
     * @private
     */
    handleDrop(tokens) {
        const target = tokens[1]?.toUpperCase();
        const dbName = tokens[2] || this.repo.getDbName();
        if (target === 'DATABASE' && dbName) {
            this.repo.createDataBase(dbName, true);
        }
        else {
            throw new Error("Sintaxis inválida. Use: DROP DATABASE [nombre_db]");
        }
    }
    /**
     * Procesa la eliminación de registros con soporte para cascada.
     * @param {string[]} tokens - Tokens de la consulta.
     * @private
     */
    handleDelete(tokens) {
        const fromIndex = tokens.findIndex(t => t.toUpperCase() === 'FROM');
        const whereIndex = tokens.findIndex(t => t.toUpperCase() === 'WHERE');
        const isCascade = tokens.some(t => t.toUpperCase() === 'CASCADE');
        if (fromIndex === -1 || whereIndex === -1) {
            throw new Error("Sintaxis DELETE inválida.");
        }
        const tableName = tokens[fromIndex + 1];
        const conditionStr = tokens.slice(whereIndex + 1).join('');
        const match = conditionStr.match(/id\s*=\s*([^ CASCADE]+)/i);
        if (!match)
            throw new Error("DELETE requiere WHERE id = [valor]");
        const idRaw = match[1].replace(/['"]/g, '').trim();
        const idValue = isNaN(Number(idRaw)) ? idRaw : Number(idRaw);
        if (isCascade) {
            this.repo.deleteWithCascade(tableName, idValue);
        }
        else {
            this.repo.deleteRecord(tableName, idValue);
        }
    }
    /**
     * Procesa la actualización de registros existentes.
     * @param {string} query - Consulta original.
     * @param {string[]} tokens - Tokens de la consulta.
     * @private
     */
    handleUpdate(query, tokens) {
        const setIndex = tokens.findIndex(t => t.toUpperCase() === 'SET');
        const whereIndex = tokens.findIndex(t => t.toUpperCase() === 'WHERE');
        if (setIndex === -1 || whereIndex === -1) {
            throw new Error("Sintaxis UPDATE inválida.");
        }
        const tableName = tokens[1];
        const jsonPart = tokens.slice(setIndex + 1, whereIndex).join(' ');
        let updateData;
        try {
            updateData = JSON.parse(jsonPart);
        }
        catch (e) {
            throw new Error("El contenido del SET debe ser un JSON válido.");
        }
        const conditionStr = tokens.slice(whereIndex + 1).join('');
        const match = conditionStr.match(/id\s*=\s*(.+)/i);
        if (!match)
            throw new Error("UPDATE requiere WHERE id = [valor]");
        const idRaw = match[1].replace(/['"]/g, '').trim();
        const idValue = isNaN(Number(idRaw)) ? idRaw : Number(idRaw);
        this.repo.update(tableName, idValue, updateData);
    }
    /**
         * Gestiona la recuperación de datos, direccionando según el tipo de consulta.
         * @private
         */
    handleSelect(query, tokens) {
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
     * Procesa la función de agregación AVG (Promedio).
     * @param {string} query - Consulta original.
     * @param {string[]} tokens - Tokens de la consulta.
     * @private
     */
    processAvg(query, tokens) {
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
            const val = parseFloat(column.includes('.')
                ? column.split('.').reduce((o, i) => o?.[i], reg)
                : reg[column]);
            return acc + (isNaN(val) ? 0 : val);
        }, 0);
        return [{ "avg": total / data.length }];
    }
    /**
     * Procesa la función de agregación SUM.
     * @private
     */
    processSum(query, tokens) {
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
            const val = parseFloat(column.includes('.')
                ? column.split('.').reduce((o, i) => o?.[i], reg)
                : reg[column]);
            return acc + (isNaN(val) ? 0 : val);
        }, 0);
        return [{ "sum": total }];
    }
    /**
     * Procesa la función de agregación COUNT.
     * @private
     */
    processCount(query, tokens) {
        const virtualTokens = [...tokens];
        virtualTokens[1] = '*';
        const data = query.toUpperCase().includes('JOIN')
            ? this.processJoin(query, virtualTokens)
            : this.processSimpleSelect(query, virtualTokens);
        return [{ "count": data.length }];
    }
    /**
     * Procesa consultas SELECT con soporte para proyección, filtros WHERE y parseo cronológico de fechas.
     * @param {string} query - Consulta original.
     * @param {string[]} tokens - Tokens de la consulta.
     * @returns {any[]} Registros procesados.
     * @private
     */
    processSimpleSelect(query, tokens) {
        const fromIndex = tokens.findIndex(t => t.toUpperCase() === 'FROM');
        if (fromIndex === -1 || !tokens[fromIndex + 1]) {
            throw new Error("Sintaxis SELECT inválida.");
        }
        const tableName = tokens[fromIndex + 1];
        const fieldsPart = tokens.slice(1, fromIndex).join('').replace(/\s/g, '');
        let data = this.repo.findAll(tableName);
        const whereIndex = tokens.findIndex(t => t.toUpperCase() === 'WHERE');
        if (whereIndex !== -1) {
            const conditionStr = tokens.slice(whereIndex + 1).join(' ');
            const match = conditionStr.match(/(\w+)\s*(=|>|<|>=|<=|LIKE)\s*(.+)/i);
            if (match) {
                const [, field, operator, value] = match;
                const cleanValue = value.replace(/['"]/g, '').trim();
                data = data.filter((item) => {
                    let itemValue = item[field];
                    let compareValue = cleanValue;
                    const isDate = (val) => typeof val === 'string' &&
                        /^\d{4}-\d{2}-\d{2}/.test(val) &&
                        !isNaN(Date.parse(val));
                    if (isDate(itemValue) && isDate(compareValue)) {
                        itemValue = new Date(itemValue).getTime();
                        compareValue = new Date(compareValue).getTime();
                    }
                    else {
                        compareValue = isNaN(Number(cleanValue)) ? cleanValue : Number(cleanValue);
                    }
                    switch (operator.toUpperCase()) {
                        case '=': return itemValue == compareValue;
                        case '>': return itemValue > compareValue;
                        case '<': return itemValue < compareValue;
                        case '>=': return itemValue >= compareValue;
                        case '<=': return itemValue <= compareValue;
                        case 'LIKE': return String(itemValue).toLowerCase().includes(String(cleanValue).toLowerCase());
                        default: return false;
                    }
                });
            }
        }
        if (fieldsPart === '*' || data.length === 0)
            return data;
        const selectedFields = fieldsPart.split(',');
        return data.map((record) => {
            const filtered = {};
            selectedFields.forEach(field => {
                const f = field.trim();
                if (record[f] !== undefined)
                    filtered[f] = record[f];
            });
            return filtered;
        });
    }
    /**
     * Analiza y ejecuta operaciones de unión relacional (INNER JOIN) con proyección.
     * @private
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
        if (fieldsPart !== '*' && fieldsPart !== '') {
            const selectedFields = fieldsPart.split(',');
            result = result.map(record => {
                const filtered = {};
                selectedFields.forEach(field => {
                    const f = field.trim();
                    const val = f.includes('.') ? f.split('.').reduce((o, i) => o?.[i], record) : record[f];
                    if (val !== undefined)
                        filtered[f] = val;
                });
                return filtered;
            });
        }
        return result;
    }
    /**
     * Gestiona la creación de base de datos o tablas.
     * @private
     */
    handleCreate(tokens) {
        const target = tokens[1]?.toUpperCase();
        const name = tokens[2];
        if (target === 'DATABASE') {
            this.repo.createDataBase(name, false);
        }
        else if (target === 'TABLE') {
            this.repo.createTable(name);
        }
    }
    /**
         * Procesa la inserción de registros a partir de un string JSON.
         * @private
         */
    handleInsert(query) {
        const tableMatch = query.match(/INSERT\s+INTO\s+(\w+)/i);
        const valuesMatch = query.match(/VALUES\s+({[\s\S]*?})\s*;?$/i);
        if (!tableMatch || !valuesMatch) {
            throw new Error("Sintaxis INSERT inválida. Use: INSERT INTO [tabla] VALUES { ... }");
        }
        const tableName = tableMatch[1];
        const jsonStr = valuesMatch[1].trim();
        try {
            const jsonData = JSON.parse(jsonStr);
            this.repo.insert(tableName, jsonData);
        }
        catch (error) {
            throw new Error(`Error al procesar JSON en INSERT: ${error.message}`);
        }
    }
}
