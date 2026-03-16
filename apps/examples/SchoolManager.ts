import { JsonDB } from '../../src/JsonDB.js';

interface SchoolSchema {
    users: any[];
    courses: any[];
    enrollments: any[];
}

const repo = new JsonDB.JsonRepository<SchoolSchema>();

try {
    console.log("--- ⚡ JsonDB Demostracion ---");
    
    // 1. Inicializar BD por nombre
    repo.createDataBase('SchoolSystem', true);

    // 2. Tablas
    repo.createTable('users');
    repo.createTable('courses');
    repo.createTable('enrollments');

    // 3. CRUD
    repo.insert('users', { name: 'Jubert', email: 'jubert@fluxer.io' });
    repo.update('users', 1, { name: 'Jubert (Admin)' });
    
    // 4. Join
    repo.insert('courses', { title: 'JS Master', teacherId: 1 });
    repo.insert('enrollments', { userId: 1, courseId: 1 });

    const result = repo.innerJoin('enrollments', [
        { table: 'users', foreignKey: 'userId', as: 'alumno' }
    ]);

    console.dir(result, { depth: null });

    // 5. Delete
    repo.deleteRecord('enrollments', 1);

} 
catch (e: any) {
    console.error("❌ Error:", e.message);
}