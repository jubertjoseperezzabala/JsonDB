import { JsonRepository } from './JsonRepository.js';

/**
 * Intérprete para soportar operaciones relacionales y consultas estándar mediante Pseudo-SQL.
 * @template T - El esquema de la base de datos que define las tablas disponibles.
 */
export class SqlInterpreter<T extends object> {
    /** * @type {JsonRepository<T>} Instancia del repositorio para acceso a datos.
     * @private 
     */
    private repo: JsonRepository<T>;

    /**
     * @param {JsonRepository<T>} repository - Instancia del repositorio.
     */
    constructor(repository: JsonRepository<T>) {
        this.repo = repository;
    }

    /**
     * Ejecuta comandos SQL representados en un string y retorna los resultados.
     * @param {string} query - Consulta en formato string a procesar.
     * @returns {any} El resultado de la operación (Array de objetos para SELECT, void para otros).
     */
    public execute(query: string): any {
        const tokens: string[] = query.trim().split(/\s+/);
        const command: string = tokens[0].toUpperCase();
        if (command === 'SELECT') {
            const cachedResult = this.repo.getFromCache(query);
            if (cachedResult) return cachedResult;
        }
        try {
            let result: any;
            switch (command) {
                case 'DROP':    result = this.handleDrop(tokens); break;
                case 'CREATE':  result = this.handleCreate(tokens); break;
                case 'INSERT':  result = this.handleInsert(query); break;
                case 'SELECT':  result = this.handleSelect(query, tokens); break;
                case 'UPDATE':  result = this.handleUpdate(query, tokens); break;
                case 'DELETE':  result = this.handleDelete(tokens); break;
                case 'USE':     result = this.handleUse(tokens); break;
                case 'ALTER':   result = this.handleAlter(query); break;
                case 'START':   
                    if (tokens[1]?.toUpperCase() === 'TRANSACTION') {
                        this.repo.beginTransaction();
                        return "SUCCESS: Transaction started.";
                    }
                    break;
                case 'COMMIT':
                        this.repo.commit();
                        if ((this.repo as any).clearCache) (this.repo as any).clearCache();
                        return "SUCCESS: Transaction committed.";

                case 'ROLLBACK':
                    this.repo.rollback();
                    if ((this.repo as any).clearCache) (this.repo as any).clearCache(); 
                    return "SUCCESS: Transaction rolled back.";
            }
            if (command === 'SELECT' && result) {
                this.repo.addToCache(query, result);
            }
            return result;
        } 
        catch (error: any) {
                throw new Error(`SQL Engine Error: ${error.message}`);
        }
    }

    /**
     * Procesa la alteración de tablas para añadir restricciones de llaves foráneas.
     * @param {string} query - Consulta original.
     * @private
     */
    private handleAlter(query: string): void {
        const alterRegex = /ALTER\s+TABLE\s+(\w+)\s+ADD\s+CONSTRAINT\s+\w+\s+FOREIGN\s+KEY\s*\((.*?)\)\s+REFERENCES\s+(\w+)\s*\((.*?)\)/i;
        const match = query.match(alterRegex);
        if (!match) throw new Error("Sintaxis ALTER TABLE inválida.");
        const [, childTable, childField, parentTable, parentField] = match;
        this.repo.addRelation({
            childTable: childTable as keyof T,
            childField: childField.trim(),
            parentTable: parentTable as keyof T,
            parentField: parentField.trim(),
            action: 'CASCADE'
        });
    }

    /**
     * Selecciona la base de datos activa.
     * @param {string[]} tokens - Tokens de la consulta.
     * @private
     */
    private handleUse(tokens: string[]): void {
        const dbName = tokens[1];
        if (!dbName) throw new Error("Sintaxis USE inválida.");
        this.repo.useDatabase(dbName);
    }

    /**
     * Procesa el borrado o reseteo de la base de datos.
     * @param {string[]} tokens - Tokens de la consulta.
     * @private
     */
    private handleDrop(tokens: string[]): void {
        const target = tokens[1]?.toUpperCase();
        const dbName = tokens[2] || this.repo.getDbName();
        if (target === 'DATABASE' && dbName) {
            this.repo.createDataBase(dbName, true);
        } 
        else {
            throw new Error("Sintaxis DROP DATABASE inválida.");
        }
    }

