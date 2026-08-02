const fs = require('fs');
const path = require('path');

const outDir = path.join(process.cwd(), 'docs');
const filePath = path.join(outDir, 'manual.html');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Manual de Programación - JsonDB Fluxer</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #ffffff;
      color: #1a1a1a;
      line-height: 1.6;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 0.5rem; margin: 2rem 0 1rem; }
    h2 { color: #1e40af; margin-top: 2rem; margin-bottom: 1rem; }
    h3 { color: #3b82f6; margin-top: 1.5rem; margin-bottom: 0.5rem; }
    h4 { color: #4b5563; margin-top: 1rem; margin-bottom: 0.5rem; }
    p { margin-bottom: 1rem; color: #374151; }
    code {
      background: #f3f4f6;
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      color: #dc2626;
    }
    pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 1rem;
      border-radius: 6px;
      overflow-x: auto;
      margin: 1rem 0;
    }
    pre code {
      background: none;
      padding: 0;
      color: #e2e8f0;
    }
    .example {
      background: #f8fafc;
      border-left: 4px solid #2563eb;
      padding: 1rem;
      margin: 1rem 0;
      border-radius: 4px;
    }
    .note {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 1rem;
      margin: 1rem 0;
      border-radius: 4px;
    }
    ul { margin: 1rem 0 1rem 2rem; }
    li { margin-bottom: 0.5rem; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th { background: #2563eb; color: white; padding: 0.75rem; text-align: left; }
    td { padding: 0.75rem; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) { background: #f9fafb; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Manual de Programación - JsonDB Fluxer</h1>

    <h2>1. Introducción</h2>
    <p>JsonDB Fluxer es una librería para manejo de archivos JSON con sintaxis SQL-like, incluyendo caché en memoria para optimizar consultas.</p>
    <p>Se pueden ejecutar operaciones de dos formas:</p>
    <ul>
      <li><strong>Métodos directos</strong>: <code>sql.insert(...)</code>, <code>sql.select(...)</code>, etc.</li>
      <li><strong>Pseudo-SQL</strong>: <code>await sql.execute('SELECT ...')</code></li>
    </ul>

    <h2>2. Instalación</h2>
    <pre><code>npm install jsondb-fluxer
# o
pnpm add jsondb-fluxer</code></pre>

    <h2>3. Configuración Básica</h2>
    <p>Ambos esquemas comparten la misma inicialización.</p>
    <div class="example">
      <pre><code>import { JsonRepository, SqlInterpreter } from 'jsondb-fluxer';

const repo = new JsonRepository('./data/database.json');
const sql = new SqlInterpreter(repo);</code></pre>
    </div>

    <h2>4. Operaciones DDL (Definición de Datos)</h2>

    <h3>4.1 Crear Base de Datos</h3>
    <div class="example">
      <pre><code>// Esquema 1: Método directo
await repo.createDataBase('miBaseDatos');

// Esquema 2: Pseudo-SQL
await sql.execute('CREATE DATABASE miBaseDatos');</code></pre>
    </div>

    <h3>4.2 Crear Tabla</h3>
    <div class="example">
      <pre><code>// Esquema 1: Método directo
await repo.createTable('usuarios');

// Esquema 2: Pseudo-SQL
await sql.execute('CREATE TABLE usuarios');</code></pre>
    </div>

    <h3>4.3 Eliminar Base de Datos</h3>
    <div class="example">
      <pre><code>// Esquema 1: Método directo (force=true para eliminar)
await repo.createDataBase('miBaseDatos', true);

// Esquema 2: Pseudo-SQL
await sql.execute('DROP DATABASE');
await sql.execute('DROP DATABASE miBaseDatos');</code></pre>
    </div>

    <h3>4.4 Cambiar de Base de Datos</h3>
    <div class="example">
      <pre><code>// Esquema 1: Método directo
await repo.useDatabase('otraBaseDatos');

// Esquema 2: Pseudo-SQL
await sql.execute('USE otraBaseDatos');</code></pre>
    </div>

    <h3>4.5 Agregar Relación (Foreign Key)</h3>
    <div class="example">
      <pre><code>// Esquema 1: Método directo
await repo.addRelation({
  childTable: 'cursos',
  childField: 'profesorId',
  parentTable: 'usuarios',
  parentField: 'id',
  action: 'CASCADE'
});

// Esquema 2: Pseudo-SQL
await sql.execute(
  'ALTER TABLE cursos ADD CONSTRAINT fk_profesorId FOREIGN KEY(profesorId) REFERENCES usuarios(id) ON DELETE CASCADE'
);</code></pre>
    </div>

    <h2>5. Operaciones DML (Manipulación de Datos)</h2>

    <h3>5.1 INSERT - Insertar Registros</h3>
    <div class="example">
      <pre><code>// Esquema 1: Método directo
await repo.insert('usuarios', { nombre: 'Juan Pérez', email: 'juan@example.com', edad: 30 });
await repo.insert('usuarios', { nombre: 'Ana García', email: 'ana@example.com', edad: 25 });

// Esquema 2: Pseudo-SQL
await sql.execute('INSERT INTO usuarios VALUES {"nombre": "Juan Pérez", "email": "juan@example.com", "edad": 30}');
await sql.execute('INSERT INTO usuarios VALUES {"nombre": "Ana García", "email": "ana@example.com", "edad": 25}');</code></pre>
    </div>

    <h3>5.2 SELECT - Consultar Datos</h3>
    <div class="example">
      <pre><code>// Esquema 1: Método directo
const todos = repo.findAll('usuarios');
const filtrados = repo.findAll('usuarios', { where: { edad: { gt: 25 } } });
const parcial = repo.findAll('usuarios', { columns: ['nombre', 'email'] });

// Esquema 2: Pseudo-SQL
const todos = await sql.execute('SELECT * FROM usuarios');
const filtrados = await sql.execute('SELECT * FROM usuarios WHERE edad > 25');
const parcial = await sql.execute('SELECT nombre, email FROM usuarios');</code></pre>
    </div>

    <h3>5.3 SELECT - Condiciones WHERE</h3>
    <div class="example">
      <pre><code>// Esquema 1: Método directo (objeto where)
const whereObj = {
  AND: [
    { edad: { gte: 18 } },
    { rol: 'Admin' }
  ]
};
const filtrados = repo.findAll('usuarios', { where: whereObj });

// Esquema 2: Pseudo-SQL
const filtrados = await sql.execute("SELECT * FROM usuarios WHERE edad >= 18 AND rol = 'Admin'");</code></pre>
    </div>

    <h3>5.4 SELECT - Ordenamiento</h3>
    <div class="example">
      <pre><code>// Esquema 1: Método directo
const ordenados = repo.findAll('usuarios', { orderBy: 'nombre', orderDir: 'DESC' });

// Esquema 2: Pseudo-SQL
const ordenados = await sql.execute('SELECT * FROM usuarios ORDER BY nombre DESC');</code></pre>
    </div>

    <h3>5.5 UPDATE - Actualizar Registros</h3>
    <div class="example">
      <pre><code>// Esquema 1: Método directo
await repo.update('usuarios', 3, { rol: 'V.I.P' });
await repo.update('usuarios', 1, { edad: 31, email: 'nuevo@example.com' });

// Esquema 2: Pseudo-SQL
await sql.execute("UPDATE usuarios SET {\\"rol\\": \\"V.I.P\\"} WHERE id = 3");
await sql.execute('UPDATE usuarios SET {"edad": 31, "email": "nuevo@example.com"} WHERE id = 1');</code></pre>
    </div>

    <h3>5.6 DELETE - Eliminar Registros</h3>
    <div class="example">
      <pre><code>// Esquema 1: Método directo
await repo.deleteRecord('usuarios', 1);
await repo.deleteWithCascade('usuarios', 1);

// Esquema 2: Pseudo-SQL
await sql.execute('DELETE FROM usuarios WHERE id = 1');
await sql.execute('DELETE FROM usuarios WHERE id = 1 CASCADE');</code></pre>
    </div>

    <h2>6. Consultas Avanzadas</h2>

    <h3>6.1 Joins (INNER JOIN)</h3>
    <div class="example">
      <pre><code>// Esquema 1: Método directo
const resultado = repo.innerJoin('cursos', [
  { table: 'usuarios', foreignKey: 'profesorId', as: 'profesor' }
]);

// Esquema 2: Pseudo-SQL
const resultado = await sql.execute(
  'SELECT title, teacher.name FROM courses INNER JOIN users ON teacherId AS teacher'
);</code></pre>
    </div>

    <h3>6.2 Múltiples Joins</h3>
    <div class="example">
      <pre><code>// Esquema 1: Método directo
const multi = repo.innerJoin('cursos', [
  { table: 'usuarios', foreignKey: 'profesorId', as: 'teacher' },
  { table: 'escuela', foreignKey: 'institucionId', as: 'inst' }
]);

// Esquema 2: Pseudo-SQL
const multi = await sql.execute(
  "SELECT title, teacher.name, inst.name FROM courses INNER JOIN users ON teacherId AS teacher INNER JOIN school ON institutionId AS inst WHERE teacher.role = 'Guest' AND inst.id = 1"
);</code></pre>
    </div>

    <h3>6.3 Agregaciones</h3>
    <div class="example">
      <pre><code>// Esquema 1: Método directo + lógica manual
const todos = repo.findAll('cursos');
const total = [{ count: todos.length }];
const suma = todos.reduce((acc, r) => acc + (r.precio || 0), 0);

// Esquema 2: Pseudo-SQL
const total = await sql.execute('SELECT COUNT(*) FROM cursos');
const suma = await sql.execute('SELECT SUM(precio) FROM productos');
const promedio = await sql.execute('SELECT AVG(edad) FROM usuarios');</code></pre>
    </div>

    <h2>7. Transacciones</h2>
    <div class="example">
      <pre><code>// Esquema 1: Método directo
repo.beginTransaction();
await repo.insert('usuarios', { nombre: 'Nuevo', email: 'nuevo@test.com' });
await repo.insert('logs', { accion: 'crear_usuario', fecha: '2024-01-01' });
repo.commit();
// o repo.rollback();

// Esquema 2: Pseudo-SQL
await sql.execute('START TRANSACTION');
await sql.execute('INSERT INTO usuarios VALUES {"nombre": "Nuevo", "email": "nuevo@test.com"}');
await sql.execute('INSERT INTO logs VALUES {"accion": "crear_usuario", "fecha": "2024-01-01"}');
await sql.execute('COMMIT');
// o await sql.execute('ROLLBACK');</code></pre>
    </div>

    <h2>8. Caché</h2>
    <div class="note">
      <p><strong>Nota:</strong> El caché almacena consultas SELECT frecuentes en memoria. Se limpia automáticamente al ejecutar INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, COMMIT o ROLLBACK.</p>
    </div>
    <div class="example">
      <pre><code>// Limpiar caché manualmente
repo.clearCache();

// Configurar TTL del caché (en ms)
repo.setCacheTTL(300000); // 5 minutos</code></pre>
    </div>

    <h2>9. Operadores WHERE</h2>
    <table>
      <tr><th>Operador</th><th>Significado</th><th>Método directo</th><th>Pseudo-SQL</th></tr>
      <tr><td>=</td><td>Igualdad</td><td><code>{ campo: valor }</code></td><td><code>campo = valor</code></td></tr>
      <tr><td>&gt;</td><td>Mayor que</td><td><code>{ campo: { gt: valor } }</code></td><td><code>campo > valor</code></td></tr>
      <tr><td>&lt;</td><td>Menor que</td><td><code>{ campo: { lt: valor } }</code></td><td><code>campo < valor</code></td></tr>
      <tr><td>&gt;=</td><td>Mayor o igual</td><td><code>{ campo: { gte: valor } }</code></td><td><code>campo >= valor</code></td></tr>
      <tr><td>&lt;=</td><td>Menor o igual</td><td><code>{ campo: { lte: valor } }</code></td><td><code>campo <= valor</code></td></tr>
      <tr><td>LIKE</td><td>Coincidencia parcial</td><td><code>{ campo: { contains: valor } }</code></td><td><code>campo LIKE valor</code></td></tr>
    </table>

    <h2>10. Ejemplo Completo</h2>
    <div class="example">
      <pre><code>import { JsonRepository, SqlInterpreter } from 'jsondb-fluxer';

const repo = new JsonRepository('./data/app.json');
const sql = new SqlInterpreter(repo);

// Configurar base de datos - Esquema 1 (métodos directos)
await repo.createDataBase('app');
await repo.createTable('usuarios');
await repo.createTable('productos');

// Insertar datos - Esquema 1
await repo.insert('usuarios', { nombre: 'María González', email: 'maria@example.com', rol: 'Admin' });
await repo.insert('productos', { nombre: 'Laptop', precio: 1200, stock: 5 });

// Configurar base de datos - Esquema 2 (pseudo-SQL)
await sql.execute('CREATE DATABASE app');
await sql.execute('CREATE TABLE usuarios');
await sql.execute('CREATE TABLE productos');

// Insertar datos - Esquema 2
await sql.execute('INSERT INTO usuarios VALUES {"nombre": "María González", "email": "maria@example.com", "rol": "Admin"}');
await sql.execute('INSERT INTO productos VALUES {"nombre": "Laptop", "precio": 1200, "stock": 5}');

// Consultas - Esquema 1
const admins = repo.findAll('usuarios', { where: { rol: 'Admin' } });
const caros = repo.findAll('productos', { where: { precio: { gt: 1000 } }, orderBy: 'precio', orderDir: 'DESC' });

// Consultas - Esquema 2
const admins = await sql.execute("SELECT * FROM usuarios WHERE rol = 'Admin'");
const caros = await sql.execute('SELECT * FROM productos WHERE precio > 1000 ORDER BY precio DESC');
const totalProductos = await sql.execute('SELECT COUNT(*) FROM productos');

// Join - Esquema 1
await repo.addRelation({
  childTable: 'productos',
  childField: 'vendedorId',
  parentTable: 'usuarios',
  parentField: 'id',
  action: 'CASCADE'
});
const conVendedor = repo.innerJoin('productos', [
  { table: 'usuarios', foreignKey: 'vendedorId', as: 'u' }
]);

// Join - Esquema 2
await sql.execute('ALTER TABLE productos ADD CONSTRAINT fk_vendedorId FOREIGN KEY(vendedorId) REFERENCES usuarios(id) ON DELETE CASCADE');
const conVendedor = await sql.execute('SELECT p.nombre, u.nombre as vendedor FROM productos p INNER JOIN usuarios u ON vendedorId AS u');

// Transacción - Esquema 1
repo.beginTransaction();
await repo.update('productos', 1, { stock: 4 });
repo.commit();

// Transacción - Esquema 2
await sql.execute('START TRANSACTION');
await sql.execute('UPDATE productos SET {"stock": 4} WHERE id = 1');
await sql.execute('COMMIT');

console.log('Admins:', admins);
console.log('Productos caros:', caros);
console.log('Total productos:', totalProductos);</code></pre>
    </div>

    <h2>11. Limitaciones</h2>
    <div class="note">
      <p>No soporta: RIGHT/LEFT JOIN, subqueries, GROUP BY, HAVING, LIMIT, OFFSET, DISTINCT, BETWEEN, IN, IS NULL, CREATE INDEX, CREATE VIEW, TRUNCATE, GRANT/REVOKE. UPDATE y DELETE solo soportan <code>WHERE id = valor</code>.</p>
    </div>

    <h2>12. API Reference</h2>
    <p>Para la documentación completa de la API, consulta el <a href="index.html">API Reference</a>.</p>
  </div>
</body>
</html>`;

fs.writeFileSync(filePath, html, 'utf8');
console.log('Manual creado en: ' + filePath);
