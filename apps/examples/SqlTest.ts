import { JsonDB } from '../../src/JsonDB.js';
import { SqlInterpreter } from '../../src/SqlInterpreter.js';

const repo = new JsonDB.JsonRepository<any>();
const sql = new SqlInterpreter(repo);

console.log("CONECTANDOSE A LA BD SchoolSQL...");
sql.execute("USE SchoolSQL");
console.log("BORRANDO LA BD SchoolSQL...");
sql.execute("DROP DATABASE");
console.log("CREANDO NUEVAMENTE LA BD SchoolSQL...");
sql.execute("CREATE DATABASE SchoolSQL");
console.log("CREANDO LA TABLA USERS...");
sql.execute("CREATE TABLE users");
console.log("CREANDO LA TABLA COURSES...");
sql.execute("CREATE TABLE courses");
console.log("CREANDO LA TABLA SCHOOL...");
sql.execute("CREATE TABLE school");

console.log("CREANDO CONSTRAINTS PARA LAS TABLAS...");
sql.execute("ALTER TABLE courses ADD CONSTRAINT fk_teacherId FOREIGN KEY(teacherId) REFERENCES users(id) ON DELETE CASCADE");
console.log("INSERTANDO DATOS EN USERS...");
sql.execute('INSERT INTO users VALUES {"name": "Jubert", "role": "Admin", "bird": "1962-10-12", "phone" : "0412-6428497"}');
sql.execute('INSERT INTO users VALUES {"name": "Maria", "role": "Guest", "bird": "2009-11-21", "phone" : "0424-3315493"}');
sql.execute('INSERT INTO users VALUES {"name": "Juan", "role": "User", "bird": "2007-05-05", "phone" : "0412-1134256"}');
sql.execute('INSERT INTO users VALUES {"name": "Alfonso", "role": "Guest", "bird": "2011-07-05", "phone" : "0412-1234256"}');

sql.execute('INSERT INTO school VALUES {"name": "Ingenieria", "institution": "1"}');
sql.execute('INSERT INTO school VALUES {"name": "Derecho", "institution": "2"}');
sql.execute('INSERT INTO school VALUES {"name": "Musica", "institution": "3"}');

console.log("INSERTANDO DATOS EN COURSES...");
sql.execute('INSERT INTO courses VALUES {"title": "Matematica", "teacherId": 1, "institutionId": 1}');
sql.execute('INSERT INTO courses VALUES {"title": "Fisica", "teacherId": 2, "institutionId": 1}');
sql.execute('INSERT INTO courses VALUES {"title": "Romanos I", "teacherId": 3, "institutionId": 1}');
sql.execute('INSERT INTO courses VALUES {"title": "Biologia", "teacherId": 1, "institutionId": 3}');

console.log("\nINNER JOIN MULTIPLE...");
console.table(sql.execute(`
    SELECT title, teacher.name, inst.name 
        FROM courses 
        INNER JOIN users ON teacherId AS teacher 
        INNER JOIN school ON institutionId AS inst 
        WHERE teacher.role = 'Guest' AND inst.id = 1
`));
console.log("\nINNER JOIN...");
console.table(sql.execute("SELECT title, teacherId, id, profesor FROM courses INNER JOIN users ON teacherId AS profesor ORDER BY profesor.bird"));
console.log("SELECT *:");
console.table(sql.execute("SELECT * FROM users"));
console.log("SELECT POR COLUMNAS:");
console.table(sql.execute("SELECT name, role FROM users"));
console.log("SELECT CON WHERE:");
console.table(sql.execute("SELECT * FROM users WHERE id<=2"));
console.log("ACTUALIZACION:");
sql.execute('UPDATE users SET {"role": "V.I.P"} WHERE id = 3');

// Borrar
// sql.execute("DELETE FROM users WHERE id = 3");

console.log("USUARIOS:");
console.table(sql.execute("SELECT * FROM users"));
console.log("BORRADO EN CASCADA:");
sql.execute("DELETE FROM users WHERE id = 1 CASCADE");
console.log("USUARIOS DEPUES DEL BORRADO:");
console.table(sql.execute("SELECT * FROM users ORDER BY name"));
console.log("CURSOS:");
console.table(sql.execute("SELECT * FROM courses"));
console.log("CON WHERE - NOT - AND:");
let r = sql.execute("SELECT * FROM users WHERE ((NOT id = 1) AND (bird > '1962-12-10')) ORDER BY name");
console.table(r);
console.log("BIRD COMO DATE:");
console.log(new Date(r[0].bird));
console.log("COUNT:");
console.log("\nTOTAL DE CURSOS:");
console.table(sql.execute("SELECT COUNT(*) FROM courses"));
console.log("\nSUMA DE ids DE CURSOS CON SUM:");
console.table(sql.execute("SELECT SUM(id) FROM courses"));
console.log("\nAVG DE ids DE CURSOS CON SUM:");
console.table(sql.execute("SELECT AVG(profesor.id) FROM courses INNER JOIN users ON teacherId AS profesor"))
console.log("\nCONSULTA ANTES DEL DE LA TRANSACCION:");
console.table(sql.execute("SELECT * FROM users"));
console.log("\nINICIO DE TRANSACCION");
sql.execute("START TRANSACTION");
console.log("\nBORRADO...");
sql.execute("DELETE FROM users WHERE id = 2"); 
console.log("\nCONSULTA DESPUES DE BORRAR...");
console.table(sql.execute("SELECT * FROM users"));
console.log("\nEJECUCION DE ROLLBACK...");
sql.execute("ROLLBACK");
console.log("\nLISTADO PARA VERIFICAR ROLLBACK...");
console.table(sql.execute("SELECT * FROM users"));