    /**
     * Procesa la eliminación de registros con soporte para cascada.
     * @param {string[]} tokens - Tokens de la consulta.
     * @private
     */
    private handleDelete(tokens: string[]): void {
        const fromIndex = tokens.findIndex(t => t.toUpperCase() === 'FROM');
        const whereIndex = tokens.findIndex(t => t.toUpperCase() === 'WHERE');
        const isCascade = tokens.some(t => t.toUpperCase() === 'CASCADE');
        if (fromIndex === -1 || whereIndex === -1) throw new Error("Sintaxis DELETE inválida.");
        const tableName = tokens[fromIndex + 1];
        const conditionStr = tokens.slice(whereIndex + 1).join('');
        const match = conditionStr.match(/id\s*=\s*([^ CASCADE]+)/i);
        if (!match) throw new Error("DELETE requiere WHERE id = [valor]");
        const idRaw = match[1].replace(/['"]/g, '').trim();
        const idValue = isNaN(Number(idRaw)) ? idRaw : Number(idRaw);
        if (isCascade) {
            this.repo.deleteWithCascade(tableName as keyof T, idValue);
        } else {
            this.repo.deleteRecord(tableName as keyof T, idValue);
        }
    }

    /**
     * Procesa la actualización de registros existentes.
     * @param {string} query - Consulta original para extraer el JSON.
     * @param {string[]} tokens - Tokens de la consulta.
     * @private
     */
    private handleUpdate(query: string, tokens: string[]): void {
        const whereIndex = tokens.findIndex(t => t.toUpperCase() === 'WHERE');
        if (whereIndex === -1) throw new Error("Sintaxis UPDATE requiere WHERE.");
        const tableName = tokens[1];
        const jsonMatch = query.match(/SET\s+({[\s\S]*?})\s+WHERE/i);
        if (!jsonMatch) throw new Error("El contenido del SET debe ser un JSON válido entre llaves {}.");
        let updateData: any;
        try {
            updateData = JSON.parse(jsonMatch[1].trim());
        } catch (e) {
            throw new Error("Error al parsear el JSON del SET.");
        }
        const conditionStr = tokens.slice(whereIndex + 1).join('');
        const idMatch = conditionStr.match(/id\s*=\s*(.+)/i);
        if (!idMatch) throw new Error("UPDATE requiere WHERE id = [valor]");
        const idRaw = idMatch[1].replace(/['"]/g, '').trim();
        const idValue = isNaN(Number(idRaw)) ? idRaw : Number(idRaw);
        this.repo.update(tableName as keyof T, idValue, updateData);
    }

    /**
     * Gestiona la recuperación de datos (Agregaciones, Joins o Select simple).
     * @private
     */
    private handleSelect(query: string, tokens: string[]): any {
        const queryUpper = query.toUpperCase();
        if (queryUpper.includes('SUM(')) return this.processSum(query, tokens);
        if (queryUpper.includes('COUNT(')) return this.processCount(query, tokens);
        if (queryUpper.includes('AVG(')) return this.processAvg(query, tokens);
        if (queryUpper.includes('JOIN')) return this.processJoin(query, tokens);
        return this.processSimpleSelect(query, tokens);
    }

    /**
     * Procesa la función de agregación AVG.
     * @private
     */
    private processAvg(query: string, tokens: string[]): any[] {
        const columnMatch = tokens[1].match(/\((.*?)\)/);
        if (!columnMatch) throw new Error("Sintaxis AVG() incorrecta.");
        const column = columnMatch[1].trim();
        const virtualTokens = [...tokens];
        virtualTokens[1] = '*';
        const data = query.toUpperCase().includes('JOIN') 
            ? this.processJoin(query, virtualTokens) 
            : this.processSimpleSelect(query, virtualTokens);
        if (data.length === 0) return [{ "avg": 0 }];
        const total = data.reduce((acc, reg) => {
            const val = parseFloat(column.includes('.') ? column.split('.').reduce((o, i) => o?.[i], reg) : reg[column]);
            return acc + (isNaN(val) ? 0 : val);
        }, 0);
        return [{ "avg": total / data.length }];
    }

    /**
     * Procesa la función de agregación SUM.
     * @private
     */
    private processSum(query: string, tokens: string[]): any[] {
        const columnMatch = tokens[1].match(/\((.*?)\)/);
        if (!columnMatch) throw new Error("Sintaxis SUM() incorrecta.");
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
     * Procesa la función de agregación COUNT.
     * @private
     */
    private processCount(query: string, tokens: string[]): any[] {
        const virtualTokens = [...tokens];
        virtualTokens[1] = '*';
        const data = query.toUpperCase().includes('JOIN') 
            ? this.processJoin(query, virtualTokens) 
            : this.processSimpleSelect(query, virtualTokens);
        return [{ "count": data.length }];
    }

    /**
     * Evalúa condiciones complejas incluyendo paréntesis, AND, OR y NOT.
     * @private
     */
    private evaluateConditions(item: any, conditionStr: string): boolean {
        let str = conditionStr.trim();
        if (str.startsWith('(') && str.endsWith(')')) {
            let count = 0;
            let balanced = true;
            for (let i = 0; i < str.length - 1; i++) {
                if (str[i] === '(') count++;
                if (str[i] === ')') count--;
                if (count === 0 && i > 0) { balanced = false; break; }
            }
            if (balanced) return this.evaluateConditions(item, str.substring(1, str.length - 1).trim());
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
        if (!match) return false;
        const [, field, operator, value] = match;
        const cleanValue = value.replace(/['"]/g, '').trim();
        const itemValue = field.includes('.') 
            ? field.split('.').reduce((o, i) => o?.[i], item) 
            : item[field];
            
        const compareValue: any = isNaN(Number(cleanValue)) ? cleanValue : Number(cleanValue);
        switch (operator.toUpperCase()) {
            case '=':    return itemValue == compareValue;
            case '>':    return itemValue > compareValue;
            case '<':    return itemValue < compareValue;
            case '>=':   return itemValue >= compareValue;
            case '<=':   return itemValue <= compareValue;
            case 'LIKE': return String(itemValue).toLowerCase().includes(String(cleanValue).toLowerCase());
            default:     return false;
        }
    }

    /**
     * Divide una cadena por un conector (AND/OR) solo si está fuera de paréntesis.
     * @private
     */
    private splitOutsideParentheses(str: string, separator: string): string[] {
        const parts: string[] = [];
        let start = 0;
        let depth = 0;
        const upperStr = str.toUpperCase();
        for (let i = 0; i < str.length; i++) {
            if (str[i] === '(') depth++;
            else if (str[i] === ')') depth--;
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
     * permite extraer, filtrar, ordenar y proyectar los datos almacenados en una tabla específica del repositorio. Su 
     * trabajo es transformar una sentencia SELECT en un conjunto de resultados filtrados y limpios.
     * @private
     */
    private processSimpleSelect(query: string, tokens: string[]): any[] {
        const fromIndex = tokens.findIndex(t => t.toUpperCase() === 'FROM');
        if (fromIndex === -1 || !tokens[fromIndex + 1]) throw new Error("Sintaxis SELECT inválida.");
        const tableName = tokens[fromIndex + 1];
        const fieldsPart = tokens.slice(1, fromIndex).join('').replace(/\s/g, '');
        let data = [...this.repo.findAll(tableName as keyof T)]; 
        const whereIndex = tokens.findIndex(t => t.toUpperCase() === 'WHERE');
        const orderIndex = tokens.findIndex(t => t.toUpperCase() === 'ORDER');
        if (whereIndex !== -1) {
            const endOfWhere = orderIndex !== -1 ? orderIndex : tokens.length;
            const conditionStr = tokens.slice(whereIndex + 1, endOfWhere).join(' ');
            data = data.filter((item: any) => this.evaluateConditions(item, conditionStr));
        }
        data = this.applyOrderBy(data, tokens);
        if (fieldsPart === '*' || data.length === 0) return data;
        const selectedFields = fieldsPart.split(',');
        return data.map((record: any) => {
            const filtered: any = {};
            selectedFields.forEach(f => {
                const field = f.trim();
                if (record[field] !== undefined) filtered[field] = record[field];
            });
            return filtered;
        });
    }

    /**
     * Ejecuta operaciones de unión INNER JOIN.
     * @private
     */
    private processJoin(query: string, tokens: string[]): any[] {
        const fromIdx = tokens.findIndex(t => t.toUpperCase() === 'FROM');
        const joinIdx = tokens.findIndex(t => t.toUpperCase() === 'INNER');
        const onIdx = tokens.findIndex(t => t.toUpperCase() === 'ON');
        const asIdx = tokens.findIndex(t => t.toUpperCase() === 'AS');
        if (fromIdx === -1 || joinIdx === -1) throw new Error("Sintaxis JOIN incompleta.");
        const fieldsPart = tokens.slice(1, fromIdx).join('').replace(/\s/g, '');
        const mainTable = tokens[fromIdx + 1];
        const targetTable = tokens[joinIdx + 2];
        const foreignKey = tokens[onIdx + 1];
        const alias = tokens[asIdx + 1];
        let result = this.repo.innerJoin(mainTable as keyof T, [
            { table: targetTable as keyof T, foreignKey, as: alias }
        ]);
        result = this.applyOrderBy(result, tokens);
        if (fieldsPart !== '*' && fieldsPart !== '') {
            const selectedFields = fieldsPart.split(',');
            result = result.map(record => {
                const filtered: any = {};
                selectedFields.forEach(f => {
                    const field = f.trim();
                    const val = field.includes('.') ? field.split('.').reduce((o, i) => o?.[i], record) : record[field];
                    if (val !== undefined) filtered[field] = val;
                });
                return filtered;
            });
        }
        return result;
    }

    /**
     * Procesa la creación de base de datos o tablas.
     * @private
     */
    private handleCreate(tokens: string[]): void {
        const target = tokens[1]?.toUpperCase();
        const name = tokens[2];
        if (target === 'DATABASE') {
            this.repo.createDataBase(name, false);
        } else if (target === 'TABLE') {
            this.repo.createTable(name as keyof T);
        }
    }

    /**
     * Procesa la inserción de registros extrayendo el JSON del string original.
     * @private
     */
    private handleInsert(query: string): void {
        const tableMatch = query.match(/INSERT\s+INTO\s+(\w+)/i);
        const valuesMatch = query.match(/VALUES\s+({[\s\S]*?})\s*;?$/i);
        if (!tableMatch || !valuesMatch) throw new Error("Sintaxis INSERT inválida.");
        const tableName = tableMatch[1];
        try {
            const jsonData = JSON.parse(valuesMatch[1].trim());
            this.repo.insert(tableName as keyof T, jsonData);
        } catch (error: any) {
            throw new Error(`Error en el JSON de INSERT: ${error.message}`);
        }/**
     * Aplica ordenamiento a los resultados.
     * @private
     */
    }

    /**
     * Aplica ordenamiento a los resultados.
     * @private
     */
    private applyOrderBy(data: any[], tokens: string[]): any[] {
        const orderIdx = tokens.findIndex(t => t.toUpperCase() === 'ORDER');
        if (orderIdx === -1 || tokens[orderIdx + 1]?.toUpperCase() !== 'BY') return data;
        const field = tokens[orderIdx + 2];
        const direction = tokens[orderIdx + 3]?.toUpperCase() === 'DESC' ? -1 : 1;
        return [...data].sort((a, b) => {
            const valA = field.includes('.') ? field.split('.').reduce((o, i) => o?.[i], a) : a[field];
            const valB = field.includes('.') ? field.split('.').reduce((o, i) => o?.[i], b) : b[field];
            if (valA < valB) return -1 * direction;
            if (valA > valB) return 1 * direction;
            return 0;
        });
    }
}